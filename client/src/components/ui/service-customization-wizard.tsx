import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Tv, Camera, Shield, AlertCircle, ArrowRight } from "lucide-react";
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
    description: 'Professional TV mounting service with expert cable management',
    basePrice: 99.99,
    icon: Tv,
    features: ['Wall bracket included', 'Cable management', 'Level guarantee', 'Cable concealment']
  },
  {
    id: 'camera-installation',
    name: 'Security Camera',
    description: 'Smart security camera installation with full setup',
    basePrice: 79.99,
    icon: Camera,
    features: ['WiFi setup', 'Mobile app configuration', '24/7 recording setup', 'Motion detection']
  }
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  },
  exit: { opacity: 0, y: -20 }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

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
        <LoadingSpinner size="lg" text="Loading available services..." />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key="service-selection"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <CardHeader className="text-center mb-6">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-brand-blue-500 to-brand-blue-700 bg-clip-text text-transparent">
              Choose Your Service
            </CardTitle>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-red-500 flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </motion.div>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {BASIC_SERVICES.map((service, index) => (
                <motion.div
                  key={service.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={cn(
                      "cursor-pointer transition-all transform hover:shadow-lg border-2",
                      selectedService === service.id
                        ? "border-brand-blue-500 shadow-md bg-brand-blue-50/50"
                        : "border-transparent hover:border-brand-blue-200"
                    )}
                    onClick={() => handleSelect(service.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-full bg-brand-blue-100">
                          <service.icon className="w-8 h-8 text-brand-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold">{service.name}</h3>
                          <p className="text-lg font-medium text-brand-blue-600">
                            ${service.basePrice.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-4">{service.description}</p>
                      <motion.ul className="space-y-2">
                        {service.features.map((feature, index) => (
                          <motion.li 
                            key={index}
                            variants={itemVariants}
                            className="flex items-center gap-2 text-sm text-gray-700"
                          >
                            <Shield className="w-4 h-4 text-brand-blue-500" />
                            {feature}
                          </motion.li>
                        ))}
                      </motion.ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}