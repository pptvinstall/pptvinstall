// Generate splash screens for iOS devices
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// iOS splash screen dimensions
const SPLASH_SCREENS = [
  // iPhone screens
  { width: 640, height: 1136, name: 'apple-splash-640-1136.png' }, // iPhone 5/SE
  { width: 750, height: 1334, name: 'apple-splash-750-1334.png' }, // iPhone 6/7/8
  { width: 828, height: 1792, name: 'apple-splash-828-1792.png' }, // iPhone XR/11
  { width: 1125, height: 2436, name: 'apple-splash-1125-2436.png' }, // iPhone X/XS/11 Pro
  { width: 1242, height: 2688, name: 'apple-splash-1242-2688.png' }, // iPhone XS Max/11 Pro Max
  { width: 1170, height: 2532, name: 'apple-splash-1170-2532.png' }, // iPhone 12/13/14
  { width: 1284, height: 2778, name: 'apple-splash-1284-2778.png' }, // iPhone 12/13/14 Pro Max
  
  // iPad screens
  { width: 1536, height: 2048, name: 'apple-splash-1536-2048.png' }, // iPad Mini/Air 9.7"
  { width: 1668, height: 2388, name: 'apple-splash-1668-2388.png' }, // iPad Pro 11"
  { width: 2048, height: 2732, name: 'apple-splash-2048-2732.png' }, // iPad Pro 12.9"
];

// Ensure splash screens directory exists
const SPLASH_DIR = path.join(__dirname, '../public/icons');
if (!fs.existsSync(SPLASH_DIR)) {
  fs.mkdirSync(SPLASH_DIR, { recursive: true });
}

async function generateSplashScreens() {
  try {
    // Using the logo file
    const logoImage = path.join(__dirname, '../attached_assets/IMG_1509.jpeg');
    
    if (!fs.existsSync(logoImage)) {
      console.error(`Logo image not found: ${logoImage}`);
      process.exit(1);
    }

    console.log('Generating iOS splash screens...');
    
    // Get logo dimensions
    const logoMetadata = await sharp(logoImage).metadata();
    const logoWidth = logoMetadata.width;
    const logoHeight = logoMetadata.height;
    
    // Create optimized version of logo for splash screens
    const optimizedLogo = await sharp(logoImage)
      .resize(Math.min(logoWidth, 400), Math.min(logoHeight, 400), {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toBuffer();
    
    // Generate splash screens with centered logo on white background
    for (const screen of SPLASH_SCREENS) {
      // Create a white background
      const splashScreen = await sharp({
        create: {
          width: screen.width,
          height: screen.height,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
      .composite([
        {
          input: optimizedLogo,
          gravity: 'center' // Center the logo
        }
      ])
      .toFile(path.join(SPLASH_DIR, screen.name));
      
      console.log(`Generated ${screen.name} (${screen.width}x${screen.height})`);
    }
    
    console.log('iOS splash screen generation complete!');
  } catch (error) {
    console.error('Error generating splash screens:', error);
    process.exit(1);
  }
}

generateSplashScreens();