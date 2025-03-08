import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { ResponsiveImage } from "@/components/ui/responsive-image";

const installations = [
  {
    id: 1,
    title: "Above Fireplace Mount",
    description: "Clean installation with concealed wiring",
    image: "/assets/IMG_1878.jpeg"
  },
  {
    id: 2,
    title: "Custom TV Installation",
    description: "Perfect viewing angle setup",
    image: "/assets/IMG_1876.jpeg"
  },
  {
    id: 3,
    title: "Modern Living Room Setup",
    description: "Sleek and professional mounting",
    image: "/assets/IMG_4282.jpeg"
  },
  {
    id: 4,
    title: "Entertainment Center",
    description: "Complete home theater installation",
    image: "/assets/IMG_1336.jpeg"
  },
  {
    id: 5,
    title: "Smart Home Integration",
    description: "TV and smart device setup",
    image: "/assets/IMG_1317.jpeg"
  },
  {
    id: 6,
    title: "Premium Installation",
    description: "High-end mounting solution",
    image: "/assets/IMG_1154.jpeg"
  }
];

export function AutoSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === installations.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000); // Change slide every 3 seconds

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full">
      <div className="relative aspect-[21/9] overflow-hidden rounded-lg">
        {installations.map((installation, index) => (
          <div
            key={installation.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="relative w-full h-full">
              <ResponsiveImage
                src={installation.image}
                alt={installation.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
              <h3 className="text-white text-xl font-bold mb-2">
                {installation.title}
              </h3>
              <p className="text-white/90">
                {installation.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {installations.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? 'bg-white' : 'bg-white/50'
            }`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}
