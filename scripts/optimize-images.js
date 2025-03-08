const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PUBLIC_ASSETS_DIR = path.join(process.cwd(), 'client/public/assets');
const OUTPUT_DIR = path.join(process.cwd(), 'client/public/assets/optimized');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Get list of image files
const imageFiles = fs.readdirSync(PUBLIC_ASSETS_DIR)
  .filter(file => /\.(jpe?g|png)$/i.test(file))
  .map(file => path.join(PUBLIC_ASSETS_DIR, file));

// Target sizes for responsive images
const widths = [320, 640, 960];

// Optimize images
async function optimizeImages() {
  console.log('Starting image optimization...');
  
  const promises = imageFiles.map(async (file) => {
    const filename = path.basename(file, path.extname(file));
    const extension = path.extname(file).toLowerCase() === '.png' ? '.png' : '.jpg';
    
    console.log(`Processing ${filename}${extension}...`);
    
    // Create standard optimized version (960px wide)
    await sharp(file)
      .resize({ width: 960, withoutEnlargement: true })
      .jpeg({ quality: 70, progressive: true })
      .toFile(path.join(OUTPUT_DIR, `${filename}${extension}`));
    
    // Create responsive versions
    for (const width of widths) {
      await sharp(file)
        .resize({ width, withoutEnlargement: true })
        .jpeg({ quality: width < 640 ? 60 : 70, progressive: true })
        .toFile(path.join(OUTPUT_DIR, `${filename}-${width}${extension}`));
    }
    
    return filename;
  });
  
  return Promise.all(promises);
}

// Generate a manifest file for the optimized images
function generateManifest(processedFiles) {
  const manifest = {};
  
  processedFiles.forEach(filename => {
    manifest[filename] = {
      default: `/assets/optimized/${filename}.jpg`,
      responsive: widths.map(width => ({ 
        width,
        src: `/assets/optimized/${filename}-${width}.jpg` 
      }))
    };
  });
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'images-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  console.log('Image manifest generated successfully!');
}

// Run optimization
optimizeImages()
  .then(processedFiles => {
    console.log(`Optimized ${processedFiles.length} images`);
    generateManifest(processedFiles);
    console.log('Image optimization completed!');
  })
  .catch(err => console.error('Error optimizing images:', err));