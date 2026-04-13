import { Router } from 'express';
import { getDb, rebuildSearchIndex } from '../db.js';

const router = Router();

// POST /api/images/:id/annotations — Add annotation to an image
router.post('/images/:id/annotations', (req, res) => {
  try {
    const db = getDb();
    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) return res.status(400).json({ error: 'Invalid image ID' });

    // Verify image exists
    const image = db.prepare('SELECT id FROM images WHERE id = ?').get(imageId);
    if (!image) return res.status(404).json({ error: 'Image not found' });

    const { designer, tags, notes } = req.body;
    if (!designer && !tags && !notes) {
      return res.status(400).json({ error: 'At least one of designer, tags, or notes is required' });
    }

    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : (tags || '[]');

    const result = db.prepare(
      'INSERT INTO annotations (image_id, designer, tags, notes) VALUES (?, ?, ?, ?)'
    ).run(imageId, designer || '', tagsJson, notes || '');

    // Rebuild search index for this image
    rebuildSearchIndex(imageId);

    const annotation = db.prepare('SELECT * FROM annotations WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      ...annotation,
      tags: safeParse(annotation.tags),
    });
  } catch (err) {
    console.error('Create annotation error:', err);
    res.status(500).json({ error: 'Failed to create annotation' });
  }
});

// PUT /api/annotations/:id — Update an existing annotation
router.put('/annotations/:id', (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid annotation ID' });

    const existing = db.prepare('SELECT * FROM annotations WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Annotation not found' });

    const { designer, tags, notes } = req.body;
    const tagsJson = tags !== undefined
      ? (Array.isArray(tags) ? JSON.stringify(tags) : tags)
      : existing.tags;

    db.prepare(
      'UPDATE annotations SET designer = ?, tags = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(
      designer !== undefined ? designer : existing.designer,
      tagsJson,
      notes !== undefined ? notes : existing.notes,
      id
    );

    // Rebuild search index
    rebuildSearchIndex(existing.image_id);

    const updated = db.prepare('SELECT * FROM annotations WHERE id = ?').get(id);
    res.json({
      ...updated,
      tags: safeParse(updated.tags),
    });
  } catch (err) {
    console.error('Update annotation error:', err);
    res.status(500).json({ error: 'Failed to update annotation' });
  }
});

// DELETE /api/annotations/:id — Delete an annotation
router.delete('/annotations/:id', (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid annotation ID' });

    const existing = db.prepare('SELECT * FROM annotations WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Annotation not found' });

    db.prepare('DELETE FROM annotations WHERE id = ?').run(id);
    rebuildSearchIndex(existing.image_id);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete annotation error:', err);
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
});

function safeParse(val) {
  try { return JSON.parse(val || '[]'); }
  catch { return []; }
}

export default router;
