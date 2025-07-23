// Icon generation script for PWA
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Ensure directories exist
const ICONS_DIR = path.join(__dirname, '../public/icons');
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

const PPTV_DIR = path.join(ICONS_DIR, 'pptv');
if (!fs.existsSync(PPTV_DIR)) {
  fs.mkdirSync(PPTV_DIR, { recursive: true });
}

async function generateIcons() {
  try {
    // Using the logo file
    const sourceImage = path.join(__dirname, '../attached_assets/IMG_1509.jpeg');
    
    if (!fs.existsSync(sourceImage)) {
      console.error(`Source image not found: ${sourceImage}`);
      process.exit(1);
    }
    
    console.log('Generating PWA icons...');
    
    // Generate favicons
    await sharp(sourceImage)
      .resize(32, 32)
      .toFile(path.join(__dirname, '../public/images/favicon.png'));
    
    // Generate regular icons at various sizes
    for (const size of ICON_SIZES) {
      await sharp(sourceImage)
        .resize(size, size)
        .toFile(path.join(ICONS_DIR, `icon-${size}x${size}.png`));
      
      console.log(`Generated icon-${size}x${size}.png`);
    }
    
    // Generate maskable icon with padding (ensures icon stays within safe area)
    // Standard maskable icon has 10% safe zone from each edge
    await sharp(sourceImage)
      .resize(Math.floor(512 * 0.8), Math.floor(512 * 0.8)) // 80% of total size to allow for 10% padding on all sides
      .extend({
        top: Math.floor(512 * 0.1),
        bottom: Math.floor(512 * 0.1),
        left: Math.floor(512 * 0.1),
        right: Math.floor(512 * 0.1),
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(path.join(ICONS_DIR, 'maskable-icon.png'));
    
    console.log('Generated maskable icon');
    
    // Create Apple specific icons
    await sharp(sourceImage)
      .resize(180, 180)
      .toFile(path.join(PPTV_DIR, 'apple-touch-icon.png'));
    
    await sharp(sourceImage)
      .resize(180, 180)
      .toFile(path.join(PPTV_DIR, 'apple-touch-icon-precomposed.png'));
    
    console.log('Generated Apple touch icons');
    
    console.log('PWA icon generation complete!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();