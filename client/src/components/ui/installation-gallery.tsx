import React from 'react';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Real installation images with proper SEO-friendly alt text
const installationImages = [
  {
    src: "/images/installations/fireplace-install-1.jpg",
    alt: "TV mounted above white fireplace mantel with soundbar - TV installation in Atlanta",
    description: "Premium TV and soundbar installation above fireplace with clean cable management",
    tags: ["Fireplace Mount", "Soundbar"]
  },
  {
    src: "/images/installations/brick-fireplace-install.jpg",
    alt: "Large TV mounted over brick fireplace with wooden mantel - TV installation service Atlanta",
    description: "Large TV mounting over brick fireplace with custom bracket installation",
    tags: ["Brick Installation", "Fireplace Mount"]
  },
  {
    src: "/images/installations/brick-wall-install.jpg",
    alt: "TV mounted on exterior brick wall with secure installation - Outdoor TV mounting Atlanta",
    description: "Secure outdoor TV mounting on brick exterior wall with weather-resistant setup",
    tags: ["Brick Wall", "Outdoor"]
  },
  {
    src: "/images/installations/bedroom-install.jpg",
    alt: "Bedroom TV mounted on wall with perfect viewing angle - Bedroom TV installation Atlanta",
    description: "Bedroom TV installation with perfect viewing angle and hidden cable management",
    tags: ["Bedroom", "Clean Install"]
  },
  {
    src: "/images/installations/fireplace-install-2.jpg",
    alt: "TV mounted over stone fireplace showing sports game - Living room TV mounting Atlanta",
    description: "Living room TV perfectly positioned over stone fireplace for optimal viewing",
    tags: ["Stone Fireplace", "Large TV"]
  },
  {
    src: "/images/installations/apple-tv-setup.jpg",
    alt: "Apple TV setup on wall-mounted display - Smart home installation Atlanta",
    description: "Apple TV smart home integration with professional wall mounting",
    tags: ["Apple TV", "Smart Home"]
  },
  {
    src: "/images/installations/samsung-tv-install.jpg",
    alt: "Samsung TV mounted on dark wall - Professional TV installation Atlanta",
    description: "Samsung smart TV mounted on feature wall with perfect alignment",
    tags: ["Samsung", "Feature Wall"]
  },
  {
    src: "/images/installations/fireplace-install-3.jpg",
    alt: "TV mounted above brick fireplace with perfect cable concealment - Fireplace TV mounting Atlanta",
    description: "Expert TV mounting above brick fireplace with elegant cable concealment",
    tags: ["Brick Fireplace", "Cable Management"]
  },
  {
    src: "/images/installations/tv-mounting-process.jpg",
    alt: "Professional installers mounting large TV on wall - TV installation team Atlanta",
    description: "Our professional team carefully mounting a large TV with precision",
    tags: ["Installation Process", "Team Work"]
  },
  {
    src: "/images/installations/bathroom-tv-install.jpg",
    alt: "Bathroom TV installation with waterproof mounting - Bathroom TV setup Atlanta",
    description: "Specialized bathroom TV installation with waterproof mounting solution",
    tags: ["Bathroom", "Specialty Install"]
  }
];

export function InstallationSlideshow() {
  return (
    <div className="flex flex-col space-y-6 mx-auto w-full max-w-7xl">
      {/* Grid of main featured images */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {installationImages.slice(0, 6).map((image, index) => (
          <Card key={index} className="overflow-hidden border border-blue-100 shadow-md h-full">
            <CardContent className="flex aspect-[4/3] items-center justify-center p-0">
              <div className="relative w-full h-full group">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end">
                  <div className="p-4 space-y-2">
                    <p className="text-white text-base font-medium">{image.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {image.tags.map((tag, tagIndex) => (
                        <Badge key={tagIndex} variant="outline" className="bg-blue-600/80 text-white border-none text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Horizontal carousel for additional images */}
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full mx-auto"
      >
        <CarouselContent>
          {installationImages.slice(6).map((image, index) => (
            <CarouselItem key={index} className="md:basis-1/3 lg:basis-1/4">
              <div className="p-2">
                <Card className="overflow-hidden border border-blue-100 shadow-md">
                  <CardContent className="flex aspect-video items-center justify-center p-0">
                    <div className="relative w-full h-full group">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end">
                        <div className="p-3 space-y-1">
                          <p className="text-white text-sm font-medium">{image.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {image.tags.map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="outline" className="bg-blue-600/80 text-white border-none text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-6 bg-white/90 hover:bg-white" />
        <CarouselNext className="hidden md:flex -right-6 bg-white/90 hover:bg-white" />
      </Carousel>
    </div>
  );
}

export function CompactGallery() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {installationImages.slice(0, 8).map((image, index) => (
        <div key={index} className="relative group overflow-hidden rounded-lg shadow-md aspect-video">
          <img
            src={image.src}
            alt={image.alt}
            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
            <div className="p-2">
              <div className="flex flex-wrap gap-1 mb-1">
                {image.tags.slice(0, 1).map((tag, tagIndex) => (
                  <Badge key={tagIndex} variant="outline" className="bg-blue-600/80 text-white border-none text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}