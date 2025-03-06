import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Separator } from "./separator"
import { pricing, calculatePrice, formatPrice, type ServiceOptions } from "@/lib/pricing"
import type { TVInstallation, SmartHomeInstallation } from "./service-wizard"

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
}

export function PriceCalculator({ 
  tvs, 
  smartHome, 
  distance, 
  additionalOptions = {},
  onUpdate 
}: PriceCalculatorProps) {
  // Keep track of user-toggled options
  const [options, setOptions] = React.useState({
    generalLaborHours: additionalOptions.generalLaborHours || 0
  });

  // Calculate pricing based on selections
  const pricingData = React.useMemo(() => {
    // Count different TV service types separately
    const mountingTvs = tvs.filter(tv => !tv.isUnmountOnly && !tv.isRemountOnly);
    const unmountOnlyCount = tvs.filter(tv => tv.isUnmountOnly).length;
    const remountOnlyCount = tvs.filter(tv => tv.isRemountOnly).length;

    // Convert UI data model to pricing service options
    const serviceOptions: ServiceOptions = {
      tvCount: mountingTvs.length,
      tvMountSurface: mountingTvs.some(tv => tv.masonryWall) ? 'nonDrywall' : 'drywall',
      isFireplace: mountingTvs.some(tv => tv.location === 'fireplace'),
      isHighRise: mountingTvs.some(tv => tv.highRise),
      outletCount: mountingTvs.filter(tv => tv.outletRelocation).length,
      smartCameras: smartHome.filter(item => item.type === 'camera').reduce((sum, item) => sum + item.quantity, 0),
      smartDoorbells: smartHome.filter(item => item.type === 'doorbell').reduce((sum, item) => sum + item.quantity, 0),
      smartFloodlights: smartHome.filter(item => item.type === 'floodlight').reduce((sum, item) => sum + item.quantity, 0),
      generalLaborHours: options.generalLaborHours,
      needsUnmount: mountingTvs.some(tv => tv.unmount),
      needsRemount: mountingTvs.some(tv => tv.remount),
      unmountOnlyCount: unmountOnlyCount, // Pass the count of unmount-only TVs
      remountOnlyCount: remountOnlyCount, // Pass the count of remount-only TVs
      travelDistance: distance
    };

    // Calculate price breakdown
    return calculatePrice(serviceOptions);
  }, [tvs, smartHome, distance, options]);

  // Update parent component with pricing data
  React.useEffect(() => {
    onUpdate?.(pricingData.total);
  }, [pricingData.total, onUpdate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Display price breakdown by category */}
          {pricingData.breakdown.map((category, index) => (
            <div key={index} className="space-y-3">
              <h3 className="font-medium text-lg">{category.category}</h3>
              <div className="space-y-1">
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} className={`flex justify-between items-center ${item.isDiscount ? "text-green-600" : ""}`}>
                    <span>{item.name}</span>
                    <span>{formatPrice(item.price)}</span>
                  </div>
                ))}
              </div>
              {index < pricingData.breakdown.length - 1 && <Separator />}
            </div>
          ))}

          <Separator />

          {/* Total without deposit */}
          <div className="space-y-2">
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Total</span>
              <span>{formatPrice(pricingData.total)}</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground italic">
            * Prices are estimates. Final pricing may vary based on site conditions.
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}