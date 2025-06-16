import { pricingData, formatPrice as formatPriceUtil, type PricingItem, type DiscountItem } from '../data/pricing-data';

// Re-export formatPrice function
export const formatPrice = formatPriceUtil;

// Interface for service options when calculating price
export interface ServiceOptions {
  tvCount?: number;
  tvMountSurface?: 'drywall' | 'nonDrywall';
  isFireplace?: boolean;
  isHighRise?: boolean;
  outletCount?: number;
  smartCameras?: number;
  smartDoorbells?: number;
  smartFloodlights?: number;
  soundbars?: number;
  surroundSoundSystems?: number;
  speakerMounts?: number;
  generalLaborHours?: number;
  needsUnmount?: boolean;
  needsRemount?: boolean;
  unmountOnlyCount?: number;
  remountOnlyCount?: number;
  travelDistance?: number;
  installation?: {
    brickInstallation?: boolean;
    [key: string]: boolean | undefined;
  };
}

// Export pricing data
export const pricing = pricingData;

// Export Pricing types
export type Pricing = typeof pricingData;

// Interface for discount information
interface DiscountInfo {
  name: string;
  amount: number;
  description: string;
}

// Calculate pricing based on selected options with combo discounts
export function calculatePrice(options: any) {
  let basePrice = 0;
  let additionalServices = 0;
  let discounts = 0;
  const breakdown: any[] = [];
  const appliedDiscounts: DiscountInfo[] = [];

  // First process TV mounts which are the base service
  if (options.tvMountType) {
    const tvMountingItems = [];

    // Base TV mounting service
    if (options.tvMountType === 'standard') {
      const standardService = pricing.tvMounting.standard;
      tvMountingItems.push({
        name: standardService.name,
        price: standardService.price
      });
      basePrice += standardService.price;
    } else if (options.tvMountType === 'fireplace') {
      const fireplaceService = pricing.tvMounting.fireplace;
      tvMountingItems.push({
        name: fireplaceService.name,
        price: fireplaceService.price
      });
      basePrice += fireplaceService.price;
    }

    // Add-ons for the TV mount
    if (options.nonDrywall) {
      const nonDrywallAddon = pricing.tvMounting.nonDrywall;
      tvMountingItems.push({
        name: nonDrywallAddon.name,
        price: nonDrywallAddon.price
      });
      additionalServices += nonDrywallAddon.price;
    }

    if (options.highRiseMount) {
      const highRiseAddon = pricing.tvMounting.highRise;
      tvMountingItems.push({
        name: highRiseAddon.name,
        price: highRiseAddon.price
      });
      additionalServices += highRiseAddon.price;
    }

    // Mount purchase options
    if (options.tvMountPurchase) {
      const mountType = options.tvMountPurchase;
      const tvSize = options.tvSize || 'small';

      let mountItem;
      if (mountType === 'fixed') {
        mountItem = tvSize === 'small' ? pricing.tvMounts.fixedSmall : pricing.tvMounts.fixedBig;
      } else if (mountType === 'tilting') {
        mountItem = tvSize === 'small' ? pricing.tvMounts.tiltingSmall : pricing.tvMounts.tiltingBig;
      } else if (mountType === 'fullMotion') {
        mountItem = tvSize === 'small' ? pricing.tvMounts.fullMotionSmall : pricing.tvMounts.fullMotionBig;
      }

      if (mountItem) {
        tvMountingItems.push({
          name: mountItem.name,
          price: mountItem.price
        });
        additionalServices += mountItem.price;
      }
    }

    if (tvMountingItems.length > 0) {
      breakdown.push({
        category: 'TV Mounting',
        items: tvMountingItems
      });
    }
  }

  // Wire concealment
  if (options.wireConcealment) {
    const wireConcealmentItems = [];
    const wireConcealmentService = pricing.wireConcealment.standard;

    wireConcealmentItems.push({
      name: wireConcealmentService.name,
      price: wireConcealmentService.price
    });

    additionalServices += wireConcealmentService.price;

    // Additional outlets
    if (options.additionalOutlets && options.additionalOutlets > 0) {
      const additionalOutletService = pricing.wireConcealment.additional;
      for (let i = 0; i < options.additionalOutlets; i++) {
        wireConcealmentItems.push({
          name: `${additionalOutletService.name} #${i+1}`,
          price: additionalOutletService.price
        });
        additionalServices += additionalOutletService.price;

        // Removed discount for additional outlets as requested
      }
    }

    if (wireConcealmentItems.length > 0) {
      breakdown.push({
        category: 'Wire Concealment & Outlets',
        items: wireConcealmentItems
      });
    }
  }

  // Smart home installations
  const smartHomeItems = [];

  // Security cameras
  if (options.securityCameras && options.securityCameras > 0) {
    const cameraService = pricing.smartHome.securityCamera;
    const totalCameraPrice = cameraService.price * options.securityCameras;

    smartHomeItems.push({
      name: `${cameraService.name} (${options.securityCameras} cameras)`,
      price: totalCameraPrice
    });

    additionalServices += totalCameraPrice;
  }

  // Smart doorbells
  if (options.smartDoorbells && options.smartDoorbells > 0) {
    const doorbellService = pricing.smartHome.doorbell;
    const totalDoorbellPrice = doorbellService.price * options.smartDoorbells;

    smartHomeItems.push({
      name: `${doorbellService.name} (${options.smartDoorbells} doorbells)`,
      price: totalDoorbellPrice
    });

    additionalServices += totalDoorbellPrice;
  }

  // Smart floodlights
  if (options.smartFloodlights && options.smartFloodlights > 0) {
    const floodlightService = pricing.smartHome.floodlight;
    const totalFloodlightPrice = floodlightService.price * options.smartFloodlights;

    smartHomeItems.push({
      name: `${floodlightService.name} (${options.smartFloodlights} floodlights)`,
      price: totalFloodlightPrice
    });

    additionalServices += totalFloodlightPrice;
  }

  if (smartHomeItems.length > 0) {
    breakdown.push({
      category: 'Smart Home Installation',
      items: smartHomeItems
    });
  }

  // Sound System Installation
  const soundSystemItems = [];

  // Soundbar installation
  if (options.soundbars && options.soundbars > 0) {
    const soundbarService = pricing.soundSystem.soundbar;
    const totalSoundbarPrice = soundbarService.price * options.soundbars;

    soundSystemItems.push({
      name: `${soundbarService.name} (${options.soundbars} soundbar${options.soundbars > 1 ? 's' : ''})`,
      price: totalSoundbarPrice
    });

    additionalServices += totalSoundbarPrice;
  }

  // Surround sound installation
  if (options.surroundSoundSystems && options.surroundSoundSystems > 0) {
    const surroundService = pricing.soundSystem.surroundSound;
    const totalSurroundPrice = surroundService.price * options.surroundSoundSystems;

    soundSystemItems.push({
      name: `${surroundService.name} (${options.surroundSoundSystems} system${options.surroundSoundSystems > 1 ? 's' : ''})`,
      price: totalSurroundPrice
    });

    additionalServices += totalSurroundPrice;
  }

  // Individual speaker mounts
  if (options.speakerMounts && options.speakerMounts > 0) {
    const speakerMountService = pricing.soundSystem.speakerMount;
    const totalSpeakerMountPrice = speakerMountService.price * options.speakerMounts;

    soundSystemItems.push({
      name: `${speakerMountService.name} (${options.speakerMounts} speaker${options.speakerMounts > 1 ? 's' : ''})`,
      price: totalSpeakerMountPrice
    });

    additionalServices += totalSpeakerMountPrice;
  }

  if (soundSystemItems.length > 0) {
    breakdown.push({
      category: 'Sound System Installation',
      items: soundSystemItems
    });
  }

  // Custom handyman work
  if (options.handymanHours && options.handymanHours > 0) {
    const handymanItems = [];
    const handymanService = pricing.customServices.handyman;

    // Calculate handyman price based on hours
    let handymanPrice = 0;

    if (options.handymanHours <= 1) {
      // First hour is at the minimum rate
      handymanPrice = handymanService.minimum;
    } else {
      // First hour plus additional half-hour increments
      const basePrice = handymanService.price;
      const additionalHours = options.handymanHours - 1;
      const additionalHalfHours = Math.ceil(additionalHours * 2);
      handymanPrice = basePrice + (additionalHalfHours * handymanService.halfHourRate);
    }

    handymanItems.push({
      name: `${handymanService.name} (${options.handymanHours} hour${options.handymanHours > 1 ? 's' : ''})`,
      price: handymanPrice
    });

    additionalServices += handymanPrice;

    if (handymanItems.length > 0) {
      breakdown.push({
        category: 'Custom Services',
        items: handymanItems
      });
    }
  }

  // Apply combo discounts
  const subtotal = basePrice + additionalServices;
  
  // Combo Discount 1: TV Mounting + TV De-Installation = $25 off
  const hasTvMounting = options.tvMountType && (options.tvCount > 0 || basePrice > 0);
  const hasTvDeinstallation = options.tvDeinstallation > 0;
  
  if (hasTvMounting && hasTvDeinstallation) {
    const comboDiscount = 25;
    appliedDiscounts.push({
      name: 'TV Mounting + De-Installation Combo',
      amount: comboDiscount,
      description: 'Save $25 when booking TV mounting and de-installation together'
    });
    discounts += comboDiscount;
  }
  
  // Count total services for bulk discount
  let totalServices = 0;
  if (hasTvMounting) totalServices++;
  if (hasTvDeinstallation) totalServices += options.tvDeinstallation || 0;
  if (options.securityCameras) totalServices += options.securityCameras;
  if (options.smartDoorbells) totalServices += options.smartDoorbells;
  if (options.smartFloodlights) totalServices += options.smartFloodlights;
  if (options.soundbars) totalServices += options.soundbars;
  if (options.surroundSoundSystems) totalServices += options.surroundSoundSystems;
  if (options.speakerMounts) totalServices += options.speakerMounts;
  
  // Combo Discount 2: 3+ services = 10% off subtotal (only if combo discount not already applied)
  if (totalServices >= 3 && !appliedDiscounts.some(d => d.name.includes('Combo'))) {
    const bulkDiscountPercent = 0.10;
    const bulkDiscount = Math.round(subtotal * bulkDiscountPercent);
    appliedDiscounts.push({
      name: '3+ Services Bulk Discount',
      amount: bulkDiscount,
      description: 'Save 10% when booking 3 or more services'
    });
    discounts += bulkDiscount;
  }

  // Apply travel fee if applicable
  if (pricing.travel.fee > 0) {
    breakdown.push({
      category: 'Travel',
      items: [{
        name: 'Travel Fee',
        price: pricing.travel.fee
      }]
    });

    additionalServices += pricing.travel.fee;
  }

  // Calculate the final total after discounts
  const total = Math.max(0, subtotal - discounts);

  return {
    total,
    basePrice,
    additionalServices,
    discounts,
    appliedDiscounts,
    subtotal,
    breakdown,
    formattedTotal: formatPrice(total),
    formattedBasePrice: formatPrice(basePrice),
    formattedSubtotal: formatPrice(subtotal),
    formattedDiscounts: formatPrice(discounts)
  };
}