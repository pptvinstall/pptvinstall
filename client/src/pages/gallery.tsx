
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Star, ChevronLeft, ChevronRight, X } from "lucide-react";

interface GalleryItem {
  id: string;
  category: string;
  title: string;
  description: string;
  beforeImage: string;
  afterImage: string;
  testimonial?: {
    quote: string;
    author: string;
    rating: number;
  };
}

// This would normally be loaded from an API or database
const galleryItems: GalleryItem[] = [
  {
    id: "tv-1",
    category: "tv-mounting",
    title: "Living Room TV Installation",
    description: "65\" TV mounted on drywall with in-wall cable management and soundbar installation.",
    beforeImage: "/images/gallery/tv-before-1.jpg",
    afterImage: "/images/gallery/tv-after-1.jpg",
    testimonial: {
      quote: "The transformation is amazing! Clean installation with no visible wires.",
      author: "Michael T.",
      rating: 5
    }
  },
  {
    id: "tv-2",
    category: "tv-mounting",
    title: "Fireplace TV Mounting",
    description: "55\" TV mounted above fireplace with custom bracket and concealed wiring.",
    beforeImage: "/images/gallery/tv-before-2.jpg",
    afterImage: "/images/gallery/tv-after-2.jpg",
    testimonial: {
      quote: "Perfect placement above my fireplace. The technician was very careful with the stone surface.",
      author: "Sarah J.",
      rating: 5
    }
  },
  {
    id: "tv-3",
    category: "tv-mounting",
    title: "Entertainment Center Upgrade",
    description: "Removal of old entertainment center and wall mounting of new 75\" TV with surround sound.",
    beforeImage: "/images/gallery/tv-before-3.jpg",
    afterImage: "/images/gallery/tv-after-3.jpg"
  },
  {
    id: "smart-1",
    category: "smart-home",
    title: "Smart Doorbell Installation",
    description: "Ring doorbell installation with proper wiring and app setup.",
    beforeImage: "/images/gallery/doorbell-before-1.jpg",
    afterImage: "/images/gallery/doorbell-after-1.jpg",
    testimonial: {
      quote: "Quick and clean installation. The technician showed me how to use all the features.",
      author: "David M.",
      rating: 5
    }
  },
  {
    id: "smart-2",
    category: "smart-home",
    title: "Security Camera System",
    description: "Four-camera security system installation with central monitoring.",
    beforeImage: "/images/gallery/camera-before-1.jpg",
    afterImage: "/images/gallery/camera-after-1.jpg",
    testimonial: {
      quote: "Great coverage of my entire property. The cameras are discreet but effective.",
      author: "Robert L.",
      rating: 4
    }
  },
  {
    id: "smart-3",
    category: "smart-home",
    title: "Smart Home Hub Setup",
    description: "Complete smart home integration with lighting, security, and temperature control.",
    beforeImage: "/images/gallery/smart-before-1.jpg",
    afterImage: "/images/gallery/smart-after-1.jpg",
    testimonial: {
      quote: "Amazing system that lets me control everything from my phone. Life-changing!",
      author: "Jennifer K.",
      rating: 5
    }
  }
];

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [showBeforeImage, setShowBeforeImage] = useState(false);

  const filteredItems = activeCategory === "all" 
    ? galleryItems 
    : galleryItems.filter(item => item.category === activeCategory);

  const openLightbox = (item: GalleryItem) => {
    setLightboxItem(item);
    setShowBeforeImage(false);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxItem(null);
    document.body.style.overflow = "";
  };

  const navigateLightbox = (direction: "next" | "prev") => {
    if (!lightboxItem) return;
    
    const currentIndex = filteredItems.findIndex(item => item.id === lightboxItem.id);
    let newIndex = currentIndex;
    
    if (direction === "next") {
      newIndex = (currentIndex + 1) % filteredItems.length;
    } else {
      newIndex = (currentIndex - 1 + filteredItems.length) % filteredItems.length;
    }
    
    setLightboxItem(filteredItems[newIndex]);
    setShowBeforeImage(false);
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold text-center mb-2">Installation Gallery</h1>
      <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
        View our before and after transformations to see the quality of our work
      </p>

      <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
        <TabsList className="flex justify-center">
          <TabsTrigger value="all">All Installations</TabsTrigger>
          <TabsTrigger value="tv-mounting">TV Mounting</TabsTrigger>
          <TabsTrigger value="smart-home">Smart Home</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden group cursor-pointer" onClick={() => openLightbox(item)}>
            <div className="relative">
              <div className="h-60 relative overflow-hidden">
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-100 group-hover:opacity-0"
                  style={{ backgroundImage: `url(${item.afterImage})` }}
                ></div>
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-0 group-hover:opacity-100"
                  style={{ backgroundImage: `url(${item.beforeImage})` }}
                ></div>
                
                <div className="absolute top-0 left-0 bg-black bg-opacity-60 text-white px-3 py-1 text-sm">
                  Before
                </div>
                <div className="absolute top-0 right-0 bg-brand-blue-500 bg-opacity-80 text-white px-3 py-1 text-sm">
                  After
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent h-20"></div>
            </div>
            
            <CardContent className="relative z-10 p-4">
              <h3 className="font-bold text-lg">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {lightboxOpen && lightboxItem && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-5xl">
            <button 
              className="absolute top-4 right-4 z-10 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70"
              onClick={closeLightbox}
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-lg overflow-hidden">
              <div className="relative h-80 md:h-[500px] bg-gray-100">
                {showBeforeImage ? (
                  <img 
                    src={lightboxItem.beforeImage} 
                    alt="Before" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src={lightboxItem.afterImage} 
                    alt="After" 
                    className="w-full h-full object-cover"
                  />
                )}
                
                <div className="absolute top-4 left-4">
                  <span className="bg-black text-white text-sm px-3 py-1 rounded">
                    {showBeforeImage ? "Before" : "After"}
                  </span>
                </div>
                
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <div className="bg-black bg-opacity-70 rounded-full overflow-hidden">
                    <Button 
                      variant="ghost" 
                      className={`text-white ${showBeforeImage ? 'opacity-50' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBeforeImage(false);
                      }}
                    >
                      After
                    </Button>
                    <Button 
                      variant="ghost" 
                      className={`text-white ${!showBeforeImage ? 'opacity-50' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBeforeImage(true);
                      }}
                    >
                      Before
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="p-6 flex flex-col">
                <h2 className="text-2xl font-bold mb-2">{lightboxItem.title}</h2>
                <p className="text-gray-600 mb-4">{lightboxItem.description}</p>
                
                {lightboxItem.testimonial && (
                  <>
                    <Separator className="my-4" />
                    
                    <div className="mt-auto">
                      <h3 className="font-semibold text-lg mb-2">Customer Testimonial</h3>
                      <div className="flex text-yellow-400 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-4 w-4 ${i < lightboxItem.testimonial.rating ? "fill-current" : "stroke-current fill-transparent"}`} 
                          />
                        ))}
                      </div>
                      <p className="italic mb-2">"{lightboxItem.testimonial.quote}"</p>
                      <p className="text-sm font-medium">- {lightboxItem.testimonial.author}</p>
                    </div>
                  </>
                )}
                
                <div className="mt-6 flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateLightbox("prev");
                    }}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateLightbox("next");
                    }}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready for your transformation?</h2>
        <p className="text-gray-600 mb-6 max-w-lg mx-auto">
          Book our professional installation services and see the difference for yourself.
        </p>
        <Button size="lg" onClick={() => window.location.href = "/booking"}>
          Book Your Installation
        </Button>
      </div>
    </div>
  );
}
