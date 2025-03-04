import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {installations.map((install) => (
          <Card 
            key={install.id} 
            className="overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-200"
            onClick={() => setSelectedImage(install.image)}
          >
            <div className="aspect-video relative">
              <img
                src={install.image}
                alt={install.title}
                className="object-cover w-full h-full"
              />
            </div>
            <CardContent className="p-4">
              <p className="font-semibold">{install.title}</p>
              <p className="text-sm text-gray-600">{install.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Installation Preview</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative aspect-video">
              <img
                src={selectedImage}
                alt="Installation preview"
                className="object-contain w-full h-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
