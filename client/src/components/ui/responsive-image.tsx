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
  ...props
}: ResponsiveImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Reset state when src changes
  useEffect(() => {
    setImgSrc(src);
    setLoading(true);
    setError(false);
  }, [src]);

  // Format the image source path
  const formattedSrc = imgSrc?.startsWith('/') || imgSrc?.startsWith('http') 
    ? imgSrc 
    : `/${imgSrc}`;

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

      <img
        src={formattedSrc}
        alt={alt}
        loading="lazy"
        className={cn(
          "w-full h-auto transition-opacity duration-300",
          loading ? "opacity-0" : "opacity-100"
        )}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
    </div>
  );
}