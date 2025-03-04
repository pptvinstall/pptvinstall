import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Monitor, Cable, Tv, Package, Wrench, DoorClosed, Camera, Lightbulb } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const tvServices = [
  {
    title: "Standard TV Mounting",
    price: "From $100",
    description: "Professional TV mounting on standard walls",
    features: [
      "32\"-55\" or 56\"+ TVs",
      "Level installation",
      "Basic cable management",
      "Mount options available",
      "Hardware included",
      "+$50 for masonry walls",
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
    price: "From $75",
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
    price: "$100",
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
            Professional TV mounting and smart home installation solutions
          </p>
        </div>

        <div className="space-y-12">
          <div>
            <h2 className="text-2xl font-semibold mb-6">TV Mounting Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {tvServices.map((service) => (
                <Card key={service.title} className="relative">
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