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

export default router;
