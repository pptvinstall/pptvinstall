
import { useState, useEffect } from 'react';
import { calculatePricing } from './pricing';
import type { TVInstallation, SmartHomeInstallation } from '../components/ui/service-wizard';

export function usePricing(
  tvInstallations: TVInstallation[], 
  smartHomeInstallations: SmartHomeInstallation[]
) {
  const [pricing, setPricing] = useState({
    basePrice: 0,
    mountPrice: 0,
    additionalServices: 0,
    travelFee: 0,
    discounts: 0,
    total: 0
  });
  
  useEffect(() => {
    const serviceType = formatServiceType(tvInstallations, smartHomeInstallations);
    const calculatedPricing = calculatePricing(serviceType);
    setPricing(calculatedPricing);
  }, [tvInstallations, smartHomeInstallations]);
  
  return pricing;
}

function formatServiceType(
  tvInstallations: TVInstallation[], 
  smartHomeInstallations: SmartHomeInstallation[]
): string {
  const parts = [];
  
  tvInstallations.forEach((tv, index) => {
    const size = tv.size === 'large' ? '56" or larger' : '32"-55"';
    const mountType = tv.mountType !== 'none' ? ` ${tv.mountType}` : '';
    const masonry = tv.masonryWall ? ' masonry' : '';
    const outlet = tv.outletRelocation ? ' outlet' : '';
    const fireplace = tv.location === 'fireplace' ? ' fireplace' : '';
    
    parts.push(`${index + 1} TV ${size}${mountType}${masonry}${outlet}${fireplace}`);
  });
  
  smartHomeInstallations.forEach(device => {
    if (device.type === 'doorbell') {
      const brick = device.brickInstallation ? ' brick' : '';
      parts.push(`Smart Doorbell${brick}`);
    } else if (device.type === 'camera') {
      parts.push(`Smart Camera height-${device.mountHeight}`);
    } else if (device.type === 'floodlight') {
      parts.push('Floodlight');
    }
  });
  
  return parts.join(' + ');
}
