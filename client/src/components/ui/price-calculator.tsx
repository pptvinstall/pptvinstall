import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Separator } from "./separator"
import { Button } from "./button"
import { Trash2, Plus, Tv, Camera, BellRing, LampFloor, PowerCircle } from "lucide-react"
import { formatPrice, type ServiceOptions, pricing } from "@/lib/pricing"
import { pricingData } from "@/data/pricing-data"
import type { TVInstallation, SmartHomeInstallation } from "@/types/booking"

interface PriceCalculatorProps {
  tvs: TVInstallation[];
  smartHome: SmartHomeInstallation[];
  distance: number; // in minutes
  additionalOptions?: {
    needsUnmount?: boolean;
    needsRemount?: boolean;
    isHighRise?: boolean;
    generalLaborHours?: number;
  };
  onUpdate?: (total: number) => void;
  onRemoveService?: (type: 'tv' | 'smartHome', index: number) => void;
  onAddService?: (type: 'tv' | 'smartHome', subtype: string) => void;
}

export function PriceCalculator({ 
  tvs, 
  smartHome, 
  distance, 
  additionalOptions = {},
  onUpdate,
  onRemoveService,
  onAddService
}: PriceCalculatorProps) {
  // Calculate total number of items
  const totalItems = tvs.length + smartHome.length;
  
  // Calculate pricing based on selections
  React.useEffect(() => {
    // Use centralized pricing data as single source of truth
    const cameraPrice = pricingData.smartHome.securityCamera.price;   // $75 per camera
    const doorbellPrice = pricingData.smartHome.doorbell.price; // $85 per doorbell
    const floodlightPrice = pricingData.smartHome.floodlight.price; // $125 per floodlight
    
    // Calculate total based on services
    let totalPrice = 0;
    
    // Add TV installation prices (wire concealment is already included in basePrice)
    tvs.forEach(tv => {
      totalPrice += tv.basePrice;
    });
    
    // Removed discount calculation as requested
    
    // Add smart home device prices
    smartHome.forEach(device => {
      if (device.type === 'camera') {
        totalPrice += cameraPrice;
      } else if (device.type === 'doorbell') {
        totalPrice += doorbellPrice;
      } else if (device.type === 'floodlight') {
        totalPrice += floodlightPrice;
      }
    });
    
    // Update parent component with pricing total
    onUpdate?.(totalPrice);
  }, [tvs, smartHome, distance, onUpdate]);
  
  // Get prices for each device type from centralized pricing data
  const getPriceForDeviceType = (type: string) => {
    switch (type) {
      case 'camera':
        return pricingData.smartHome.securityCamera.price;
      case 'doorbell':
        return pricingData.smartHome.doorbell.price;
      case 'floodlight':
        return pricingData.smartHome.floodlight.price;
      default:
        return 0;
    }
  };
  
  // Calculate total for display
  const calculateTotal = () => {
    let total = 0;
    
    // Add TV installations (wire concealment is already included in basePrice)
    tvs.forEach(tv => {
      total += tv.basePrice;
    });
    
    // No discount calculation as requested
    
    // Add smart home devices
    smartHome.forEach(device => {
      if (device.type === 'camera') {
        total += pricing.smartHome.securityCamera.price;
      } else if (device.type === 'doorbell') {
        total += pricing.smartHome.doorbell.price;
      } else if (device.type === 'floodlight') {
        total += pricing.smartHome.floodlight.price;
      }
    });
    
    return total;
  };
  
  const totalAmount = calculateTotal();
  
  // Define service item type
  interface ServiceItem {
    name: string;
    description: string;
    price: number;
  }
  
  // Create service item descriptions
  const serviceDescriptions = (): ServiceItem[] => {
    const items: ServiceItem[] = [];
    
    // Add TV installations (wire concealment is included in basePrice)
    tvs.forEach((tv, index) => {
      items.push({
        name: tv.name || `TV Installation ${index + 1}`,
        description: tv.description || "Standard TV installation",
        price: tv.basePrice
      });
    });
    
    // Removed discount calculation as requested
    
    // Add camera installations
    const cameras = smartHome.filter(item => item.type === 'camera');
    if (cameras.length > 0) {
      items.push({
        name: "Smart Camera Installation",
        description: "Installation of smart camera",
        price: pricing.smartHome.securityCamera.price
      });
    }
    
    // Add doorbell installations
    const doorbells = smartHome.filter(item => item.type === 'doorbell');
    if (doorbells.length > 0) {
      items.push({
        name: "Smart Doorbell Installation",
        description: "Installation of smart doorbell",
        price: pricing.smartHome.doorbell.price
      });
    }
    
    // Add floodlight installations
    const floodlights = smartHome.filter(item => item.type === 'floodlight');
    if (floodlights.length > 0) {
      items.push({
        name: "Smart Floodlight Installation",
        description: "Installation of smart floodlight",
        price: pricing.smartHome.floodlight.price
      });
    }
    
    return items;
  };
  
  const serviceItems = serviceDescriptions();

  return (
    <Card className="price-calculator">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Pricing Summary</span>
          {totalItems > 0 && (
            <span className="text-sm font-normal">{totalItems} items</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalItems > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Display individual services */}
            <div className="space-y-4">
              {serviceItems.map((item, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="text-right">
                    <span className={`font-medium ${item.price < 0 ? 'text-green-600 text-sm' : ''}`}>
                      {item.price < 0 ? '- ' : ''}${Math.abs(item.price).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <Separator />
            
            {/* Total - Calculate directly from service items */}
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">
                ${serviceItems.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
              </span>
            </div>
            
            {/* Add More Services button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onAddService?.('smartHome', 'camera')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add More Services
            </Button>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
            <div className="rounded-full bg-muted p-3">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-sm font-medium">No services selected</div>
            <div className="text-xs text-muted-foreground">
              Add services to see pricing details
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}