import { useState, useEffect } from 'react';
import { calculatePrice, type ServiceOptions } from './pricing';
import { formatPrice } from './pricing';
import type { TVInstallation, SmartHomeInstallation } from '../components/ui/service-wizard';

interface UsePricingResult {
  total: number;
  basePrice: number;
  additionalServices: number;
  discounts: number;
  travelFee: number;
  formattedTotal: string;
  formattedBasePrice: string;
  breakdown: Array<{
    category: string;
    items: Array<{
      name: string;
      price: number;
      isDiscount?: boolean;
    }>;
  }>;
}

interface UsePricingOptions {
  includeUnmount?: boolean;
  includeRemount?: boolean;
  isHighRise?: boolean;
  generalLaborHours?: number;
  travelDistance?: number;
}

export function usePricing(
  tvInstallations: TVInstallation[], 
  smartHomeInstallations: SmartHomeInstallation[],
  options: UsePricingOptions = {}
): UsePricingResult {
  const [pricingResult, setPricingResult] = useState<UsePricingResult>({
    total: 0,
    basePrice: 0,
    additionalServices: 0,
    discounts: 0,
    travelFee: 0,
    formattedTotal: formatPrice(0),
    formattedBasePrice: formatPrice(0),
    breakdown: []
  });

  useEffect(() => {
    // Separate TV installations by type
    const mountingTvs = tvInstallations.filter(tv => !tv.isUnmountOnly && !tv.isRemountOnly);
    const unmountOnlyCount = tvInstallations.filter(tv => tv.isUnmountOnly).length;
    const remountOnlyCount = tvInstallations.filter(tv => tv.isRemountOnly).length;

    // Convert installation data to service options format
    const serviceOptions: ServiceOptions = {
      tvCount: mountingTvs.length,
      tvMountSurface: mountingTvs.some(tv => tv.masonryWall) ? 'nonDrywall' : 'drywall',
      isFireplace: mountingTvs.some(tv => tv.location === 'fireplace'),
      isHighRise: options.isHighRise || mountingTvs.some(tv => tv.highRise),
      outletCount: mountingTvs.filter(tv => tv.outletRelocation).length,
      smartCameras: smartHomeInstallations.filter(item => item.type === 'camera')
                     .reduce((sum, item) => sum + item.quantity, 0),
      smartDoorbells: smartHomeInstallations.filter(item => item.type === 'doorbell')
                       .reduce((sum, item) => sum + item.quantity, 0),
      smartFloodlights: smartHomeInstallations.filter(item => item.type === 'floodlight')
                         .reduce((sum, item) => sum + item.quantity, 0),
      generalLaborHours: options.generalLaborHours || 0,
      needsUnmount: options.includeUnmount || mountingTvs.some(tv => tv.unmount),
      needsRemount: options.includeRemount || mountingTvs.some(tv => tv.remount),
      unmountOnlyCount,
      remountOnlyCount,
      travelDistance: options.travelDistance || 0,
      installation: {
        mountHeight: smartHomeInstallations.find(item => item.type === 'camera')?.mountHeight || 0,
        brickInstallation: smartHomeInstallations.find(item => item.type === 'doorbell')?.brickInstallation || false
      }
    };

    // Calculate pricing
    const calculatedPricing = calculatePrice(serviceOptions);

    // Update state with calculated values
    setPricingResult({
      ...calculatedPricing,
      formattedTotal: formatPrice(calculatedPricing.total),
      formattedBasePrice: formatPrice(calculatedPricing.basePrice)
    });
  }, [tvInstallations, smartHomeInstallations, options]);

  return pricingResult;
}

export { formatPrice } from './pricing';