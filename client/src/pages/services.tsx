import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Monitor, Cable, Tv, Package, Wrench, DoorClosed, Camera, Lightbulb, Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const tvServices = [
  {
    title: "Basic TV Mounting",
    price: "$100",
    isMostPopular: true,
    description: "Professional TV mounting with your own mount",
    features: [
      "Customer-provided mount",
      "32\"-55\" or 56\"+ TVs",
      "Level installation",
      "Basic cable management",
      "Hardware included",
      "+$50 for non-drywall surfaces (brick/concrete/stone)",
      "+$100 for outlet relocation"
    ],
    icon: Monitor
  },
  {
    title: "Standard TV Mounting",
    price: "From $150",
    description: "Professional TV mounting with mount provided by us",
    features: [
      "We provide the mount",
      "32\"-55\" or 56\"+ TVs",
      "Level installation",
      "Basic cable management",
      "Hardware included",
      "+$50 for non-drywall surfaces (brick/concrete/stone)",
      "+$100 for outlet relocation"
    ],
    icon: Monitor
  },
  {
    title: "Above Fireplace",
    price: "From $200",
    description: "Specialized mounting above fireplaces with proper heat protection",
    features: [
      "Heat-safe installation",
      "Cable concealment",
      "All mount types available",
      "Hardware included",
      "Proper angle optimization",
      "+$50 for masonry walls",
      "Contact for outlet options"
    ],
    icon: Tv
  },
  {
    title: "Ceiling Mount",
    price: "From $175",
    description: "Custom ceiling mounting solutions",
    features: [
      "Secure ceiling installation",
      "All TV sizes supported",
      "Tilt/swivel options",
      "Cable management",
      "Perfect for corners",
      "+$50 for masonry surfaces",
      "+$100 for outlet relocation"
    ],
    icon: Cable
  }
];

const smartHomeServices = [
  {
    title: "Smart Doorbell",
    price: "$85",
    description: "Professional smart doorbell installation",
    features: [
      "Proper wiring setup",
      "Brick installation (+$10)",
      "WiFi connection",
      "Testing & setup",
      "Sync with existing chime"
    ],
    icon: DoorClosed
  },
  {
    title: "Smart Camera",
    price: "From $75",
    description: "Security camera installation at any height",
    features: [
      "Secure mounting",
      "Power connection",
      "Custom height options",
      "+$25 per 4ft above 8ft",
      "WiFi setup & testing"
    ],
    icon: Camera
  },
  {
    title: "Floodlight",
    price: "$125",
    description: "Smart floodlight camera installation",
    features: [
      "Professional wiring",
      "Weatherproof installation",
      "Motion sensor setup",
      "App configuration",
      "Lighting optimization"
    ],
    icon: Lightbulb
  }
];

export default function Services() {
  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Our Services</h1>
          <p className="text-xl text-gray-600">
            Professional TV mounting, unmounting, and smart home installation solutions
          </p>
        </div>

        <div className="mb-12 max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold">TV Unmounting Service</h2>
            <p className="text-gray-600">Need to remove a mounted TV? Our professionals will handle it safely.</p>
          </div>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Package className="h-6 w-6 text-blue-500" />
                  Professional TV Unmounting
                </CardTitle>
                <div className="flex items-center">
                  <div className="bg-blue-100 p-1 px-2 rounded mr-2">
                    <p className="text-xl font-bold text-blue-700">$50</p>
                  </div>
                  <Link href="/booking">
                    <Button className="bg-blue-600 hover:bg-blue-700">Book Now</Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">Complete TV removal and wall restoration service</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Safe TV and mount removal</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Basic wall repair included</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Cable organization</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="font-medium">All TV sizes supported</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-12">
          <div>
            <h2 className="text-2xl font-semibold mb-6">TV Mounting Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {tvServices.map((service) => (
                <Card key={service.title} className={`relative ${service.isMostPopular ? 'border-2 border-blue-500 shadow-lg' : ''}`}>
                  {service.isMostPopular && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 rounded-bl-lg font-medium text-sm">
                      Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <service.icon className="h-12 w-12 text-brand-blue-500 mb-4" />
                    <CardTitle className="text-2xl">{service.title}</CardTitle>
                    <p className="text-xl font-bold text-brand-blue-500">{service.price}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{service.description}</p>
                    <ul className="space-y-2">
                      {service.features.map((feature) => (
                        <li key={feature} className="flex items-center">
                          <Package className="h-4 w-4 text-brand-blue-500 mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {service.title === "Above Fireplace" && (
                      <div className="mt-4 p-3 bg-brand-blue-50 rounded-lg text-sm text-gray-700">
                        Note: For outlet relocation above fireplaces, please send photos of your fireplace and nearby outlets for a custom quote, or schedule an in-person estimate.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator className="my-12" />

          <div>
            <h2 className="text-2xl font-semibold mb-6">Smart Home Installation</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {smartHomeServices.map((service) => (
                <Card key={service.title}>
                  <CardHeader>
                    <service.icon className="h-12 w-12 text-brand-blue-500 mb-4" />
                    <CardTitle className="text-2xl">{service.title}</CardTitle>
                    <p className="text-xl font-bold text-brand-blue-500">{service.price}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{service.description}</p>
                    <ul className="space-y-2">
                      {service.features.map((feature) => (
                        <li key={feature} className="flex items-center">
                          <Package className="h-4 w-4 text-brand-blue-500 mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link href="/booking">
            <Button size="lg" className="px-8">
              Book Your Installation
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}