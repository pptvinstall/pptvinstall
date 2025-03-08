import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  useOptimized?: boolean;
  priority?: boolean;
}

export function ResponsiveImage({
  src,
  alt,
  className,
  width,
  height,
  useOptimized = true,
  priority = false,
  ...props
}: ResponsiveImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [imageManifest, setImageManifest] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!useOptimized) {
      setImageSrc(src);
      setIsLoading(false);
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
        }

        // Extract the image name from the src
        const imageName = src.split('/').pop()?.split('.')[0];
        
        if (imageName && imageManifest && imageManifest[imageName]) {
          setImageSrc(imageManifest[imageName].default);
        } else {
          // Fallback to original if not in manifest
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
  }, [src, useOptimized, imageManifest]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      )}
      
      {error && console.error('Image loading error:', error)}
      
      <img
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          "w-full h-auto object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        loading={priority ? "eager" : "lazy"}
        {...props}
      />
    </div>
  );
}