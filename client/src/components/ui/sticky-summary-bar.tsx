import React from 'react';
import { Button } from './button';
import { Card } from './card';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StickyBookingSummaryProps {
  services?: Array<{
    id: string;
    name: string;
    price: number;
    type: string;
  }>;
  totalPrice: number;
  selectedServices?: any[];
  onProceed?: () => void;
  onContinue?: () => void;
  isVisible?: boolean;
  disabled?: boolean;
  className?: string;
}

export function StickyBookingSummary({
  services = [],
  totalPrice,
  selectedServices = [],
  onProceed,
  onContinue,
  isVisible = true,
  disabled = false,
  className
}: StickyBookingSummaryProps) {
  const formatPrice = (price: number) => {
    if (isNaN(price) || price === null || price === undefined) {
      return '$0';
    }
    return `$${price.toFixed(0)}`;
  };

  const activeServices = services.length > 0 ? services : selectedServices;
  const serviceCount = activeServices?.length || 0;
  const handleClick = onProceed || onContinue;

  if (!isVisible || serviceCount === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg",
      className
    )}>
      <Card className="max-w-4xl mx-auto">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-1">
                {serviceCount} service{serviceCount > 1 ? 's' : ''} selected
              </div>
              <div className="flex flex-wrap gap-2 max-w-md">
                {activeServices.slice(0, 3).map((service, index) => (
                  <span key={service.id || index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {service.name} {formatPrice(Number(service.price) || 0)}
                  </span>
                ))}
                {serviceCount > 3 && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    +{serviceCount - 3} more
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">Total</div>
                <div className="text-2xl font-bold text-blue-600">{formatPrice(totalPrice)}</div>
              </div>
              
              <Button 
                onClick={handleClick}
                disabled={disabled}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                Proceed to Date & Time
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export const StickySummaryBar = StickyBookingSummary;