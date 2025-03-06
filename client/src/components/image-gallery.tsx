import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

export function ImageGallery() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === installations.length - 1 ? 0 : prev + 1
    );
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? installations.length - 1 : prev - 1
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {installations.map((install, index) => (
          <Card 
            key={install.id} 
            className="overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-200"
            onClick={() => {
              setCurrentImageIndex(index);
              setIsOpen(true);
            }}
          >
            <div className="aspect-video relative">
              <img
                src={install.image}
                alt={install.title}
                className="object-cover w-full h-full"
                loading={index < 3 ? "eager" : "lazy"} // Only eagerly load first visible images
                decoding="async"
                width="400"
                height="225"
              />
            </div>
            <CardContent className="p-4">
              <p className="font-semibold">{install.title}</p>
              <p className="text-sm text-gray-600">{install.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {installations[currentImageIndex].title}
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <div className="relative aspect-video">
              <img
                src={installations[currentImageIndex].image}
                alt={installations[currentImageIndex].title}
                className="object-contain w-full h-full"
                loading="eager" // Modal images should load immediately when requested
                decoding="async"
                width="800" 
                height="450"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                previousImage();
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {currentImageIndex + 1} / {installations.length}
            </div>
          </div>
          <p className="text-center text-gray-600 mt-2">
            {installations[currentImageIndex].description}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}