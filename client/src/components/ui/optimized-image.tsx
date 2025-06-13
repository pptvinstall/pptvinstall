import React, { forwardRef } from 'react';
import { useImageOptimization } from '@/hooks/use-image-optimization';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  priority?: boolean;
  placeholder?: string;
}

export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({ src, alt, quality = 85, format, priority = false, placeholder, className, ...props }, ref) => {
    const { src: optimizedSrc, isLoaded, error } = useImageOptimization(src, {
      quality,
      format,
      loading: priority ? 'eager' : 'lazy'
    });

    if (error) {
      return (
        <div className={cn("flex items-center justify-center bg-gray-100 text-gray-400", className)}>
          <span className="text-sm">Failed to load image</span>
        </div>
      );
    }

    return (
      <div className="relative">
        {!isLoaded && placeholder && (
          <div className={cn("absolute inset-0 bg-gray-100 animate-pulse", className)} />
        )}
        <img
          ref={ref}
          src={optimizedSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

OptimizedImage.displayName = "OptimizedImage";