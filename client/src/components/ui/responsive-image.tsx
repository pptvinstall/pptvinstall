import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

/**
 * ResponsiveImage component with lazy loading and error handling
 */
export function ResponsiveImage({
  src,
  alt,
  className,
  fallbackSrc,
  loading: loadingProp = "lazy",
  ...props
}: ResponsiveImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Reset state when src changes
  useEffect(() => {
    setImgSrc(src);
    setIsLoading(true);
    setError(false);
  }, [src]);

  // Format the image source path to ensure proper paths
  const formattedSrc = imgSrc;

  // Handle image load errors
  const handleError = () => {
    setError(true);
    setIsLoading(false);
    if (fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="relative overflow-hidden w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <span className="sr-only">Loading...</span>
        </div>
      )}
      {error && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-sm text-gray-500">Unable to load image</span>
        </div>
      )}

      <img
        src={formattedSrc}
        alt={alt}
        loading={loadingProp}
        className={cn(
          "w-full h-full transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        onError={handleError}
        onLoad={handleLoad}
        style={{ position: 'relative' }}
        {...props}
      />
    </div>
  );
}