import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = path.join(__dirname, 'e2e_test.db');
const TEST_UPLOADS_DIR = path.join(__dirname, 'test_uploads');

// Set env vars before importing app
process.env.DB_PATH = TEST_DB_PATH;

// Mock the classifier to avoid needing an OpenAI API key
vi.mock('../../app/server/services/classifier.js', () => ({
  classifyImage: vi.fn().mockResolvedValue({
    description: 'A beautiful red silk evening gown with intricate embroidery',
    garment_type: 'dress',
    style: 'romantic',
    material: 'silk',
    color_palette: '["red","gold"]',
    pattern: 'embroidered',
    season: 'spring',
    occasion: 'evening',
    consumer_profile: 'luxury consumer',
    trend_notes: 'Quiet luxury trend with artisanal details',
    location_continent: 'Europe',
    location_country: 'Italy',
    location_city: 'Milan',
    raw_response: '{}',
  }),
}));

// Import app after setting env/mocks
const { default: app } = await import('../../app/server/index.js');
const { closeDb } = await import('../../app/server/db.js');

// Create a small test image (1x1 red pixel JPEG)
const TEST_IMAGE_PATH = path.join(__dirname, 'test_image.jpg');

beforeAll(() => {
  // Create test uploads directory
  if (!fs.existsSync(TEST_UPLOADS_DIR)) {
    fs.mkdirSync(TEST_UPLOADS_DIR, { recursive: true });
  }

  // Create a minimal valid JPEG file (smallest valid JPEG)
  const jpegBuffer = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
    0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
    0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
    0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
    0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
    0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
    0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
    0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
    0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
    0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
    0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
    0x00, 0x00, 0x3F, 0x00, 0x7B, 0x94, 0x11, 0x00, 0x00, 0x00, 0x00, 0xFF,
    0xD9,
  ]);
  fs.writeFileSync(TEST_IMAGE_PATH, jpegBuffer);
});

afterAll(() => {
  closeDb();
  // Clean up test artifacts
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  if (fs.existsSync(TEST_DB_PATH + '-wal')) fs.unlinkSync(TEST_DB_PATH + '-wal');
  if (fs.existsSync(TEST_DB_PATH + '-shm')) fs.unlinkSync(TEST_DB_PATH + '-shm');
  if (fs.existsSync(TEST_IMAGE_PATH)) fs.unlinkSync(TEST_IMAGE_PATH);
});

let uploadedImageId;

describe('E2E: Upload → Classify → Browse → Filter workflow', () => {
  it('health check responds', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('uploads an image and returns AI classification', async () => {
    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', TEST_IMAGE_PATH);

    expect(res.status).toBe(201);
    expect(res.body.image).toBeDefined();
    expect(res.body.image.garment_type).toBe('dress');
    expect(res.body.image.style).toBe('romantic');
    expect(res.body.image.material).toBe('silk');
    expect(res.body.image.season).toBe('spring');
    expect(res.body.image.location_continent).toBe('Europe');
    expect(res.body.image.location_country).toBe('Italy');
    expect(res.body.image.location_city).toBe('Milan');
    expect(res.body.image.description).toContain('red silk evening gown');

    uploadedImageId = res.body.image.id;
  });

  it('uploaded image appears in browse listing', async () => {
    const res = await request(app).get('/api/images');

    expect(res.status).toBe(200);
    expect(res.body.images.length).toBe(1);
    expect(res.body.images[0].id).toBe(uploadedImageId);
    expect(res.body.images[0].garment_type).toBe('dress');
    expect(res.body.pagination.total).toBe(1);
  });

  it('image detail endpoint returns full data', async () => {
    const res = await request(app).get(`/api/images/${uploadedImageId}`);

    expect(res.status).toBe(200);
    expect(res.body.description).toContain('red silk evening gown');
    expect(res.body.trend_notes).toContain('Quiet luxury');
    expect(res.body.color_palette).toEqual(['red', 'gold']);
  });

  it('filters show the uploaded image attributes', async () => {
    const res = await request(app).get('/api/filters');

    expect(res.status).toBe(200);
    expect(res.body.garment_type).toContain('dress');
    expect(res.body.style).toContain('romantic');
    expect(res.body.material).toContain('silk');
    expect(res.body.season).toContain('spring');
    expect(res.body.location_continent).toContain('Europe');
    expect(res.body.location_country).toContain('Italy');
    expect(res.body.location_city).toContain('Milan');
  });

  it('filtering by garment_type returns the image', async () => {
    const res = await request(app).get('/api/images/search?garment_type=dress');

    expect(res.status).toBe(200);
    expect(res.body.images.length).toBe(1);
    expect(res.body.images[0].id).toBe(uploadedImageId);
  });

  it('filtering by non-matching type returns empty', async () => {
    const res = await request(app).get('/api/images/search?garment_type=jacket');

    expect(res.status).toBe(200);
    expect(res.body.images.length).toBe(0);
  });

  it('full-text search finds the image by description keywords', async () => {
    const res = await request(app).get('/api/images/search?q=silk');

    expect(res.status).toBe(200);
    expect(res.body.images.length).toBe(1);
    expect(res.body.images[0].id).toBe(uploadedImageId);
  });

  it('combined filter and search narrows results', async () => {
    const res = await request(app).get('/api/images/search?garment_type=dress&season=spring');

    expect(res.status).toBe(200);
    expect(res.body.images.length).toBe(1);
  });

  it('adding an annotation works', async () => {
    const res = await request(app)
      .post(`/api/images/${uploadedImageId}/annotations`)
      .send({
        designer: 'TestDesigner',
        tags: ['handmade', 'artisan'],
        notes: 'Spotted at Milan fashion week',
      });

    expect(res.status).toBe(201);
    expect(res.body.designer).toBe('TestDesigner');
  });

  it('annotation appears on image detail', async () => {
    const res = await request(app).get(`/api/images/${uploadedImageId}`);

    expect(res.status).toBe(200);
    expect(res.body.annotations.length).toBe(1);
    expect(res.body.annotations[0].designer).toBe('TestDesigner');
    expect(res.body.annotations[0].notes).toContain('Milan fashion week');
  });

  it('annotation text is searchable via FTS', async () => {
    const res = await request(app).get('/api/images/search?q=artisan');

    expect(res.status).toBe(200);
    expect(res.body.images.length).toBe(1);
    expect(res.body.images[0].id).toBe(uploadedImageId);
  });

  it('designer filter includes the annotator', async () => {
    const res = await request(app).get('/api/filters');

    expect(res.status).toBe(200);
    expect(res.body.designer).toContain('TestDesigner');
  });

  it('rejects upload without image file', async () => {
    const res = await request(app).post('/api/images/upload');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
