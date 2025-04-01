import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define icon sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Also create a small badge icon for notifications
const badgeSizes = [72];

async function generateIcons() {
  try {
    const sourceIcon = path.join(__dirname, '../public/icons/icon.svg');
    const iconDir = path.join(__dirname, '../public/icons');
    
    // Check if source icon exists
    await fs.access(sourceIcon);
    
    // Ensure the output directory exists
    try {
      await fs.access(iconDir);
    } catch (e) {
      console.log('Creating icons directory...');
      await fs.mkdir(iconDir, { recursive: true });
    }
    
    // Generate regular icons
    console.log('Generating PWA icons...');
    for (const size of sizes) {
      await sharp(sourceIcon)
        .resize(size, size)
        .png()
        .toFile(path.join(iconDir, `icon-${size}x${size}.png`));
      
      console.log(`Created icon-${size}x${size}.png`);
    }
    
    // Generate badge icon for notifications (normally a simplified version)
    console.log('Generating badge icons...');
    for (const size of badgeSizes) {
      await sharp(sourceIcon)
        .resize(size, size)
        .png()
        .toFile(path.join(iconDir, `badge-${size}x${size}.png`));
      
      console.log(`Created badge-${size}x${size}.png`);
    }
    
    // Create an offline fallback image
    console.log('Generating offline image...');
    const offlineImageSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#f3f4f6" rx="8" ry="8"/>
      <g fill="#9ca3af">
        <path d="M100 70c-22.1 0-40 17.9-40 40 0 22.1 17.9 40 40 40 22.1 0 40-17.9 40-40 0-22.1-17.9-40-40-40zm0 72c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"/>
        <path d="M126.4 81.6L81.6 126.4c-1.6 1.6-1.6 4.1 0 5.7.8.8 1.8 1.2 2.8 1.2s2.1-.4 2.8-1.2l44.8-44.8c1.6-1.6 1.6-4.1 0-5.7-1.5-1.6-4.1-1.6-5.6 0z"/>
      </g>
      <text x="100" y="160" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#6b7280">Image unavailable</text>
    </svg>`;
    
    await fs.writeFile(path.join(iconDir, 'offline-image.svg'), offlineImageSvg);
    console.log('Created offline-image.svg');
    
    console.log('All PWA icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();