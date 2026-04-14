/**
 * Download fashion images from Pexels API for evaluation.
 * 
 * Usage: PEXELS_API_KEY=your_key node eval/download_images.js
 * 
 * This script downloads ~60 fashion/garment images for the evaluation pipeline.
 * Delete this script after downloading images.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, 'images');
const API_KEY = process.env.PEXELS_API_KEY;

if (!API_KEY) {
  console.error('Error: Set PEXELS_API_KEY environment variable');
  console.error('Usage: PEXELS_API_KEY=your_key node eval/download_images.js');
  process.exit(1);
}

const QUERIES = [
  { query: 'fashion dress', count: 10 },
  { query: 'streetwear outfit', count: 8 },
  { query: 'formal suit', count: 6 },
  { query: 'casual jacket', count: 6 },
  { query: 'bohemian clothing', count: 5 },
  { query: 'traditional garment', count: 5 },
  { query: 'athletic sportswear', count: 5 },
  { query: 'winter coat', count: 5 },
  { query: 'summer fashion', count: 5 },
  { query: 'leather fashion', count: 5 },
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { Authorization: API_KEY },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Failed to parse response: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function main() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const manifest = [];
  let imageIndex = 0;

  for (const { query, count } of QUERIES) {
    console.log(`Searching "${query}" (${count} images)...`);
    try {
      const data = await fetchJson(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=portrait`
      );

      if (!data.photos || data.photos.length === 0) {
        console.warn(`  No photos found for "${query}"`);
        continue;
      }

      for (const photo of data.photos.slice(0, count)) {
        imageIndex++;
        const filename = `eval_${String(imageIndex).padStart(3, '0')}.jpeg`;
        const dest = path.join(IMAGES_DIR, filename);

        // Use medium size for reasonable file sizes
        const downloadUrl = photo.src.medium;
        console.log(`  Downloading ${filename}...`);
        await downloadFile(downloadUrl, dest);

        manifest.push({
          filename,
          pexels_id: photo.id,
          photographer: photo.photographer,
          query,
          url: photo.url,
          alt: photo.alt || '',
        });
      }
    } catch (err) {
      console.error(`  Error searching "${query}":`, err.message);
    }
  }

  // Save manifest
  fs.writeFileSync(
    path.join(__dirname, 'image_manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`\nDone! Downloaded ${manifest.length} images to eval/images/`);
  console.log('Manifest saved to eval/image_manifest.json');
  console.log('\nNext: Create ground_truth.json with manual labels.');
}

main().catch(console.error);
