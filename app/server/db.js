import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'fashion.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      file_size INTEGER,
      mime_type TEXT
    );

    CREATE TABLE IF NOT EXISTS ai_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_id INTEGER NOT NULL UNIQUE,
      description TEXT,
      garment_type TEXT,
      style TEXT,
      material TEXT,
      color_palette TEXT,
      pattern TEXT,
      season TEXT,
      occasion TEXT,
      consumer_profile TEXT,
      trend_notes TEXT,
      location_continent TEXT,
      location_country TEXT,
      location_city TEXT,
      raw_response TEXT,
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_id INTEGER NOT NULL,
      designer TEXT,
      tags TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ai_garment_type ON ai_metadata(garment_type);
    CREATE INDEX IF NOT EXISTS idx_ai_style ON ai_metadata(style);
    CREATE INDEX IF NOT EXISTS idx_ai_material ON ai_metadata(material);
    CREATE INDEX IF NOT EXISTS idx_ai_pattern ON ai_metadata(pattern);
    CREATE INDEX IF NOT EXISTS idx_ai_season ON ai_metadata(season);
    CREATE INDEX IF NOT EXISTS idx_ai_occasion ON ai_metadata(occasion);
    CREATE INDEX IF NOT EXISTS idx_ai_consumer_profile ON ai_metadata(consumer_profile);
    CREATE INDEX IF NOT EXISTS idx_ai_location_continent ON ai_metadata(location_continent);
    CREATE INDEX IF NOT EXISTS idx_ai_location_country ON ai_metadata(location_country);
    CREATE INDEX IF NOT EXISTS idx_ai_location_city ON ai_metadata(location_city);
    CREATE INDEX IF NOT EXISTS idx_annotations_image_id ON annotations(image_id);
    CREATE INDEX IF NOT EXISTS idx_annotations_designer ON annotations(designer);
  `);

  // FTS5 virtual table for full-text search across descriptions, notes, and tags
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
      image_id,
      description,
      notes,
      tags,
      content='',
      contentless_delete=1
    );
  `);
}

export function rebuildSearchIndex(imageId) {
  const d = getDb();

  // Delete existing entries for this image
  d.prepare('DELETE FROM search_index WHERE image_id = ?').run(String(imageId));

  // Gather all text for this image
  const meta = d.prepare('SELECT description FROM ai_metadata WHERE image_id = ?').get(imageId);
  const annots = d.prepare('SELECT tags, notes FROM annotations WHERE image_id = ?').all(imageId);

  const description = meta?.description || '';
  const allNotes = annots.map(a => a.notes || '').join(' ');
  const allTags = annots.map(a => {
    try { return JSON.parse(a.tags || '[]').join(' '); }
    catch { return ''; }
  }).join(' ');

  d.prepare('INSERT INTO search_index (image_id, description, notes, tags) VALUES (?, ?, ?, ?)')
    .run(String(imageId), description, allNotes, allTags);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
