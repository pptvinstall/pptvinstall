import { useState, useEffect } from 'react';
import { calculatePrice, type ServiceOptions } from './pricing';
// Import formatPrice function from pricing module - removing the duplicate local definition
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
  travelDistance?: number; // in minutes
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
    // Separate TV installations and unmounting-only services
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
      unmountOnlyCount: unmountOnlyCount, // Include unmount-only count
      remountOnlyCount: remountOnlyCount, // Include remount-only count
      travelDistance: options.travelDistance || 0
    };

    // Calculate pricing
    const calculatedPricing = calculatePrice(serviceOptions);

    // Format currency values
    setPricingResult({
      ...calculatedPricing,
      formattedTotal: formatPrice(calculatedPricing.total),
      formattedBasePrice: formatPrice(calculatedPricing.basePrice)
    });
  }, [tvInstallations, smartHomeInstallations, options]);

  return pricingResult;
}

// Utility function to create a human-readable service description from installations
export function createServiceDescription(
  tvInstallations: TVInstallation[], 
  smartHomeInstallations: SmartHomeInstallation[]
): string {
  const parts: string[] = [];

  // Process TV installations
  if (tvInstallations.length > 0) {
    // Separate specialized services from regular TV installations
    const unmountOnlyTvs = tvInstallations.filter(tv => tv.isUnmountOnly);
    const remountOnlyTvs = tvInstallations.filter(tv => tv.isRemountOnly);
    const mountingTvs = tvInstallations.filter(tv => !tv.isUnmountOnly && !tv.isRemountOnly);

    // Handle regular TV mounting services
    if (mountingTvs.length > 0) {
      const tvParts = mountingTvs.map((tv, index) => {
        let description = `TV ${index + 1}: ${tv.size === 'large' ? '56" or larger' : '32"-55"'}`;

        if (tv.location === 'fireplace') {
          description += ' - Fireplace Mount';
        } else if (tv.location === 'ceiling') {
          description += ' - Ceiling Mount';
        } else {
          description += ' - Standard Mount';
        }

        if (tv.mountType !== 'none') {
          description += ` (${tv.mountType})`;
        }

        if (tv.masonryWall) {
          description += ' - Non-Drywall Surface';
        }

        if (tv.highRise) {
          description += ' - High-Rise/Steel Studs';
        }

        if (tv.outletRelocation) {
          description += ' with Outlet Installation';
        }

        if (tv.unmount) {
          description += ' + Unmounting';
        }

        if (tv.remount) {
          description += ' + Remounting';
        }

        return description;
      });

      parts.push(tvParts.join(', '));
    }

    // Handle unmount-only services
    if (unmountOnlyTvs.length > 0) {
      const unmountText = unmountOnlyTvs.length === 1 
        ? 'TV Unmounting Only' 
        : `TV Unmounting Only (${unmountOnlyTvs.length} TVs)`;
      parts.push(unmountText);
    }

    // Handle remount-only services
    if (remountOnlyTvs.length > 0) {
      const remountText = remountOnlyTvs.length === 1 
        ? 'TV Remounting Only' 
        : `TV Remounting Only (${remountOnlyTvs.length} TVs)`;
      parts.push(remountText);
    }
  }

  // Process Smart Home installations
  const smartHomeMap = {
    camera: { name: 'Smart Camera', details: (item: SmartHomeInstallation) => 
      item.mountHeight && item.mountHeight > 8 ? ` at ${item.mountHeight}ft` : '' 
    },
    doorbell: { name: 'Smart Doorbell', details: (item: SmartHomeInstallation) => 
      item.brickInstallation ? ' on Brick' : '' 
    },
    floodlight: { name: 'Smart Floodlight', details: () => '' }
  };

  // Group similar smart home items
  const smartHomeGroups = smartHomeInstallations.reduce((groups, item) => {
    if (!groups[item.type]) {
      groups[item.type] = [];
    }
    groups[item.type].push(item);
    return groups;
  }, {} as Record<string, SmartHomeInstallation[]>);

  // Format each smart home group
  Object.entries(smartHomeGroups).forEach(([type, items]) => {
    if (items.length === 0) return;

    const typeKey = type as keyof typeof smartHomeMap;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    if (totalQuantity === 0) return;

    const itemDetails = items.map(item => {
      if (item.quantity <= 0) return '';
      return `${smartHomeMap[typeKey].name}${item.quantity > 1 ? ` (×${item.quantity})` : ''}${smartHomeMap[typeKey].details(item)}`;
    }).filter(Boolean);

    if (itemDetails.length > 0) {
      parts.push(itemDetails.join(', '));
    }
  });

  return parts.join('; ');
}

// Export formatPrice function from pricing module
export { formatPrice } from './pricing';