import { useState, useEffect } from 'react';
import { calculatePrice } from './pricing';
import type { TVInstallation, SmartHomeInstallation } from '../components/ui/service-wizard';

interface PricingState {
  basePrice: number;
  mountPrice: number;
  additionalServices: number;
  travelFee: number;
  discounts: number;
  total: number;
}

export function usePricing(
  tvInstallations: TVInstallation[], 
  smartHomeInstallations: SmartHomeInstallation[]
): PricingState {
  const [pricing, setPricing] = useState<PricingState>({
    basePrice: 0,
    mountPrice: 0,
    additionalServices: 0,
    travelFee: 0,
    discounts: 0,
    total: 0
  });

  useEffect(() => {
    const serviceType = formatServiceType(tvInstallations, smartHomeInstallations);
    const calculatedPricing = calculatePrice(serviceType);
    setPricing(calculatedPricing);
  }, [tvInstallations, smartHomeInstallations]);

  return pricing;
}

function formatServiceType(
  tvInstallations: TVInstallation[], 
  smartHomeInstallations: SmartHomeInstallation[]
): string {
  const parts: string[] = [];

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

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

interface ParsedServiceResult {
  services: string[];
  price: number;
  serviceBreakdown: ServiceBreakdown[];
}

interface ServiceBreakdown {
  title: string;
  items: {
    label: string;
    price: number;
    isDiscount?: boolean;
  }[];
}

export function parseServiceType(serviceType: string): ParsedServiceResult {
  const serviceParts = serviceType.split(' + ');
  let totalPrice = 0;
  const services: string[] = [];
  let tvCount = 0;

  serviceParts.forEach(part => {
    if (part.includes('TV')) {
      const tvMatch = part.match(/(\d+)\s*TV/);
      tvCount += tvMatch ? parseInt(tvMatch[1]) : 1;
    }
  });

  const serviceBreakdown: ServiceBreakdown[] = [];

  for (const part of serviceParts) {
    const trimmedPart = part.trim();

    if (trimmedPart.includes('TV')) {
      const tvMatch = trimmedPart.match(/(\d+)\s*TV/);
      const count = tvMatch ? parseInt(tvMatch[1]) : 1;
      const isLarge = trimmedPart.toLowerCase().includes('56"') || trimmedPart.toLowerCase().includes('larger');
      const hasOutlet = trimmedPart.toLowerCase().includes('outlet');
      const hasFireplace = trimmedPart.toLowerCase().includes('fireplace');
      const mountType = trimmedPart.toLowerCase().includes('fixed') ? 'Fixed Mount' :
                       trimmedPart.toLowerCase().includes('tilt') ? 'Tilt Mount' :
                       trimmedPart.toLowerCase().includes('full-motion') ? 'Full-Motion Mount' : 'Standard Mount';

      const title = `TV ${serviceBreakdown.filter(s => s.title.includes('TV')).length + 1} (${isLarge ? '56" or larger' : '32"-55"'})`;
      services.push(title);

      const items = [
        {
          label: 'Base Installation (standard)',
          price: 100
        }
      ];

      if (mountType !== 'Standard Mount') {
        const mountPrice = isLarge ? 
          (mountType === 'Fixed Mount' ? 60 : 
           mountType === 'Tilt Mount' ? 70 : 100) :
          (mountType === 'Fixed Mount' ? 40 : 
           mountType === 'Tilt Mount' ? 50 : 80);

        items.push({
          label: mountType,
          price: mountPrice
        });
        totalPrice += mountPrice;
      }

      if (hasOutlet) {
        items.push({
          label: 'Outlet Relocation',
          price: 100
        });
        totalPrice += 100;
      }

      if (hasFireplace) {
        items.push({
          label: 'Fireplace Installation',
          price: 50
        });
        totalPrice += 50;
      }

      serviceBreakdown.push({ title, items });
      totalPrice += 100;
    } else if (trimmedPart.includes('Smart Doorbell')) {
      const title = 'Smart Doorbell';
      const hasBrick = trimmedPart.toLowerCase().includes('brick');
      services.push(title);
      
      const items = [
        {
          label: 'Base Installation (1 unit)',
          price: 75
        }
      ];
      
      if (hasBrick) {
        items.push({
          label: 'Brick Installation',
          price: 10
        });
        totalPrice += 10;
      }
      
      serviceBreakdown.push({ title, items });
      totalPrice += 75;
    } else if (trimmedPart.includes('Floodlight') || trimmedPart.toLowerCase().includes('smart floodlight')) {
      const title = 'Smart Floodlight';
      services.push(title);

      serviceBreakdown.push({
        title,
        items: [
          {
            label: 'Base Installation (1 unit)',
            price: 100
          }
        ]
      });
      totalPrice += 100;
    } else if ((trimmedPart.includes('Smart Camera') || trimmedPart.toLowerCase().includes('camera')) && 
               !trimmedPart.includes('Floodlight') && !trimmedPart.toLowerCase().includes('floodlight')) {
      const heightMatch = trimmedPart.match(/height-(\d+)/);
      const mountHeight = heightMatch ? parseInt(heightMatch[1]) : 8;
      const title = 'Smart Camera';
      services.push(title);

      const items = [
        {
          label: 'Base Installation (1 unit)',
          price: 75
        }
      ];

      if (mountHeight > 8) {
        const heightFee = Math.floor((mountHeight - 8) / 4) * 25;
        items.push({
          label: `Height Installation Fee (${mountHeight}ft)`,
          price: heightFee
        });
        totalPrice += heightFee;
      }

      serviceBreakdown.push({ title, items });
      totalPrice += 75;
    } else if (trimmedPart.toLowerCase().includes('smart home service') || 
               trimmedPart.toLowerCase().includes('smart home installation')) {
      const title = 'Smart Home Installation';
      services.push(title);
      
      serviceBreakdown.push({
        title,
        items: [
          {
            label: 'Smart Home Base Installation',
            price: 75
          }
        ]
      });
      totalPrice += 75;
    } else if (trimmedPart.includes('Smart Device')) {
      const items = [{
        label: 'Smart Device Installation',
        price: 75
      }];
      serviceBreakdown.push({
        title: 'Smart Device Installation',
        items
      });
      totalPrice += 75;
    }
  }

  if (tvCount > 1) {
    services.push('Multi-TV Discount');
    serviceBreakdown.push({
      title: 'Multi-TV Discount',
      items: [
        {
          label: 'Multi-TV Installation Discount',
          price: -10,
          isDiscount: true
        }
      ]
    });
    totalPrice -= 10;
  }

  if (services.length === 0) {
    services.push('Standard Installation');
    serviceBreakdown.push({
      title: 'Standard Installation',
      items: [
        {
          label: 'Base Service',
          price: 75
        }
      ]
    });
    totalPrice += 75;
  }

  return { services, price: totalPrice, serviceBreakdown };
}