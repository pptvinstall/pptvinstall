import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Tv, Camera, Shield, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";

interface ServiceCustomizationWizardProps {
  onComplete?: (selectedService: string, customizations: Record<string, any>) => void;
  isLoading?: boolean;
}

const BASIC_SERVICES = [
  {
    id: 'tv-mounting',
    name: 'TV Mounting',
    description: 'Professional TV mounting service',
    basePrice: 99.99,
    icon: Tv,
    features: ['Wall bracket included', 'Cable management', 'Level guarantee']
  },
  {
    id: 'camera-installation',
    name: 'Security Camera',
    description: 'Smart security camera installation',
    basePrice: 79.99,
    icon: Camera,
    features: ['WiFi setup', 'Mobile app configuration', '24/7 recording setup']
  }
];

export function ServiceCustomizationWizard({ onComplete, isLoading }: ServiceCustomizationWizardProps) {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (serviceId: string) => {
    try {
      setError(null);
      const service = BASIC_SERVICES.find(s => s.id === serviceId);
      if (!service) {
        throw new Error('Invalid service selected');
      }

      setSelectedService(service.id);

      if (onComplete) {
        onComplete(service.name, {
          serviceId: service.id,
          serviceName: service.name,
          basePrice: service.basePrice,
          features: service.features
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Service selection error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key="service-selection"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Choose Your Service</CardTitle>
            {error && (
              <div className="mt-2 text-red-500 flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {BASIC_SERVICES.map(service => (
                <Card
                  key={service.id}
                  className={cn(
                    "cursor-pointer transition-all transform hover:scale-102 hover:shadow-lg",
                    selectedService === service.id
                      ? "ring-2 ring-primary shadow-md"
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => handleSelect(service.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-full bg-primary/10">
                        <service.icon className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{service.name}</h3>
                        <p className="text-lg font-medium text-primary">
                          ${service.basePrice.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-4">{service.description}</p>
                    <ul className="space-y-2">
                      {service.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Shield className="w-4 h-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}