import React, { useState, useEffect, useMemo } from 'react';
import { cn } from "@/lib/utils";

// Import the image manifest
let imageManifest: Record<string, any> = {};

// Load the image manifest asynchronously
try {
  fetch('/assets/optimized/images-manifest.json')
    .then(response => response.json())
    .then(data => {
      imageManifest = data;
    })
    .catch(err => {
      console.error('Error loading image manifest:', err);
    });
} catch (error) {
  console.error('Error parsing image manifest:', error);
}

interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  fallbackSrc?: string;
  quality?: 'low' | 'medium' | 'high';
  useOptimized?: boolean;
}

/**
 * ResponsiveImage component with lazy loading, error handling and responsive sizing
 */
export function ResponsiveImage({
  src,
  alt,
  className,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px",
  fallbackSrc,
  quality = 'high',
  useOptimized = true,
  ...props
}: ResponsiveImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Get the base filename from the src
  const getImageKey = useMemo(() => {
    if (!src) return '';
    
    // Extract the file name without extension
    const parts = src.split('/');
    let fileName = parts[parts.length - 1];
    
    // Remove extension if present
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex !== -1) {
      fileName = fileName.substring(0, dotIndex);
    }
    
    return fileName;
  }, [src]);

  // Get the optimized image paths from the manifest
  const optimizedSources = useMemo(() => {
    if (!useOptimized || !getImageKey || !imageManifest[getImageKey]) {
      return null;
    }

    const image = imageManifest[getImageKey];
    if (!image) return null;

    // Determine which size to use based on quality
    let sizeIndex = 0;
    if (image.responsive && image.responsive.length > 0) {
      if (quality === 'low' && image.responsive.length > 0) {
        sizeIndex = 0; // Use smallest size
      } else if (quality === 'medium' && image.responsive.length > 1) {
        sizeIndex = Math.floor(image.responsive.length / 2); // Use middle size
      } else {
        sizeIndex = image.responsive.length - 1; // Use largest size
      }
    }
    
    const selectedSize = image.responsive?.[sizeIndex];
    
    return {
      src: image.default,
      srcSet: image.responsive?.map((size: any) => 
        `${size.src} ${size.width}w`
      ).join(', '),
      webp: image.webp,
      width: image.width,
      height: image.height,
    };
  }, [getImageKey, imageManifest, quality, useOptimized]);

  // Reset state when src changes
  useEffect(() => {
    setImgSrc(src);
    setLoading(true);
    setError(false);
  }, [src]);

  // Ensure the image path is properly formatted
  const formattedSrc = useMemo(() => {
    // If we have optimized sources, use those
    if (optimizedSources) {
      return optimizedSources.src;
    }
    
    // Otherwise use the original src
    return imgSrc?.startsWith('/') || imgSrc?.startsWith('http') 
      ? imgSrc 
      : `/${imgSrc}`;
  }, [imgSrc, optimizedSources]);

  // Handle image load errors
  const handleError = () => {
    setError(true);
    setLoading(false);
    if (fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  };

  const handleLoad = () => {
    setLoading(false);
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <span className="sr-only">Loading...</span>
        </div>
      )}
      {error && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-sm text-gray-500">Unable to load image</span>
        </div>
      )}

      {optimizedSources && optimizedSources.webp ? (
        <picture>
          <source 
            srcSet={optimizedSources.srcSet} 
            sizes={sizes}
            type="image/webp" 
          />
          <img
            src={formattedSrc}
            alt={alt}
            loading="lazy"
            width={optimizedSources.width}
            height={optimizedSources.height}
            sizes={sizes}
            srcSet={optimizedSources.srcSet}
            className={cn(
              "w-full h-auto transition-opacity duration-300",
              loading ? "opacity-0" : "opacity-100"
            )}
            onError={handleError}
            onLoad={handleLoad}
            {...props}
          />
        </picture>
      ) : (
        <img
          src={formattedSrc}
          alt={alt}
          loading="lazy"
          sizes={sizes}
          className={cn(
            "w-full h-auto transition-opacity duration-300",
            loading ? "opacity-0" : "opacity-100"
          )}
          onError={handleError}
          onLoad={handleLoad}
          {...props}
        />
      )}
    </div>
  );
}