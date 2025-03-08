import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_ASSETS_DIR = path.join(process.cwd(), 'client/public/assets');
const OUTPUT_DIR = path.join(process.cwd(), 'client/public/assets/optimized');
const ATTACHED_ASSETS_DIR = path.join(process.cwd(), 'attached_assets');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Get list of image files
const imageFiles = [
  ...fs.readdirSync(PUBLIC_ASSETS_DIR)
    .filter(file => /\.(jpe?g|png)$/i.test(file))
    .map(file => ({ path: path.join(PUBLIC_ASSETS_DIR, file), source: 'public' })),
  
  // Also include attached assets if they exist
  ...(fs.existsSync(ATTACHED_ASSETS_DIR) ? 
    fs.readdirSync(ATTACHED_ASSETS_DIR)
      .filter(file => /\.(jpe?g|png)$/i.test(file))
      .map(file => ({ path: path.join(ATTACHED_ASSETS_DIR, file), source: 'attached' }))
    : [])
];

// Target sizes for responsive images (smaller for better performance)
const widths = [250, 500, 960];

// WebP support for modern browsers
const formats = [
  { format: 'webp', options: { quality: 75 } },
  { format: 'jpeg', options: { quality: 70, progressive: true } }
];

// Image optimization config
const optimizationConfig = {
  // Adjust based on image content type
  photo: { quality: { webp: 75, jpeg: 70 }, compression: 9 },
  logo: { quality: { webp: 85, jpeg: 80 }, compression: 7 },
  icon: { quality: { webp: 70, jpeg: 65 }, compression: 9 }
};

// Classify image type based on filename
function classifyImageType(filename) {
  const lowerFilename = filename.toLowerCase();
  if (lowerFilename.includes('logo') || lowerFilename.includes('brand')) {
    return 'logo';
  } else if (lowerFilename.includes('icon')) {
    return 'icon';
  }
  return 'photo';
}

// Optimize images
async function optimizeImages() {
  console.log('Starting enhanced image optimization...');
  
  const processedFiles = [];
  const fileStats = {
    originalSize: 0,
    optimizedSize: 0,
    count: 0
  };
  
  for (const file of imageFiles) {
    try {
      const filePath = file.path;
      const originalStat = fs.statSync(filePath);
      fileStats.originalSize += originalStat.size;
      
      const filename = path.basename(filePath, path.extname(filePath));
      const extension = path.extname(filePath).toLowerCase() === '.png' ? '.png' : '.jpg';
      const imageType = classifyImageType(filename);
      
      console.log(`Processing ${filename}${extension} as ${imageType}...`);
      
      const originalImage = sharp(filePath);
      const metadata = await originalImage.metadata();
      
      // Standard version (960px max width)
      for (const format of formats) {
        const outputFilename = `${filename}${format.format === 'jpeg' ? extension : '.webp'}`;
        const outputPath = path.join(OUTPUT_DIR, outputFilename);
        
        await originalImage
          .clone()
          .resize({ 
            width: Math.min(960, metadata.width || 960), 
            withoutEnlargement: true,
            fit: 'inside'
          })
          [format.format]({
            ...format.options,
            quality: optimizationConfig[imageType].quality[format.format] || format.options.quality
          })
          .toFile(outputPath);
          
        // Track optimized file size
        const optimizedStat = fs.statSync(outputPath);
        fileStats.optimizedSize += optimizedStat.size;
      }
      
      // Responsive versions (multiple sizes for different devices)
      for (const width of widths.filter(w => w < (metadata.width || Infinity))) {
        for (const format of formats) {
          const suffix = format.format === 'jpeg' ? extension : '.webp';
          const outputFilename = `${filename}-${width}${suffix}`;
          
          await originalImage
            .clone()
            .resize({ 
              width,
              withoutEnlargement: true,
              fit: 'inside'
            })
            [format.format]({
              ...format.options,
              quality: width < 500 
                ? Math.max(50, optimizationConfig[imageType].quality[format.format] - 10)
                : optimizationConfig[imageType].quality[format.format]
            })
            .toFile(path.join(OUTPUT_DIR, outputFilename));
        }
      }
      
      processedFiles.push({
        name: filename,
        originalFormat: extension.replace('.', ''),
        width: metadata.width,
        height: metadata.height,
        sizes: widths.filter(w => w < (metadata.width || Infinity))
      });
      
      fileStats.count++;
    } catch (error) {
      console.error(`Error processing ${file.path}:`, error);
    }
  }
  
  // Calculate and log savings
  const savedBytes = fileStats.originalSize - fileStats.optimizedSize;
  const savingsPercent = (savedBytes / fileStats.originalSize * 100).toFixed(2);
  console.log(`\nOptimization complete:
  - Images processed: ${fileStats.count}
  - Original size: ${(fileStats.originalSize / (1024 * 1024)).toFixed(2)} MB
  - Optimized size: ${(fileStats.optimizedSize / (1024 * 1024)).toFixed(2)} MB
  - Space saved: ${(savedBytes / (1024 * 1024)).toFixed(2)} MB (${savingsPercent}%)
  `);
  
  return processedFiles;
}

// Generate a manifest file for the optimized images
function generateManifest(processedFiles) {
  const manifest = {};
  
  processedFiles.forEach(file => {
    manifest[file.name] = {
      default: `/assets/optimized/${file.name}.jpg`,
      webp: `/assets/optimized/${file.name}.webp`,
      width: file.width,
      height: file.height,
      responsive: file.sizes.map(width => ({ 
        width,
        jpg: `/assets/optimized/${file.name}-${width}.jpg`,
        webp: `/assets/optimized/${file.name}-${width}.webp`
      }))
    };
  });
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'images-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  console.log('Enhanced image manifest generated successfully!');
}

// Run optimization
optimizeImages()
  .then(processedFiles => {
    console.log(`Optimized ${processedFiles.length} images`);
    generateManifest(processedFiles);
  })
  .catch(err => console.error('Error optimizing images:', err));