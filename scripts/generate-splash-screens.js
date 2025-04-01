import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base configuration for splash screens
const splashScreens = [
  { width: 2048, height: 2732, name: 'apple-splash-2048-2732.png' }, // iPad Pro 12.9"
  { width: 1668, height: 2388, name: 'apple-splash-1668-2388.png' }, // iPad Pro 11"
  { width: 1536, height: 2048, name: 'apple-splash-1536-2048.png' }, // iPad Air
  { width: 1125, height: 2436, name: 'apple-splash-1125-2436.png' }, // iPhone X/XS
  { width: 1242, height: 2688, name: 'apple-splash-1242-2688.png' }, // iPhone XS Max
  { width: 828, height: 1792, name: 'apple-splash-828-1792.png' },   // iPhone XR
  { width: 750, height: 1334, name: 'apple-splash-750-1334.png' },   // iPhone 8
  { width: 640, height: 1136, name: 'apple-splash-640-1136.png' },   // iPhone SE
];

// Logo configuration
const logoSize = 256; // Size of logo in pixels
const logoPath = path.join(__dirname, '../public/icons/icon-512x512.png');
const targetDir = path.join(__dirname, '../public/icons');

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Generate splash screens
async function generateSplashScreens() {
  console.log('Generating Apple splash screens...');
  
  // Ensure logo file exists
  if (!fs.existsSync(logoPath)) {
    console.error(`Logo file not found: ${logoPath}`);
    return;
  }
  
  // Process each splash screen size
  for (const screen of splashScreens) {
    try {
      // Create a blank canvas with blue gradient background
      const gradient = Buffer.from(`
        <svg width="${screen.width}" height="${screen.height}">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grad)" />
        </svg>
      `);
      
      // Calculate logo position (centered)
      const logoLeft = Math.floor((screen.width - logoSize) / 2);
      const logoTop = Math.floor((screen.height - logoSize) / 2);
      
      // Create the splash screen
      await sharp(gradient)
        .composite([
          {
            input: logoPath,
            top: logoTop,
            left: logoLeft,
            width: logoSize,
            height: logoSize,
          }
        ])
        .toFile(path.join(targetDir, screen.name));
      
      console.log(`Created ${screen.name} (${screen.width}x${screen.height})`);
    } catch (error) {
      console.error(`Error generating ${screen.name}:`, error);
    }
  }
  
  console.log('Splash screen generation complete!');
}

// Run the generator
generateSplashScreens().catch(console.error);