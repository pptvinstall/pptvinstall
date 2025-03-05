
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { log } from '../vite';

const statAsync = promisify(fs.stat);
const existsAsync = promisify(fs.exists);
const mkdirAsync = promisify(fs.mkdir);

interface TransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
}

// This middleware will intercept image requests and apply optimizations
export async function imageOptimizationMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only process GET requests to image files
  if (req.method !== 'GET' || !req.path.match(/\.(jpe?g|png|gif|webp)$/i)) {
    return next();
  }

  try {
    // Extract query parameters for transformations
    const options: TransformOptions = {
      width: req.query.width ? parseInt(req.query.width as string) : undefined,
      height: req.query.height ? parseInt(req.query.height as string) : undefined,
      quality: req.query.quality ? parseInt(req.query.quality as string) : 80,
      format: req.query.format as TransformOptions['format'],
    };

    // If no transformations requested, continue to next middleware
    if (!options.width && !options.height && !options.format) {
      return next();
    }

    // Get the image path from the request
    const imagePath = path.join('client/public', req.path);
    
    // Check if the original image exists
    if (!(await existsAsync(imagePath))) {
      return next();
    }

    // Import sharp dynamically (only when needed)
    const sharp = await import('sharp').then(m => m.default).catch(err => {
      console.warn('Sharp module not available for image optimization:', err.message);
      return null;
    });

    // If sharp is not available, just serve the original image
    if (!sharp) {
      return next();
    }

    // Create cache directory if it doesn't exist
    const cacheDir = path.join('server/cache');
    if (!(await existsAsync(cacheDir))) {
      await mkdirAsync(cacheDir, { recursive: true });
    }

    // Create a cache key based on the requested transformations
    const cacheKey = `${path.basename(imagePath)}-w${options.width || 'auto'}-h${options.height || 'auto'}-q${options.quality}-f${options.format || path.extname(imagePath).substring(1)}`;
    const cachePath = path.join(cacheDir, cacheKey);

    // Check if we have this transformation cached
    if (await existsAsync(cachePath)) {
      // Serve from cache
      const stats = await statAsync(cachePath);
      res.setHeader('Content-Type', `image/${options.format || path.extname(imagePath).substring(1)}`);
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      fs.createReadStream(cachePath).pipe(res);
      return;
    }

    // Process the image with sharp
    let sharpInstance = sharp(imagePath);

    // Resize if dimensions specified
    if (options.width || options.height) {
      sharpInstance = sharpInstance.resize(options.width, options.height, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert format if specified
    if (options.format) {
      switch (options.format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality: options.quality });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ quality: options.quality });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality: options.quality });
          break;
        case 'avif':
          sharpInstance = sharpInstance.avif({ quality: options.quality });
          break;
      }
    }

    // Process and save to cache
    const buffer = await sharpInstance.toBuffer();
    fs.writeFileSync(cachePath, buffer);

    // Send processed image
    res.setHeader('Content-Type', `image/${options.format || path.extname(imagePath).substring(1)}`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(buffer);

    log(`Image optimized: ${req.path} -> ${cacheKey}`);
  } catch (error) {
    console.error('Image optimization error:', error);
    next(); // Fall back to regular image serving
  }
}
