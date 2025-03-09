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

// Calculate pricing based on selected options
export function calculatePrice(options: any) {
  let basePrice = 0;
  let additionalServices = 0;
  let discounts = 0;
  const breakdown: any[] = [];

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

        // Apply discount for additional outlets
        if (i > 0) {
          discounts += pricing.discounts.multipleOutlets.amount;
        }
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

  // Calculate multi-TV discounts
  if (options.tvCount && options.tvCount > 1) {
    const multiTvDiscount = pricing.discounts.multipleTvs.amount * (options.tvCount - 1);

    breakdown.push({
      category: 'Discounts',
      items: [{
        name: `${pricing.discounts.multipleTvs.name} (${options.tvCount - 1} additional TVs)`,
        price: -multiTvDiscount,
        isDiscount: true
      }]
    });

    discounts += multiTvDiscount;
  }

  // Apply mount bundle discounts if multiple mounts purchased
  if (options.mountCount && options.mountCount > 1) {
    const mountBundleDiscount = pricing.discounts.mountBundle.amount * (options.mountCount - 1);

    // Add to existing discounts category or create new one
    const discountCategory = breakdown.find(category => category.category === 'Discounts');

    if (discountCategory) {
      discountCategory.items.push({
        name: `${pricing.discounts.mountBundle.name} (${options.mountCount - 1} additional mounts)`,
        price: -mountBundleDiscount,
        isDiscount: true
      });
    } else {
      breakdown.push({
        category: 'Discounts',
        items: [{
          name: `${pricing.discounts.mountBundle.name} (${options.mountCount - 1} additional mounts)`,
          price: -mountBundleDiscount,
          isDiscount: true
        }]
      });
    }

    discounts += mountBundleDiscount;
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

  // Calculate the total price
  const total = basePrice + additionalServices - discounts;

  return {
    total,
    basePrice,
    additionalServices,
    discounts,
    breakdown,
    formattedTotal: formatPrice(total),
    formattedBasePrice: formatPrice(basePrice)
  };
}