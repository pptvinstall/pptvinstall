import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  useOptimized?: boolean;
  priority?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  sizes?: string;
  fadeIn?: boolean;
  placeholderColor?: string;
  fallbackSrc?: string; // Added to support fallback image source
}

type ImageManifestEntry = {
  default: string;
  webp: string;
  width: number;
  height: number;
  responsive: Array<{
    width: number;
    jpg: string;
    webp: string;
  }>;
};

export function ResponsiveImage({
  src,
  alt,
  className,
  width,
  height,
  useOptimized = true,
  priority = false,
  objectFit = 'cover',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  fadeIn = true,
  placeholderColor = '#f5f5f5',
  fallbackSrc,
  ...props
}: ResponsiveImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [imageManifest, setImageManifest] = useState<Record<string, ImageManifestEntry> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isWebpSupported, setIsWebpSupported] = useState<boolean | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageManifestEntry | null>(null);

  // Check for WebP support on component mount
  useEffect(() => {
    const checkWebpSupport = async () => {
      if (typeof window !== 'undefined') {
        // Create a test WebP image
        const webpSup = document.createElement('canvas')
          .toDataURL('image/webp')
          .indexOf('data:image/webp') === 0;
        setIsWebpSupported(webpSup);
      }
    };
    
    checkWebpSupport();
  }, []);

  // Extract image name for manifest lookup
  const imageName = useMemo(() => {
    return src.split('/').pop()?.split('.')[0] || '';
  }, [src]);

  // Load image manifest and update sources
  useEffect(() => {
    if (!useOptimized || isWebpSupported === null) {
      return;
    }

    async function loadImageManifest() {
      try {
        // Only load the manifest once
        if (imageManifest === null) {
          const response = await fetch('/assets/optimized/images-manifest.json');
          
          if (!response.ok) {
            throw new Error('Failed to load image manifest');
          }
          
          const manifest = await response.json();
          setImageManifest(manifest);
          
          // If imageName exists in manifest, update imageInfo
          if (imageName && manifest[imageName]) {
            setImageInfo(manifest[imageName]);
            setImageSrc(isWebpSupported ? manifest[imageName].webp : manifest[imageName].default);
          } else {
            // Fallback to original if not in manifest
            setImageSrc(src);
          }
        } else if (imageName && imageManifest[imageName]) {
          // Manifest already loaded
          setImageInfo(imageManifest[imageName]);
          setImageSrc(isWebpSupported ? imageManifest[imageName].webp : imageManifest[imageName].default);
        } else {
          // Image not in manifest
          setImageSrc(src);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading optimized image:', err);
        setImageSrc(src); // Fallback to original
        setError(err as Error);
        setIsLoading(false);
      }
    }

    loadImageManifest();
  }, [src, useOptimized, imageManifest, imageName, isWebpSupported]);

  // Generate srcset for responsive images
  const srcSet = useMemo(() => {
    if (!imageInfo) return '';
    
    return imageInfo.responsive
      .map(size => `${isWebpSupported ? size.webp : size.jpg} ${size.width}w`)
      .join(', ');
  }, [imageInfo, isWebpSupported]);

  // Handle image load completion
  const handleImageLoaded = () => {
    setIsLoading(false);
  };

  // Placeholder style during loading
  const placeholderStyle = {
    backgroundColor: placeholderColor,
    width: width || '100%',
    height: height || 0,
    aspectRatio: imageInfo?.width && imageInfo?.height 
      ? `${imageInfo.width} / ${imageInfo.height}` 
      : 'auto',
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden", 
        !height && !imageInfo?.height && "min-h-[100px]",
        className
      )}
      style={isLoading ? placeholderStyle : undefined}
    >
      {isLoading && fadeIn && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      )}
      
      {error && console.error('Image loading error:', error)}
      
      <picture>
        {/* If WebP is supported and we have responsive sizes, add source for WebP */}
        {isWebpSupported && imageInfo?.responsive && (
          <source
            type="image/webp"
            srcSet={imageInfo.responsive.map(size => `${size.webp} ${size.width}w`).join(', ')}
            sizes={sizes}
          />
        )}
        
        {/* Always include standard format sources for fallback */}
        {imageInfo?.responsive && (
          <source
            type="image/jpeg"
            srcSet={imageInfo.responsive.map(size => `${size.jpg} ${size.width}w`).join(', ')}
            sizes={sizes}
          />
        )}
        
        <img
          src={imageSrc}
          alt={alt}
          width={width || imageInfo?.width}
          height={height || imageInfo?.height}
          onLoad={handleImageLoaded}
          className={cn(
            "w-full h-auto transition-opacity",
            fadeIn && (isLoading ? "opacity-0" : "opacity-100 duration-500"),
            objectFit === 'cover' && "object-cover",
            objectFit === 'contain' && "object-contain",
            objectFit === 'fill' && "object-fill",
            objectFit === 'none' && "object-none",
            objectFit === 'scale-down' && "object-scale-down",
            className
          )}
          loading={priority ? "eager" : "lazy"}
          srcSet={!imageInfo?.responsive ? undefined : srcSet}
          sizes={!imageInfo?.responsive ? undefined : sizes}
          {...props}
        />
      </picture>
    </div>
  );
}