import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Separator } from "./separator"
import { Switch } from "./switch"
import { Label } from "./label"
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
  onUpdate?: (total: number, deposit: number) => void;
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
    needsUnmount: additionalOptions.needsUnmount || false,
    needsRemount: additionalOptions.needsRemount || false,
    isHighRise: additionalOptions.isHighRise || false,
    generalLaborHours: additionalOptions.generalLaborHours || 0
  });

  // Calculate pricing based on selections
  const pricingData = React.useMemo(() => {
    // Convert UI data model to pricing service options
    const serviceOptions: ServiceOptions = {
      tvCount: tvs.length,
      tvMountSurface: tvs.some(tv => tv.masonryWall) ? 'nonDrywall' : 'drywall',
      isFireplace: tvs.some(tv => tv.location === 'fireplace'),
      isHighRise: options.isHighRise,
      outletCount: tvs.filter(tv => tv.outletRelocation).length,
      smartCameras: smartHome.filter(item => item.type === 'camera').reduce((sum, item) => sum + item.quantity, 0),
      smartDoorbells: smartHome.filter(item => item.type === 'doorbell').reduce((sum, item) => sum + item.quantity, 0),
      smartFloodlights: smartHome.filter(item => item.type === 'floodlight').reduce((sum, item) => sum + item.quantity, 0),
      generalLaborHours: options.generalLaborHours,
      needsUnmount: options.needsUnmount,
      needsRemount: options.needsRemount,
      travelDistance: distance
    };

    // Calculate price breakdown
    return calculatePrice(serviceOptions);
  }, [tvs, smartHome, distance, options]);

  // Calculate deposit based on complexity
  const deposit = React.useMemo(() => {
    const hasFireplace = tvs.some(tv => tv.location === 'fireplace');
    const hasLargeTV = tvs.some(tv => tv.size === 'large');
    const hasComplexInstall = hasFireplace || hasLargeTV || tvs.length > 1 || smartHome.length > 0;
    return hasComplexInstall ? 75 : 50;
  }, [tvs, smartHome]);

  // Update parent component with pricing data
  React.useEffect(() => {
    onUpdate?.(pricingData.total, deposit);
  }, [pricingData.total, deposit, onUpdate]);

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

          {/* Additional options that the user can toggle */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg">Additional Options</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="high-rise">High-Rise Building / Steel Studs</Label>
                  <p className="text-sm text-muted-foreground">
                    Additional {formatPrice(pricing.tvMounting.highRise)} for specialized anchors and drill bits
                  </p>
                </div>
                <Switch
                  id="high-rise"
                  checked={options.isHighRise}
                  onCheckedChange={(checked) => {
                    setOptions(prev => ({ ...prev, isHighRise: checked }));
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="unmount">TV Unmounting</Label>
                  <p className="text-sm text-muted-foreground">
                    Additional {formatPrice(pricing.tvMounting.unmount)} to remove an existing TV
                  </p>
                </div>
                <Switch
                  id="unmount"
                  checked={options.needsUnmount}
                  onCheckedChange={(checked) => {
                    setOptions(prev => ({ ...prev, needsUnmount: checked }));
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="remount">TV Remounting</Label>
                  <p className="text-sm text-muted-foreground">
                    Additional {formatPrice(pricing.tvMounting.remount)} if the mount is already on the wall
                  </p>
                </div>
                <Switch
                  id="remount"
                  checked={options.needsRemount}
                  onCheckedChange={(checked) => {
                    setOptions(prev => ({ ...prev, needsRemount: checked }));
                  }}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Total and deposit */}
          <div className="space-y-2">
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Total</span>
              <span>{formatPrice(pricingData.total)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Required Deposit</span>
              <span>{formatPrice(deposit)}</span>
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