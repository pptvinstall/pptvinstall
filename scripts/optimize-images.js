import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Directories to scan (recursive)
const SCAN_DIRS = [
  path.join(ROOT, 'client/public/images'),
  path.join(ROOT, 'client/public/assets'),
  path.join(ROOT, 'client/src/assets'),
];

const IMAGE_EXTS = /\.(jpe?g|png)$/i;

function collectImages(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectImages(full));
    } else if (IMAGE_EXTS.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const allImages = SCAN_DIRS.flatMap(collectImages);

console.log(`\nFound ${allImages.length} image(s) to process.\n`);

let converted = 0;
let skipped = 0;
let errors = 0;

for (const imgPath of allImages) {
  const webpPath = imgPath.replace(IMAGE_EXTS, '.webp');

  if (fs.existsSync(webpPath)) {
    console.log(`  ⏭  SKIP  ${path.relative(ROOT, imgPath)} (WebP already exists)`);
    skipped++;
    continue;
  }

  try {
    const originalSize = fs.statSync(imgPath).size;
    await sharp(imgPath).webp({ quality: 85 }).toFile(webpPath);
    const newSize = fs.statSync(webpPath).size;
    const saving = (((originalSize - newSize) / originalSize) * 100).toFixed(1);
    const originalKb = (originalSize / 1024).toFixed(0);
    const newKb = (newSize / 1024).toFixed(0);
    console.log(`  ✅ DONE  ${path.relative(ROOT, imgPath)}`);
    console.log(`           ${originalKb}KB → ${newKb}KB  (${saving}% smaller)`);
    converted++;
  } catch (err) {
    console.error(`  ❌ ERROR ${path.relative(ROOT, imgPath)}: ${err.message}`);
    errors++;
  }
}

console.log(`\n── Summary ─────────────────────────────`);
console.log(`  Converted : ${converted}`);
console.log(`  Skipped   : ${skipped} (already had WebP)`);
console.log(`  Errors    : ${errors}`);
console.log(`────────────────────────────────────────\n`);
