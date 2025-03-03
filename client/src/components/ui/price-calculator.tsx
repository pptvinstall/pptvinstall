import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Separator } from "./separator"
import type { TVInstallation, SmartHomeInstallation } from "./service-wizard"

interface PriceCalculatorProps {
  tvs: TVInstallation[];
  smartHome: SmartHomeInstallation[];
  distance: number;
  onUpdate?: (total: number, deposit: number) => void;
}

export function PriceCalculator({ tvs, smartHome, distance, onUpdate }: PriceCalculatorProps) {
  const pricing = React.useMemo(() => {
    const items = [
      // TV Installations
      ...tvs.map((installation, index) => {
        const basePrice = installation.location === 'standard' ? 100 :
                         installation.location === 'fireplace' ? 200 :
                         installation.location === 'ceiling' ? 175 : 0;

        const mountPrice = installation.mountType === 'fixed' ? (installation.size === 'small' ? 40 : 60) :
                          installation.mountType === 'tilt' ? (installation.size === 'small' ? 50 : 70) :
                          installation.mountType === 'fullMotion' ? (installation.size === 'small' ? 80 : 100) : 0;

        return {
          description: `TV ${index + 1} (${installation.size === 'small' ? '32"-55"' : '56" or larger'})`,
          items: [
            {
              label: `Base Installation (${installation.location})`,
              price: basePrice
            },
            ...(mountPrice > 0 ? [{
              label: `${installation.mountType} Mount`,
              price: mountPrice
            }] : [])
          ]
        };
      }),

      // Smart Home Installations
      ...smartHome.map((installation) => {
        const basePrice = installation.type === 'doorbell' ? 75 :
                         installation.type === 'floodlight' ? 100 : 75;

        const items = [{
          label: `Base Installation (${installation.quantity} unit${installation.quantity > 1 ? 's' : ''})`,
          price: basePrice * installation.quantity
        }];

        if (installation.type === 'doorbell' && installation.brickInstallation) {
          items.push({
            label: 'Brick Installation',
            price: 10 * installation.quantity
          });
        }

        if (installation.type === 'camera' && installation.mountHeight && installation.mountHeight > 8) {
          const additionalHeight = installation.mountHeight - 8;
          const additionalFee = Math.ceil(additionalHeight / 4) * 25;
          items.push({
            label: `Height Fee (${installation.mountHeight}ft)`,
            price: additionalFee * installation.quantity
          });
        }

        return {
          description: installation.type === 'doorbell' ? 'Smart Doorbell' :
                      installation.type === 'floodlight' ? 'Floodlight' :
                      'Smart Camera',
          items
        };
      })
    ];

    // Calculate multi-TV discounts
    const multiTvDiscount = tvs.length > 1 ? (tvs.length - 1) * 10 : 0;
    const multiMountDiscount = tvs.filter(i => i.mountType !== 'none').length > 1 ? 
      (tvs.filter(i => i.mountType !== 'none').length - 1) * 5 : 0;

    // Calculate travel fee
    const travelFee = distance > 20 ? (distance - 20) * 1 : 0;

    // Calculate subtotal
    const subtotal = items.reduce((sum, group) => 
      sum + group.items.reduce((groupSum, item) => groupSum + item.price, 0)
    , 0);

    // Calculate total with discounts and fees
    const total = subtotal - multiTvDiscount - multiMountDiscount + travelFee;

    // Calculate deposit based on complexity
    const hasFireplace = tvs.some(i => i.location === 'fireplace');
    const hasLargeTV = tvs.some(i => i.size === 'large');
    const deposit = hasFireplace || hasLargeTV || tvs.length > 1 || smartHome.length > 0 ? 75 : 20;

    return {
      items,
      multiTvDiscount,
      multiMountDiscount,
      travelFee,
      total,
      deposit
    };
  }, [tvs, smartHome, distance]);

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
          {pricing.items.map((group, index) => (
            <div key={index} className="space-y-2">
              <div className="font-medium">{group.description}</div>
              <div className="pl-4 space-y-1">
                {group.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex justify-between text-sm">
                    <span>{item.label}</span>
                    <span>${item.price}</span>
                  </div>
                ))}
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