import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Monitor, Cable, Tv, Package, Wrench } from "lucide-react";

const services = [
  {
    title: "Basic TV Mounting",
    price: "Starting at $99",
    description: "Wall mounting for TVs up to 65\", bracket included",
    features: [
      "Professional mounting",
      "Bracket included",
      "Level installation",
      "Basic cable management"
    ],
    icon: Monitor
  },
  {
    title: "Premium Installation",
    price: "Starting at $149",
    description: "Complete mounting solution with cable concealment",
    features: [
      "Everything in Basic",
      "In-wall cable concealment",
      "Power bridge installation",
      "Cable channel if needed"
    ],
    icon: Cable
  },
  {
    title: "Custom Solutions",
    price: "Custom Quote",
    description: "Special mounting needs and commercial installations",
    features: [
      "Above fireplace mounting",
      "Custom bracket solutions",
      "Multiple TV installations",
      "Commercial projects"
    ],
    icon: Wrench
  }
];

export default function Services() {
  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Our Services</h1>
          <p className="text-xl text-gray-600">
            Professional TV mounting solutions for every need
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {services.map((service) => (
            <Card key={service.title}>
              <CardHeader>
                <service.icon className="h-12 w-12 text-primary mb-4" />
                <CardTitle className="text-2xl">{service.title}</CardTitle>
                <p className="text-xl font-bold text-primary">{service.price}</p>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <ul className="space-y-2">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Package className="h-4 w-4 text-primary mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link href="/booking">
            <Button size="lg">
              Book Your Installation
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}