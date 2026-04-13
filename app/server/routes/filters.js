import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

// GET /api/filters — Dynamic filter values from actual data
router.get('/', (req, res) => {
  try {
    const db = getDb();

    const distinctValues = (table, column) => {
      const rows = db.prepare(
        `SELECT DISTINCT ${column} FROM ${table} WHERE ${column} IS NOT NULL AND ${column} != '' AND ${column} != 'Unknown' ORDER BY ${column}`
      ).all();
      return rows.map(r => r[column]);
    };

    // AI metadata attribute filters
    const filters = {
      garment_type: distinctValues('ai_metadata', 'garment_type'),
      style: distinctValues('ai_metadata', 'style'),
      material: distinctValues('ai_metadata', 'material'),
      pattern: distinctValues('ai_metadata', 'pattern'),
      season: distinctValues('ai_metadata', 'season'),
      occasion: distinctValues('ai_metadata', 'occasion'),
      consumer_profile: distinctValues('ai_metadata', 'consumer_profile'),
      trend_notes: distinctValues('ai_metadata', 'trend_notes'),
      // Location hierarchy
      location_continent: distinctValues('ai_metadata', 'location_continent'),
      location_country: distinctValues('ai_metadata', 'location_country'),
      location_city: distinctValues('ai_metadata', 'location_city'),
      // Designer from annotations
      designer: distinctValues('annotations', 'designer'),
    };

    // Time filters from upload dates
    const dates = db.prepare(
      "SELECT DISTINCT strftime('%Y', upload_date) as year FROM images WHERE upload_date IS NOT NULL ORDER BY year DESC"
    ).all();
    filters.year = dates.map(d => d.year).filter(Boolean);

    const months = db.prepare(
      "SELECT DISTINCT strftime('%m', upload_date) as month FROM images WHERE upload_date IS NOT NULL ORDER BY month"
    ).all();
    filters.month = months.map(d => d.month).filter(Boolean);

    res.json(filters);
  } catch (err) {
    console.error('Filters error:', err);
    res.status(500).json({ error: 'Failed to get filters' });
  }
});

export default router;
