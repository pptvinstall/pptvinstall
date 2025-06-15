import { useState, useEffect } from 'react';
import { ResponsiveImage } from "@/components/ui/responsive-image";
import ErrorBoundary from "@/components/error-boundary";

interface AutoSlideshowProps {
  images: string[];
  interval?: number;
  className?: string;
}

export function AutoSlideshow({ 
  images, 
  interval = 5000, 
  className 
}: AutoSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (!images.length) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, interval);
    
    return () => clearInterval(timer);
  }, [images, interval]);
  
  if (!images.length) return null;
  
  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      <div className="transition-opacity duration-1000">
        <ErrorBoundary>
          <ResponsiveImage
            src={images[currentIndex]}
            alt={`Slide ${currentIndex + 1}`}
            className="w-full"
          />
        </ErrorBoundary>
      </div>
      
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {images.map((_, idx) => (
          <button
            key={idx}
            className={`w-2 h-2 rounded-full ${
              idx === currentIndex ? 'bg-white' : 'bg-white/50'
            }`}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}