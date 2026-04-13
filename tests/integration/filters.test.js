import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = path.join(__dirname, 'test_filters.db');

let db;

function seedDatabase() {
  db = new Database(TEST_DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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

    CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
      image_id, description, notes, tags, content='', contentless_delete=1
    );
  `);

  // Seed test data
  const insertImage = db.prepare(
    "INSERT INTO images (filename, original_name, upload_date, file_size, mime_type) VALUES (?, ?, ?, ?, ?)"
  );
  const insertMeta = db.prepare(
    `INSERT INTO ai_metadata (image_id, description, garment_type, style, material, color_palette,
     pattern, season, occasion, consumer_profile, trend_notes, location_continent, location_country, location_city, raw_response)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertAnnot = db.prepare(
    "INSERT INTO annotations (image_id, designer, tags, notes) VALUES (?, ?, ?, ?)"
  );
  const insertFts = db.prepare(
    "INSERT INTO search_index (rowid, image_id, description, notes, tags) VALUES (?, ?, ?, ?, ?)"
  );

  // Image 1: Silk dress from Milan
  const r1 = insertImage.run('img1.jpg', 'dress.jpg', '2024-06-15 10:00:00', 1000, 'image/jpeg');
  insertMeta.run(r1.lastInsertRowid, 'A flowing red silk dress with embroidered neckline', 'dress', 'romantic', 'silk',
    '["red","gold"]', 'embroidered', 'spring', 'evening', 'luxury consumer', 'quiet luxury', 'Europe', 'Italy', 'Milan', '{}');
  insertAnnot.run(r1.lastInsertRowid, 'Alice', '["artisan","handmade"]', 'Found at artisan market in Milan');
  insertFts.run(r1.lastInsertRowid, String(r1.lastInsertRowid), 'A flowing red silk dress with embroidered neckline', 'Found at artisan market in Milan', 'artisan handmade');

  // Image 2: Denim jacket from Tokyo
  const r2 = insertImage.run('img2.jpg', 'jacket.jpg', '2024-03-20 14:00:00', 2000, 'image/jpeg');
  insertMeta.run(r2.lastInsertRowid, 'Oversized denim jacket with streetwear patches', 'jacket', 'streetwear', 'denim',
    '["blue","white"]', 'solid', 'fall', 'casual everyday', 'teenager', 'Y2K revival', 'Asia', 'Japan', 'Tokyo', '{}');
  insertFts.run(r2.lastInsertRowid, String(r2.lastInsertRowid), 'Oversized denim jacket with streetwear patches', '', '');

  // Image 3: Wool coat from New York
  const r3 = insertImage.run('img3.jpg', 'coat.jpg', '2025-01-10 09:00:00', 3000, 'image/jpeg');
  insertMeta.run(r3.lastInsertRowid, 'Classic wool overcoat in charcoal grey', 'coat', 'classic', 'wool',
    '["charcoal","grey"]', 'solid', 'winter', 'office', 'young professional', 'minimal wardrobe', 'North America', 'USA', 'New York', '{}');
  insertAnnot.run(r3.lastInsertRowid, 'Bob', '["timeless","investment"]', 'Great for layering in cold weather');
  insertFts.run(r3.lastInsertRowid, String(r3.lastInsertRowid), 'Classic wool overcoat in charcoal grey', 'Great for layering in cold weather', 'timeless investment');

  // Image 4: Cotton dress from Europe (same continent as image 1)
  const r4 = insertImage.run('img4.jpg', 'summer_dress.jpg', '2024-07-20 11:00:00', 1500, 'image/jpeg');
  insertMeta.run(r4.lastInsertRowid, 'Light cotton sundress with floral pattern', 'dress', 'casual', 'cotton',
    '["white","yellow","green"]', 'floral', 'summer', 'beach', 'eco-conscious', 'sustainable fashion', 'Europe', 'France', 'Paris', '{}');
  insertFts.run(r4.lastInsertRowid, String(r4.lastInsertRowid), 'Light cotton sundress with floral pattern', '', '');
}

beforeAll(() => {
  seedDatabase();
});

afterAll(() => {
  if (db) db.close();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  if (fs.existsSync(TEST_DB_PATH + '-wal')) fs.unlinkSync(TEST_DB_PATH + '-wal');
  if (fs.existsSync(TEST_DB_PATH + '-shm')) fs.unlinkSync(TEST_DB_PATH + '-shm');
});

describe('Dynamic filter generation', () => {
  it('returns distinct garment types from data', () => {
    const rows = db.prepare(
      "SELECT DISTINCT garment_type FROM ai_metadata WHERE garment_type IS NOT NULL AND garment_type != '' ORDER BY garment_type"
    ).all();
    const types = rows.map(r => r.garment_type);

    expect(types).toContain('dress');
    expect(types).toContain('jacket');
    expect(types).toContain('coat');
    expect(types.length).toBe(3);
  });

  it('returns distinct styles from data', () => {
    const rows = db.prepare(
      "SELECT DISTINCT style FROM ai_metadata WHERE style IS NOT NULL AND style != '' ORDER BY style"
    ).all();
    const styles = rows.map(r => r.style);

    expect(styles).toEqual(expect.arrayContaining(['romantic', 'streetwear', 'classic', 'casual']));
  });

  it('returns distinct continents from data', () => {
    const rows = db.prepare(
      "SELECT DISTINCT location_continent FROM ai_metadata WHERE location_continent IS NOT NULL AND location_continent != '' AND location_continent != 'Unknown'"
    ).all();
    const continents = rows.map(r => r.location_continent);

    expect(continents).toContain('Europe');
    expect(continents).toContain('Asia');
    expect(continents).toContain('North America');
  });

  it('returns distinct countries from data', () => {
    const rows = db.prepare(
      "SELECT DISTINCT location_country FROM ai_metadata WHERE location_country IS NOT NULL AND location_country != '' AND location_country != 'Unknown'"
    ).all();
    const countries = rows.map(r => r.location_country);

    expect(countries).toContain('Italy');
    expect(countries).toContain('Japan');
    expect(countries).toContain('USA');
    expect(countries).toContain('France');
  });

  it('returns distinct designers from annotations', () => {
    const rows = db.prepare(
      "SELECT DISTINCT designer FROM annotations WHERE designer IS NOT NULL AND designer != ''"
    ).all();
    const designers = rows.map(r => r.designer);

    expect(designers).toContain('Alice');
    expect(designers).toContain('Bob');
    expect(designers.length).toBe(2);
  });

  it('returns distinct years from upload dates', () => {
    const rows = db.prepare(
      "SELECT DISTINCT strftime('%Y', upload_date) as year FROM images WHERE upload_date IS NOT NULL ORDER BY year DESC"
    ).all();
    const years = rows.map(r => r.year);

    expect(years).toContain('2024');
    expect(years).toContain('2025');
  });

  it('returns distinct months from upload dates', () => {
    const rows = db.prepare(
      "SELECT DISTINCT strftime('%m', upload_date) as month FROM images WHERE upload_date IS NOT NULL ORDER BY month"
    ).all();
    const months = rows.map(r => r.month);

    expect(months).toContain('01'); // January
    expect(months).toContain('03'); // March
    expect(months).toContain('06'); // June
    expect(months).toContain('07'); // July
  });
});

describe('Location filters', () => {
  it('filters by continent', () => {
    const images = db.prepare(`
      SELECT i.* FROM images i
      JOIN ai_metadata m ON i.id = m.image_id
      WHERE m.location_continent = ?
    `).all('Europe');

    expect(images.length).toBe(2); // Milan dress + Paris dress
  });

  it('filters by country', () => {
    const images = db.prepare(`
      SELECT i.* FROM images i
      JOIN ai_metadata m ON i.id = m.image_id
      WHERE m.location_country = ?
    `).all('Japan');

    expect(images.length).toBe(1);
    expect(images[0].filename).toBe('img2.jpg');
  });

  it('filters by city', () => {
    const images = db.prepare(`
      SELECT i.* FROM images i
      JOIN ai_metadata m ON i.id = m.image_id
      WHERE m.location_city = ?
    `).all('Milan');

    expect(images.length).toBe(1);
    expect(images[0].filename).toBe('img1.jpg');
  });
});

describe('Time filters', () => {
  it('filters by year', () => {
    const images = db.prepare(`
      SELECT * FROM images WHERE strftime('%Y', upload_date) = ?
    `).all('2024');

    expect(images.length).toBe(3); // img1, img2, img4
  });

  it('filters by month', () => {
    const images = db.prepare(`
      SELECT * FROM images WHERE strftime('%m', upload_date) = ?
    `).all('03');

    expect(images.length).toBe(1);
    expect(images[0].filename).toBe('img2.jpg');
  });

  it('filters by year and month combined', () => {
    const images = db.prepare(`
      SELECT * FROM images WHERE strftime('%Y', upload_date) = ? AND strftime('%m', upload_date) = ?
    `).all('2024', '06');

    expect(images.length).toBe(1);
    expect(images[0].filename).toBe('img1.jpg');
  });
});

describe('Combined attribute filters', () => {
  it('filters by garment_type AND season', () => {
    const images = db.prepare(`
      SELECT i.* FROM images i
      JOIN ai_metadata m ON i.id = m.image_id
      WHERE m.garment_type = ? AND m.season = ?
    `).all('dress', 'spring');

    expect(images.length).toBe(1);
    expect(images[0].filename).toBe('img1.jpg');
  });

  it('filters by multiple garment types (IN clause)', () => {
    const images = db.prepare(`
      SELECT i.* FROM images i
      JOIN ai_metadata m ON i.id = m.image_id
      WHERE m.garment_type IN (?, ?)
    `).all('dress', 'coat');

    expect(images.length).toBe(3); // 2 dresses + 1 coat
  });

  it('filters by material AND continent', () => {
    const images = db.prepare(`
      SELECT i.* FROM images i
      JOIN ai_metadata m ON i.id = m.image_id
      WHERE m.material = ? AND m.location_continent = ?
    `).all('silk', 'Europe');

    expect(images.length).toBe(1);
    expect(images[0].filename).toBe('img1.jpg');
  });

  it('filters by designer (from annotations)', () => {
    const images = db.prepare(`
      SELECT DISTINCT i.* FROM images i
      WHERE i.id IN (SELECT image_id FROM annotations WHERE designer = ?)
    `).all('Alice');

    expect(images.length).toBe(1);
    expect(images[0].filename).toBe('img1.jpg');
  });
});

describe('Full-text search (FTS5)', () => {
  // FTS5 contentless tables return null for column values; use rowid to join back to images
  it('searches descriptions for partial matches', () => {
    const results = db.prepare(`
      SELECT i.* FROM images i
      INNER JOIN search_index ON search_index.rowid = i.id
      WHERE search_index MATCH ?
    `).all('embroidered');

    expect(results.length).toBe(1);
    expect(results[0].filename).toBe('img1.jpg');
  });

  it('searches across descriptions and notes', () => {
    const results = db.prepare(`
      SELECT i.* FROM images i
      INNER JOIN search_index ON search_index.rowid = i.id
      WHERE search_index MATCH ?
    `).all('artisan');

    expect(results.length).toBe(1);
    expect(results[0].filename).toBe('img1.jpg');
  });

  it('searches annotation tags', () => {
    const results = db.prepare(`
      SELECT i.* FROM images i
      INNER JOIN search_index ON search_index.rowid = i.id
      WHERE search_index MATCH ?
    `).all('timeless');

    expect(results.length).toBe(1);
    expect(results[0].filename).toBe('img3.jpg');
  });

  it('searches for streetwear across descriptions', () => {
    const results = db.prepare(`
      SELECT i.* FROM images i
      INNER JOIN search_index ON search_index.rowid = i.id
      WHERE search_index MATCH ?
    `).all('streetwear');

    expect(results.length).toBe(1);
    expect(results[0].filename).toBe('img2.jpg');
  });

  it('returns empty for non-matching queries', () => {
    const results = db.prepare(`
      SELECT i.* FROM images i
      INNER JOIN search_index ON search_index.rowid = i.id
      WHERE search_index MATCH ?
    `).all('nonexistentterm');

    expect(results.length).toBe(0);
  });

  it('searches for multi-word queries (floral pattern)', () => {
    const results = db.prepare(`
      SELECT i.* FROM images i
      INNER JOIN search_index ON search_index.rowid = i.id
      WHERE search_index MATCH ?
    `).all('floral pattern');

    expect(results.length).toBe(1);
    expect(results[0].filename).toBe('img4.jpg');
  });
});
