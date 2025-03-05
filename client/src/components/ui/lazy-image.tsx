
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholderColor?: string;
  aspectRatio?: string;
  objectFit?: string;
}

const LazyImage = ({ 
  src, 
  alt, 
  className, 
  placeholderColor = "#f9fafb", 
  aspectRatio = "16/9",
  objectFit = "cover",
  ...props 
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" } // Start loading when image is 200px from viewport
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div 
      className={cn(
        "overflow-hidden relative",
        className
      )}
      style={{ aspectRatio }}
      ref={imgRef}
    >
      {/* Placeholder */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-300 bg-gray-100",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
        style={{ backgroundColor: placeholderColor }}
      />
      
      {/* Actual image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={cn(
            "w-full h-full transition-opacity duration-500",
            isLoaded ? "opacity-100" : "opacity-0",
            objectFit === "cover" ? "object-cover" : objectFit === "contain" ? "object-contain" : ""
          )}
          onLoad={handleLoad}
          {...props}
        />
      )}
    </div>
  );
};

export default LazyImage;
