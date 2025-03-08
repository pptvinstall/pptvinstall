import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  quality?: 'low' | 'medium' | 'high';
  priority?: boolean;
  style?: React.CSSProperties;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
}

export function ResponsiveImage({
  src,
  alt,
  className,
  width,
  height,
  aspectRatio,
  quality = 'medium',
  priority = false,
  style,
  objectFit = 'cover',
  objectPosition = 'center',
  ...props
}: ResponsiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState(src); // Added state for optimized source

  // Just use the direct source without trying optimized version
  useEffect(() => {
    setOptimizedSrc(src);
  }, [src]);


  useEffect(() => {
    // Simple visibility detection - more advanced would use IntersectionObserver
    setIsVisible(true);

    // Reset states when src changes
    setIsLoaded(false);
    setError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    console.error(`Failed to load image: ${optimizedSrc}`);

    // If optimized image fails, try original source as fallback
    if (optimizedSrc !== src && src) {
      console.log(`Falling back to original source: ${src}`);
      setOptimizedSrc(src);
    } else {
      setError(true);
    }
  };

  const aspectRatioStyle = aspectRatio ? { aspectRatio } : {};

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        isLoaded ? "bg-transparent" : "bg-gradient-to-r from-gray-100 to-gray-50",
        !isLoaded && !error && "animate-pulse",
        className
      )}
      style={{
        ...aspectRatioStyle,
        ...style
      }}
    >
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-10 w-10 border-4 border-brand-blue-200 border-t-brand-blue-500 rounded-full animate-spin"></div>
        </div>
      )}

      {isVisible && (
        <img
          src={optimizedSrc} // Use optimizedSrc
          alt={alt}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full transition-all duration-500 ease-in-out",
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]",
            objectFit === 'cover' && "object-cover",
            objectFit === 'contain' && "object-contain",
            objectFit === 'fill' && "object-fill",
            objectFit === 'none' && "object-none",
            objectFit === 'scale-down' && "object-scale-down"
          )}
          style={{ objectPosition }}
          loading={priority ? "eager" : "lazy"}
          {...props}
        />
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-brand-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-gray-500">Image not available</span>
        </div>
      )}
    </div>
  );
}