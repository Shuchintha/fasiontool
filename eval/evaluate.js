/**
 * Evaluation script for the fashion garment classifier.
 * 
 * Runs the classifier on all eval images, compares against ground truth,
 * and reports per-attribute accuracy.
 * 
 * Usage: 
 *   cd app/server && cp .env.example .env  (set your OPENAI_API_KEY)
 *   node eval/evaluate.js
 * 
 * Requires: eval images downloaded in eval/images/ and OPENAI_API_KEY set.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, 'images');
const GROUND_TRUTH_PATH = path.join(__dirname, 'ground_truth.json');
const RESULTS_PATH = path.join(__dirname, 'eval_results.json');

// Import classifier from server
import { classifyImage } from '../app/server/services/classifier.js';

// Fuzzy match: check if predicted value contains or is contained by expected (case-insensitive)
function fuzzyMatch(predicted, expected) {
  if (!predicted || !expected || expected === 'Unknown') return null; // skip unknowns
  const p = predicted.toLowerCase().trim();
  const e = expected.toLowerCase().trim();
  if (p === e) return 'exact';
  if (p.includes(e) || e.includes(p)) return 'fuzzy';
  return 'mismatch';
}

// Map classifier output fields to ground truth fields
const FIELD_MAP = {
  garment_type: 'garment_type',
  style: 'style',
  material: 'material',
  occasion: 'occasion',
};

async function evaluate() {
  // Load ground truth
  const groundTruth = JSON.parse(fs.readFileSync(GROUND_TRUTH_PATH, 'utf8'));
  const labels = groundTruth.labels;

  // Check images exist
  const availableImages = labels.filter(l => fs.existsSync(path.join(IMAGES_DIR, l.filename)));
  if (availableImages.length === 0) {
    console.error('No eval images found in eval/images/. Run download script first:');
    console.error('  PEXELS_API_KEY=your_key node eval/download_images.js');
    process.exit(1);
  }

  console.log(`\nEvaluating ${availableImages.length} images...\n`);

  const results = [];
  const stats = {};
  for (const field of Object.keys(FIELD_MAP)) {
    stats[field] = { exact: 0, fuzzy: 0, mismatch: 0, skipped: 0, total: 0 };
  }

  let processed = 0;
  const errors = [];

  for (const label of availableImages) {
    processed++;
    const imagePath = path.join(IMAGES_DIR, label.filename);
    process.stdout.write(`  [${processed}/${availableImages.length}] ${label.filename}...`);

    try {
      const prediction = await classifyImage(imagePath);

      const comparison = {};
      for (const [field, gtField] of Object.entries(FIELD_MAP)) {
        const expected = label[gtField];
        const predicted = prediction[field];
        const match = fuzzyMatch(predicted, expected);

        comparison[field] = { expected, predicted, match };

        if (match === null) {
          stats[field].skipped++;
        } else if (match === 'exact') {
          stats[field].exact++;
          stats[field].total++;
        } else if (match === 'fuzzy') {
          stats[field].fuzzy++;
          stats[field].total++;
        } else {
          stats[field].mismatch++;
          stats[field].total++;
        }
      }

      results.push({
        filename: label.filename,
        prediction: {
          garment_type: prediction.garment_type,
          style: prediction.style,
          material: prediction.material,
          occasion: prediction.occasion,
          description: prediction.description?.slice(0, 200),
        },
        ground_truth: label,
        comparison,
      });

      console.log(' done');

      // Rate limiting: small delay between API calls
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
      errors.push({ filename: label.filename, error: err.message });
    }
  }

  // Calculate accuracy
  console.log('\n' + '='.repeat(70));
  console.log('EVALUATION RESULTS');
  console.log('='.repeat(70));
  console.log(`\nImages evaluated: ${results.length}/${availableImages.length}`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`);
  }

  console.log('\nPer-attribute accuracy:');
  console.log('-'.repeat(70));
  console.log(
    'Attribute'.padEnd(20) +
    'Exact'.padEnd(10) +
    'Fuzzy'.padEnd(10) +
    'Mismatch'.padEnd(10) +
    'Skipped'.padEnd(10) +
    'Accuracy'
  );
  console.log('-'.repeat(70));

  const summary = {};
  for (const [field, s] of Object.entries(stats)) {
    const accuracy = s.total > 0 ? ((s.exact + s.fuzzy) / s.total * 100).toFixed(1) : 'N/A';
    const exactAcc = s.total > 0 ? (s.exact / s.total * 100).toFixed(1) : 'N/A';
    console.log(
      field.padEnd(20) +
      String(s.exact).padEnd(10) +
      String(s.fuzzy).padEnd(10) +
      String(s.mismatch).padEnd(10) +
      String(s.skipped).padEnd(10) +
      `${accuracy}% (exact: ${exactAcc}%)`
    );
    summary[field] = {
      exact_matches: s.exact,
      fuzzy_matches: s.fuzzy,
      mismatches: s.mismatch,
      skipped: s.skipped,
      total_evaluated: s.total,
      accuracy_pct: s.total > 0 ? parseFloat(accuracy) : null,
      exact_accuracy_pct: s.total > 0 ? parseFloat(exactAcc) : null,
    };
  }

  console.log('-'.repeat(70));

  // Common mismatches
  console.log('\nNotable mismatches:');
  for (const r of results) {
    for (const [field, comp] of Object.entries(r.comparison)) {
      if (comp.match === 'mismatch') {
        console.log(`  ${r.filename} [${field}]: expected "${comp.expected}" got "${comp.predicted}"`);
      }
    }
  }

  // Save results
  const output = {
    evaluated_at: new Date().toISOString(),
    images_evaluated: results.length,
    images_total: availableImages.length,
    errors: errors.length,
    summary,
    details: results,
    error_details: errors,
  };

  fs.writeFileSync(RESULTS_PATH, JSON.stringify(output, null, 2));
  console.log(`\nFull results saved to eval/eval_results.json`);
}

evaluate().catch(err => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
