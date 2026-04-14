import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { getDb, rebuildSearchIndex } from '../db.js';
import { classifyImage } from '../services/classifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

const router = Router();

// POST /api/images/upload — Upload and classify a garment image
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const db = getDb();
    const { filename, originalname, size, mimetype } = req.file;
    console.log(`Received upload: ${originalname} (${size} bytes, ${mimetype})`);

    // Insert image record
    const insertImage = db.prepare(
      'INSERT INTO images (filename, original_name, file_size, mime_type) VALUES (?, ?, ?, ?)'
    );
    const result = insertImage.run(filename, originalname, size, mimetype);
    const imageId = result.lastInsertRowid;

    // Classify with AI
    let metadata = null;
    let classificationError = null;
    try {
      const imagePath = path.join(UPLOADS_DIR, filename);
      metadata = await classifyImage(imagePath);

      // Insert AI metadata
      const insertMeta = db.prepare(`
        INSERT INTO ai_metadata (
          image_id, description, garment_type, style, material, color_palette,
          pattern, season, occasion, consumer_profile, trend_notes,
          location_continent, location_country, location_city, raw_response
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertMeta.run(
        imageId, metadata.description, metadata.garment_type, metadata.style,
        metadata.material, metadata.color_palette, metadata.pattern, metadata.season,
        metadata.occasion, metadata.consumer_profile, metadata.trend_notes,
        metadata.location_continent, metadata.location_country, metadata.location_city,
        metadata.raw_response
      );

      // Update FTS index
      rebuildSearchIndex(imageId);
    } catch (err) {
      classificationError = err.message;
      console.error('Classification error:', err.message);
    }

    // Fetch the complete record
    const image = db.prepare(`
      SELECT i.*, m.description, m.garment_type, m.style, m.material,
             m.color_palette, m.pattern, m.season, m.occasion,
             m.consumer_profile, m.trend_notes, m.location_continent,
             m.location_country, m.location_city
      FROM images i
      LEFT JOIN ai_metadata m ON i.id = m.image_id
      WHERE i.id = ?
    `).get(imageId);

    res.status(201).json({
      image,
      classificationError,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// GET /api/images — Paginated image list with AI metadata and annotations
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const total = db.prepare('SELECT COUNT(*) as count FROM images').get().count;

    const images = db.prepare(`
      SELECT i.*, m.description, m.garment_type, m.style, m.material,
             m.color_palette, m.pattern, m.season, m.occasion,
             m.consumer_profile, m.trend_notes, m.location_continent,
             m.location_country, m.location_city
      FROM images i
      LEFT JOIN ai_metadata m ON i.id = m.image_id
      ORDER BY i.upload_date DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    // Attach annotations to each image
    const annotStmt = db.prepare('SELECT * FROM annotations WHERE image_id = ? ORDER BY created_at DESC');
    const results = images.map(img => ({
      ...img,
      color_palette: safeParseJson(img.color_palette, []),
      annotations: annotStmt.all(img.id).map(a => ({
        ...a,
        tags: safeParseJson(a.tags, []),
      })),
    }));

    res.json({
      images: results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('List images error:', err);
    res.status(500).json({ error: 'Failed to list images' });
  }
});

// GET /api/images/search — Combined attribute filters + full-text search
// NOTE: Must be defined before /:id to avoid matching "search" as an id
router.get('/search', (req, res) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    // Attribute filters (multi-select via comma-separated)
    const filterableColumns = [
      'garment_type', 'style', 'material', 'pattern', 'season',
      'occasion', 'consumer_profile', 'location_continent',
      'location_country', 'location_city',
    ];

    for (const col of filterableColumns) {
      if (req.query[col]) {
        const values = req.query[col].split(',').map(v => v.trim()).filter(Boolean);
        if (values.length > 0) {
          const placeholders = values.map(() => '?').join(',');
          conditions.push(`m.${col} IN (${placeholders})`);
          params.push(...values);
        }
      }
    }

    // Designer filter (from annotations)
    if (req.query.designer) {
      const designers = req.query.designer.split(',').map(v => v.trim()).filter(Boolean);
      if (designers.length > 0) {
        const placeholders = designers.map(() => '?').join(',');
        conditions.push(`i.id IN (SELECT image_id FROM annotations WHERE designer IN (${placeholders}))`);
        params.push(...designers);
      }
    }

    // Time filters
    if (req.query.year) {
      conditions.push("strftime('%Y', i.upload_date) = ?");
      params.push(req.query.year);
    }
    if (req.query.month) {
      conditions.push("strftime('%m', i.upload_date) = ?");
      params.push(req.query.month);
    }

    // Full-text search
    let ftsJoin = '';
    if (req.query.q) {
      ftsJoin = 'INNER JOIN search_index ON search_index.rowid = i.id';
      conditions.push('search_index MATCH ?');
      // Escape special FTS5 characters and wrap in quotes for safety
      const query = req.query.q.replace(/['"]/g, '');
      params.push(query);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countSql = `
      SELECT COUNT(DISTINCT i.id) as count
      FROM images i
      LEFT JOIN ai_metadata m ON i.id = m.image_id
      ${ftsJoin}
      ${whereClause}
    `;
    const total = db.prepare(countSql).get(...params).count;

    // Fetch results
    const dataSql = `
      SELECT DISTINCT i.*, m.description, m.garment_type, m.style, m.material,
             m.color_palette, m.pattern, m.season, m.occasion,
             m.consumer_profile, m.trend_notes, m.location_continent,
             m.location_country, m.location_city
      FROM images i
      LEFT JOIN ai_metadata m ON i.id = m.image_id
      ${ftsJoin}
      ${whereClause}
      ORDER BY i.upload_date DESC
      LIMIT ? OFFSET ?
    `;
    const images = db.prepare(dataSql).all(...params, limit, offset);

    const annotStmt = db.prepare('SELECT * FROM annotations WHERE image_id = ? ORDER BY created_at DESC');
    const results = images.map(img => ({
      ...img,
      color_palette: safeParseJson(img.color_palette, []),
      annotations: annotStmt.all(img.id).map(a => ({
        ...a,
        tags: safeParseJson(a.tags, []),
      })),
    }));

    res.json({
      images: results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search images' });
  }
});

// GET /api/images/:id — Single image with full metadata and annotations
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid image ID' });

    const image = db.prepare(`
      SELECT i.*, m.description, m.garment_type, m.style, m.material,
             m.color_palette, m.pattern, m.season, m.occasion,
             m.consumer_profile, m.trend_notes, m.location_continent,
             m.location_country, m.location_city
      FROM images i
      LEFT JOIN ai_metadata m ON i.id = m.image_id
      WHERE i.id = ?
    `).get(id);

    if (!image) return res.status(404).json({ error: 'Image not found' });

    const annotations = db.prepare(
      'SELECT * FROM annotations WHERE image_id = ? ORDER BY created_at DESC'
    ).all(id).map(a => ({ ...a, tags: safeParseJson(a.tags, []) }));

    res.json({
      ...image,
      color_palette: safeParseJson(image.color_palette, []),
      annotations,
    });
  } catch (err) {
    console.error('Get image error:', err);
    res.status(500).json({ error: 'Failed to get image' });
  }
});

// DELETE /api/images/:id — Delete image from DB and uploads folder
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid image ID' });

    const image = db.prepare('SELECT filename FROM images WHERE id = ?').get(id);
    if (!image) return res.status(404).json({ error: 'Image not found' });

    // Delete from DB (cascades to ai_metadata, annotations)
    db.prepare('DELETE FROM images WHERE id = ?').run(id);

    // Remove from FTS index
    db.prepare('DELETE FROM search_index WHERE image_id = ?').run(id);

    // Delete file from uploads folder
    const filePath = path.join(UPLOADS_DIR, image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete image error:', err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

function safeParseJson(val, fallback) {
  if (!val) return fallback;
  try { return JSON.parse(val); }
  catch { return fallback; }
}

export default router;
