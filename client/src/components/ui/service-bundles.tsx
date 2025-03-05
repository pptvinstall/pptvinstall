
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Info, Monitor, Shield, Tv, Home, Zap, Lock, Award, ThumbsUp, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Animation variants for hover effects
const cardVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }
};

// Animation variants for feature items
const featureVariants = {
  initial: { opacity: 0, y: 10 },
  animate: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: custom * 0.1 }
  })
};

interface Bundle {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  services: string[];
  originalPrice: number;
  discountedPrice: number;
  popular?: boolean;
}

const bundles: Bundle[] = [
  {
    id: "basic-tv",
    title: "Basic TV Setup",
    icon: <Tv className="h-8 w-8 text-brand-blue-500" />,
    description: "Perfect for a single TV installation with clean cable management",
    services: [
      "Single TV Wall Mounting",
      "Basic Cable Management",
      "TV Setup & Configuration"
    ],
    originalPrice: 125,
    discountedPrice: 99
  },
  {
    id: "home-theater",
    title: "Home Theater Bundle",
    icon: <Monitor className="h-8 w-8 text-brand-blue-500" />,
    description: "Complete entertainment setup with TV and sound system",
    services: [
      "TV Wall Mounting",
      "Soundbar Installation",
      "Full Cable Management",
      "Streaming Device Setup"
    ],
    originalPrice: 250,
    discountedPrice: 199,
    popular: true
  },
  {
    id: "smart-home-starter",
    title: "Smart Home Starter",
    icon: <Home className="h-8 w-8 text-brand-blue-500" />,
    description: "Get started with essential smart home devices",
    services: [
      "Smart Doorbell Installation",
      "2 Smart Camera Installations",
      "Smart Hub Configuration",
      "Mobile App Setup"
    ],
    originalPrice: 325,
    discountedPrice: 249
  },
  {
    id: "security-bundle",
    title: "Security Package",
    icon: <Shield className="h-8 w-8 text-brand-blue-500" />,
    description: "Comprehensive home security installation",
    services: [
      "Smart Doorbell Installation",
      "3 Security Camera Installations",
      "Floodlight Camera Installation",
      "Security System Configuration"
    ],
    originalPrice: 400,
    discountedPrice: 299
  },
  {
    id: "multi-tv",
    title: "Multi-TV Package",
    icon: <Tv className="h-8 w-8 text-brand-blue-500" />,
    description: "Perfect for mounting multiple TVs throughout your home",
    services: [
      "3 TV Wall Mountings",
      "Full Cable Management",
      "TV Setup & Configuration"
    ],
    originalPrice: 375,
    discountedPrice: 275
  },
  {
    id: "complete-smart-home",
    title: "Complete Smart Home",
    icon: <Zap className="h-8 w-8 text-brand-blue-500" />,
    description: "Full smart home transformation with multiple devices",
    services: [
      "Smart Doorbell Installation",
      "4 Smart Camera Installations",
      "Smart Lock Installation",
      "Smart Thermostat Setup",
      "Smart Lighting Configuration"
    ],
    originalPrice: 575,
    discountedPrice: 449
  }
];

interface ServiceBundlesProps {
  onSelectBundle: (bundleId: string, services: string) => void;
}

export function ServiceBundles({ onSelectBundle }: ServiceBundlesProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const handleToggleExpand = (bundleId: string) => {
    setExpandedCard(expandedCard === bundleId ? null : bundleId);
  };

  const handleSelectBundle = (bundle: Bundle) => {
    // Convert bundle services to service string for booking system
    const serviceString = bundle.services.join(' + ');
    onSelectBundle(bundle.id, serviceString);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Service Packages</h2>
        <p className="text-gray-600">
          Save money with our pre-configured service bundles
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bundles.map((bundle) => (
          <Card 
            key={bundle.id} 
            className={`relative flex flex-col transition-all ${
              expandedCard === bundle.id ? "shadow-lg border-brand-blue-400" : ""
            } hover:shadow-md`}
          >
            {bundle.popular && (
              <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                <Badge className="bg-brand-blue-500">Most Popular</Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {bundle.icon}
                  <CardTitle>{bundle.title}</CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="px-2" 
                  onClick={() => handleToggleExpand(bundle.id)}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="mt-2">
                {bundle.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="space-y-2">
                {bundle.services.map((service, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-1" />
                    <span>{service}</span>
                  </li>
                ))}
              </ul>
              
              {expandedCard === bundle.id && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm">
                  <p className="font-medium text-gray-700">Bundle Details:</p>
                  <p className="text-gray-600">
                    This package includes all necessary hardware mounting, installation, 
                    and configuration. You provide the devices, and we'll handle the complete 
                    professional installation.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col items-stretch pt-2">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-gray-500 line-through text-sm mr-2">
                    ${bundle.originalPrice}
                  </span>
                  <span className="text-2xl font-bold text-brand-blue-600">
                    ${bundle.discountedPrice}
                  </span>
                </div>
                <span className="text-green-600 text-sm font-medium">
                  Save ${bundle.originalPrice - bundle.discountedPrice}
                </span>
              </div>
              <Button 
                className="w-full" 
                onClick={() => handleSelectBundle(bundle)}
              >
                Select Package
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
