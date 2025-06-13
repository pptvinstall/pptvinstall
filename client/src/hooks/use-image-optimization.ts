import { useEffect, useState } from 'react';

interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  loading?: 'lazy' | 'eager';
}

export function useImageOptimization(src: string, options: ImageOptimizationOptions = {}) {
  const [optimizedSrc, setOptimizedSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check if browser supports WebP
    const supportsWebP = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    };

    // Optimize image URL based on browser capabilities
    const optimizeImageUrl = (originalSrc: string) => {
      if (!originalSrc) return originalSrc;
      
      // If it's already optimized or is an SVG, return as-is
      if (originalSrc.includes('.svg') || originalSrc.includes('webp')) {
        return originalSrc;
      }

      // Use WebP if supported and not explicitly requesting another format
      if (supportsWebP() && options.format !== 'jpeg' && options.format !== 'png') {
        // This would typically integrate with an image optimization service
        // For now, we return the original URL
        return originalSrc;
      }

      return originalSrc;
    };

    const img = new Image();
    img.onload = () => {
      setIsLoaded(true);
      setError(null);
    };
    img.onerror = () => {
      setError(new Error('Failed to load image'));
      setIsLoaded(false);
    };

    const optimized = optimizeImageUrl(src);
    setOptimizedSrc(optimized);
    img.src = optimized;

  }, [src, options.format]);

  return {
    src: optimizedSrc,
    isLoaded,
    error,
    loading: options.loading || 'lazy'
  };
}

// Hook for lazy loading images
export function useLazyImage(src: string, rootMargin = '50px') {
  const [imageSrc, setImageSrc] = useState<string | undefined>();
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!imageRef || imageSrc) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin }
    );

    observer.observe(imageRef);

    return () => {
      if (imageRef) {
        observer.unobserve(imageRef);
      }
    };
  }, [imageRef, imageSrc, src, rootMargin]);

  return { imageSrc, setImageRef };
}