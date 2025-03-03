import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Separator } from "./separator"
import { calculatePrice } from "@/lib/pricing"
import type { TVInstallation } from "./service-wizard"

interface PriceCalculatorProps {
  installations: TVInstallation[];
  distance: number;
  onUpdate?: (total: number, deposit: number) => void;
}

export function PriceCalculator({ installations, distance, onUpdate }: PriceCalculatorProps) {
  const pricing = React.useMemo(() => {
    const items = installations.map((installation, index) => {
      const basePrice = installation.location === 'standard' ? 100 :
                       installation.location === 'fireplace' ? 200 :
                       installation.location === 'ceiling' ? 175 : 0;

      const mountPrice = installation.mountType === 'fixed' ? (installation.size === 'small' ? 40 : 60) :
                        installation.mountType === 'tilt' ? (installation.size === 'small' ? 50 : 70) :
                        installation.mountType === 'fullMotion' ? (installation.size === 'small' ? 80 : 100) : 0;

      return {
        description: `TV ${index + 1} (${installation.size === 'small' ? 'Under 55"' : '56" or larger'})`,
        location: installation.location,
        basePrice,
        mountPrice,
      };
    });

    const multiTvDiscount = installations.length > 1 ? (installations.length - 1) * 10 : 0;
    const multiMountDiscount = installations.filter(i => i.mountType !== 'none').length > 1 ? 
      (installations.filter(i => i.mountType !== 'none').length - 1) * 5 : 0;

    const travelFee = distance > 20 ? (distance - 20) * 1 : 0;

    const subtotal = items.reduce((sum, item) => sum + item.basePrice + item.mountPrice, 0);
    const total = subtotal - multiTvDiscount - multiMountDiscount + travelFee;

    // Calculate deposit based on complexity
    const hasFireplace = installations.some(i => i.location === 'fireplace');
    const hasLargeTV = installations.some(i => i.size === 'large');
    const deposit = hasFireplace || hasLargeTV ? 75 : 20;

    return {
      items,
      multiTvDiscount,
      multiMountDiscount,
      travelFee,
      total,
      deposit
    };
  }, [installations, distance]);

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
          {pricing.items.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="font-medium">{item.description}</div>
              <div className="pl-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Base Installation ({item.location})</span>
                  <span>${item.basePrice}</span>
                </div>
                {item.mountPrice > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>TV Mount</span>
                    <span>${item.mountPrice}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          <Separator />

          {pricing.multiTvDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Multi-TV Discount</span>
              <span>-${pricing.multiTvDiscount}</span>
            </div>
          )}

          {pricing.multiMountDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Multi-Mount Discount</span>
              <span>-${pricing.multiMountDiscount}</span>
            </div>
          )}

          {pricing.travelFee > 0 && (
            <div className="flex justify-between">
              <span>Travel Fee ({distance} miles)</span>
              <span>${pricing.travelFee}</span>
            </div>
          )}

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