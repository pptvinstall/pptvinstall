import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Label } from "./label";
import { Slider } from "./slider";
import { Switch } from "./switch";
import { 
  Tv, 
  Camera, 
  Bell, 
  ArrowRight, 
  ArrowLeft,
  Info
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import { cn } from "@/lib/utils";

export interface ServiceOption {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  icon: typeof Tv | typeof Camera | typeof Bell;
  customizations: CustomizationOption[];
}

interface CustomizationOption {
  id: string;
  type: 'radio' | 'slider' | 'switch' | 'input';
  label: string;
  tooltip?: string;
  options?: { value: string; label: string; price: number }[];
  min?: number;
  max?: number;
  step?: number;
  price?: number;
}

const serviceOptions: ServiceOption[] = [
  {
    id: 'tv-mounting',
    name: 'TV Mounting',
    description: 'Professional TV mounting service with clean cable management',
    basePrice: 99.99,
    icon: Tv,
    customizations: [
      {
        id: 'tv-size',
        type: 'radio',
        label: 'TV Size',
        tooltip: 'Select your TV size to ensure proper mounting hardware',
        options: [
          { value: '32-55', label: '32" - 55"', price: 0 },
          { value: '56-75', label: '56" - 75"', price: 30 },
          { value: '76-plus', label: '76" or larger', price: 50 }
        ]
      },
      {
        id: 'mount-type',
        type: 'radio',
        label: 'Mount Type',
        tooltip: 'Choose the mount type based on your viewing preferences',
        options: [
          { value: 'fixed', label: 'Fixed Mount', price: 0 },
          { value: 'tilt', label: 'Tilt Mount', price: 20 },
          { value: 'full-motion', label: 'Full Motion Mount', price: 50 }
        ]
      },
      {
        id: 'height',
        type: 'slider',
        label: 'Mounting Height (feet)',
        tooltip: 'Specify the center of TV height from floor',
        min: 3,
        max: 12,
        step: 0.5,
        price: 10
      },
      {
        id: 'cable-concealment',
        type: 'switch',
        label: 'In-wall Cable Concealment',
        tooltip: 'Hide cables inside the wall for a clean look',
        price: 49.99
      }
    ]
  },
  {
    id: 'camera-installation',
    name: 'Security Camera',
    description: 'Smart security camera installation and setup',
    basePrice: 79.99,
    icon: Camera,
    customizations: [
      {
        id: 'camera-type',
        type: 'radio',
        label: 'Camera Type',
        options: [
          { value: 'wireless', label: 'Wireless Camera', price: 0 },
          { value: 'wired', label: 'Wired Camera', price: 20 }
        ]
      },
      {
        id: 'height',
        type: 'slider',
        label: 'Installation Height (feet)',
        min: 8,
        max: 20,
        step: 1,
        price: 15
      }
    ]
  }
];

interface ServiceCustomizationWizardProps {
  onComplete?: (selectedService: string, customizations: Record<string, any>) => void;
}

export function ServiceCustomizationWizard({ onComplete }: ServiceCustomizationWizardProps) {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [customizations, setCustomizations] = useState<Record<string, any>>({});
  const [step, setStep] = useState(0);

  const calculatePrice = useCallback(() => {
    if (!selectedService) return 0;

    const service = serviceOptions.find(s => s.id === selectedService);
    if (!service) return 0;

    let total = service.basePrice;

    service.customizations.forEach(customization => {
      const value = customizations[customization.id];
      if (!value) return;

      if (customization.type === 'radio') {
        const option = customization.options?.find(opt => opt.value === value);
        if (option) total += option.price;
      } else if (customization.type === 'slider') {
        const threshold = customization.id === 'height' ? 
          (selectedService === 'tv-mounting' ? 6 : 10) : 0;
        if (value > threshold) {
          total += (value - threshold) * (customization.price || 0);
        }
      } else if (customization.type === 'switch' && value) {
        total += customization.price || 0;
      }
    });

    return total;
  }, [selectedService, customizations]);

  const currentService = selectedService ? 
    serviceOptions.find(s => s.id === selectedService) : null;

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    setCustomizations({});
    setStep(1);
  };

  const handleNext = () => {
    if (step === 0 && !selectedService) return;

    if (step === 1 && onComplete && selectedService) {
      const serviceName = serviceOptions.find(s => s.id === selectedService)?.name || selectedService;
      onComplete(serviceName, customizations);
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      setSelectedService(null);
      setCustomizations({});
    }
    setStep(prev => Math.max(0, prev - 1));
  };

  const isCustomizationComplete = () => {
    if (!currentService) return false;
    return currentService.customizations.every(customization => {
      if (customization.type === 'radio') {
        return customizations[customization.id] !== undefined;
      }
      return true;
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {step === 0 && (
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
                {serviceOptions.map(service => (
                  <Card
                    key={service.id}
                    className={cn(
                      "cursor-pointer transition-all",
                      selectedService === service.id ? 
                        "ring-2 ring-primary" : 
                        "hover:bg-accent"
                    )}
                    onClick={() => handleServiceSelect(service.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full bg-primary/10">
                          <service.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Starting at ${service.basePrice.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </motion.div>
        )}

        {step === 1 && currentService && (
          <motion.div
            key="customization"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <CardHeader>
              <CardTitle>Customize Your {currentService.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {currentService.customizations.map(customization => (
                  <div key={customization.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>{customization.label}</Label>
                      {customization.tooltip && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              {customization.tooltip}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>

                    {customization.type === 'radio' && customization.options && (
                      <RadioGroup
                        value={customizations[customization.id] || ''}
                        onValueChange={value => 
                          setCustomizations(prev => ({
                            ...prev,
                            [customization.id]: value
                          }))
                        }
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {customization.options.map(option => (
                            <div key={option.value}>
                              <RadioGroupItem
                                value={option.value}
                                id={`${customization.id}-${option.value}`}
                              />
                              <Label
                                htmlFor={`${customization.id}-${option.value}`}
                                className="ml-2"
                              >
                                {option.label}
                                {option.price > 0 && (
                                  <span className="text-sm text-muted-foreground">
                                    {" "}(+${option.price.toFixed(2)})
                                  </span>
                                )}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    )}

                    {customization.type === 'slider' && (
                      <div className="space-y-2">
                        <Slider
                          value={[customizations[customization.id] || customization.min || 0]}
                          min={customization.min}
                          max={customization.max}
                          step={customization.step}
                          onValueChange={([value]) => 
                            setCustomizations(prev => ({
                              ...prev,
                              [customization.id]: value
                            }))
                          }
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{customization.min} ft</span>
                          <span>{customizations[customization.id] || customization.min} ft</span>
                          <span>{customization.max} ft</span>
                        </div>
                      </div>
                    )}

                    {customization.type === 'switch' && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={customizations[customization.id] || false}
                          onCheckedChange={checked =>
                            setCustomizations(prev => ({
                              ...prev,
                              [customization.id]: checked
                            }))
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          (+${customization.price?.toFixed(2)})
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Price</div>
            <div className="text-lg font-semibold">${calculatePrice().toFixed(2)}</div>
          </div>
          <Button
            onClick={handleNext}
            disabled={step === 0 ? !selectedService : !isCustomizationComplete()}
          >
            {step === 1 ? 'Complete' : 'Next'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}