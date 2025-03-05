import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Tv, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceCustomizationWizardProps {
  onComplete?: (selectedService: string, customizations: Record<string, any>) => void;
}

const BASIC_SERVICES = [
  {
    id: 'tv-mounting',
    name: 'TV Mounting',
    description: 'Professional TV mounting service',
    basePrice: 99.99,
    icon: Tv
  },
  {
    id: 'camera-installation',
    name: 'Security Camera',
    description: 'Smart security camera installation',
    basePrice: 79.99,
    icon: Camera
  }
];

export function ServiceCustomizationWizard({ onComplete }: ServiceCustomizationWizardProps) {
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const handleSelect = (serviceId: string) => {
    if (onComplete) {
      const service = BASIC_SERVICES.find(s => s.id === serviceId);
      if (service) {
        onComplete(service.name, {
          serviceId: service.id,
          serviceName: service.name,
          basePrice: service.basePrice
        });
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key="service-selection"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          <CardHeader>
            <CardTitle>Choose Your Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BASIC_SERVICES.map(service => (
                <Card
                  key={service.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedService === service.id ?
                      "ring-2 ring-primary" :
                      "hover:bg-accent"
                  )}
                  onClick={() => {
                    setSelectedService(service.id);
                    handleSelect(service.id);
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-primary/10">
                        <service.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{service.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          ${service.basePrice.toFixed(2)}
                        </p>
                      </div>
                    </div>
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