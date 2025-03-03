import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Separator } from "./separator"
import { calculatePrice, type ServiceOptions } from "@/lib/pricing"

interface PriceCalculatorProps {
  options: Partial<ServiceOptions>;
  onUpdate?: (total: number, deposit: number) => void;
}

export function PriceCalculator({ options, onUpdate }: PriceCalculatorProps) {
  const defaultOptions: ServiceOptions = {
    tvSize: 'small',
    mountType: 'none',
    location: 'standard',
    wireConcealment: false,
    additionalTvs: 0,
    soundbar: 'none',
    shelves: 0,
    distance: 0,
  };

  const pricing = calculatePrice({ ...defaultOptions, ...options });

  React.useEffect(() => {
    onUpdate?.(pricing.total, pricing.deposit);
  }, [pricing.total, pricing.deposit, onUpdate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Base Installation</span>
              <span>${pricing.basePrice}</span>
            </div>
            
            {pricing.mountPrice > 0 && (
              <div className="flex justify-between">
                <span>TV Mount</span>
                <span>${pricing.mountPrice}</span>
              </div>
            )}
            
            {pricing.additionalServices > 0 && (
              <div className="flex justify-between">
                <span>Additional Services</span>
                <span>${pricing.additionalServices}</span>
              </div>
            )}
            
            {pricing.discounts > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Multi-TV Discount</span>
                <span>-${pricing.discounts}</span>
              </div>
            )}
            
            {pricing.travelFee > 0 && (
              <div className="flex justify-between">
                <span>Travel Fee</span>
                <span>${pricing.travelFee}</span>
              </div>
            )}
          </div>

          <Separator />
          
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>${pricing.total}</span>
          </div>
          
          <div className="mt-4 bg-muted/50 p-4 rounded-lg">
            <div className="text-sm">
              <div className="flex justify-between">
                <span>Required Deposit</span>
                <span>${pricing.deposit}</span>
              </div>
              <p className="text-muted-foreground mt-2">
                Deposit is required to secure your booking and will be deducted from the total amount.
              </p>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
