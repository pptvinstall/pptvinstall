// Pricing configuration based on exact requirements
export const pricing = {
  // TV Mounting Services
  tv_mounting: {
    standard: {
      name: "Standard TV Mounting (Customer's Mount)",
      price: 100,
      description: "Mounting a TV on drywall with a customer-provided mount, any size."
    },
    fireplace: {
      name: "Over Fireplace TV Mounting",
      price: 200,
      description: "Mounting a TV above a fireplace (non-brick/masonry)."
    },
    // Non-drywall is an add-on of $50, not a standalone service
    non_drywall_addon: {
      name: "Non-Drywall (Brick, Masonry, etc.)",
      price: 50,
      description: "Additional fee for mounting on brick, stone, or other non-drywall surfaces."
    },
    high_rise_addon: {
      name: "High-Rise/Steel Stud Mounting",
      price: 25,
      description: "Additional fee for mounting in high-rise buildings or on steel studs."
    },
    existing_mount: {
      name: "Remount on Existing Mount (Customer Provides Matching Arms)",
      price: 50,
      description: "Reattaching a TV to an existing mount with matching arms."
    },
    unmount: {
      name: "TV Unmounting",
      price: 50,
      description: "Removing a mounted TV from the wall."
    }
  },

  // TV Mounts for Sale
  tv_mounts: {
    fixed_small: {
      name: "Fixed Mount (32\"-55\")",
      price: 50,
      description: "Fixed-position mount for small to medium TVs."
    },
    fixed_big: {
      name: "Fixed Mount (56\"+)",
      price: 65,
      description: "Fixed-position mount for large TVs."
    },
    tilting_small: {
      name: "Tilting Mount (32\"-55\")",
      price: 65,
      description: "Tilting mount for small to medium TVs."
    },
    tilting_big: {
      name: "Tilting Mount (56\"+)",
      price: 80,
      description: "Tilting mount for large TVs."
    },
    full_motion_small: {
      name: "Full Motion Mount (32\"-55\")",
      price: 90,
      description: "Full-motion/swivel mount for small to medium TVs."
    },
    full_motion_big: {
      name: "Full Motion Mount (56\"+)",
      price: 120,
      description: "Full-motion/swivel mount for large TVs."
    }
  },

  // Wire Concealment & Outlet Installation
  wire_concealment: {
    standard: {
      name: "Standard Wire Concealment (New Outlet Behind TV)",
      price: 100,
      description: "Installing a new outlet behind the TV with concealed wires."
    },
    additional: {
      name: "Additional Outlet Installation (Same Visit)",
      price: 90,
      description: "Each additional outlet installation at the same location."
    },
    fireplace_warning: {
      name: "Wire Concealment Above Fireplace",
      restriction: true,
      description: "Requires pictures of the nearest outlet for pricing."
    }
  },

  // Smart Home Installation
  smart_home: {
    security_camera: {
      name: "Smart Security Camera Installation",
      price: 75,
      description: "Installing a smart security camera."
    },
    doorbell: {
      name: "Smart Doorbell Installation",
      price: 85,
      description: "Installing a smart video doorbell."
    },
    floodlight: {
      name: "Smart Floodlight Installation (Existing Wiring)",
      price: 125,
      description: "Installing a smart floodlight with existing wiring."
    },
    floodlight_no_wiring: {
      name: "Smart Floodlight Installation (No Wiring)",
      restriction: true,
      description: "Requires assessment for proper pricing."
    }
  },

  // Custom Services (Hourly Rate)
  custom_services: {
    handyman: {
      name: "General Handyman Work",
      price: 100,
      hourly: true,
      minimum: 100,
      half_hour_rate: 50,
      description: "Shelves, Mirrors, Furniture Assembly. $50 for every additional 30 minutes."
    }
  },

  // Discounts
  discounts: {
    multiple_tvs: {
      name: "$10 Off Per Additional TV",
      amount: 10
    },
    multiple_outlets: {
      name: "$10 Off Per Additional Outlet Install",
      amount: 10
    },
    mount_bundle: {
      name: "$5 Off Per Additional Mount Purchased",
      amount: 5
    }
  },

  // Travel fee
  travel: {
    fee: 0, // No travel fee mentioned in the pricing document
  }
};

export type ServiceOptions = {
  tvCount: number;
  tvMountSurface: 'drywall' | 'nonDrywall';
  isFireplace: boolean;
  isHighRise: boolean;
  outletCount: number;
  smartCameras: number;
  smartDoorbells: number;
  smartFloodlights: number;
  generalLaborHours: number;
  needsUnmount: boolean;
  needsRemount: boolean;
  unmountOnlyCount: number;
  remountOnlyCount: number;
  travelDistance: number;
  installation: {
    brickInstallation?: boolean;
  };
};

export function calculatePrice(options: ServiceOptions) {
  let basePrice = 0;
  let additionalServices = 0;
  let discounts = 0;
  let travelFee = 0;

  const breakdown: Array<{
    category: string;
    items: Array<{ name: string; price: number; isDiscount?: boolean }>;
  }> = [];

  const tvMountingItems: Array<{ name: string; price: number; isDiscount?: boolean }> = [];
  const tvMountItems: Array<{ name: string; price: number; isDiscount?: boolean }> = [];
  const wireItems: Array<{ name: string; price: number; isDiscount?: boolean }> = [];
  const smartHomeItems: Array<{ name: string; price: number }> = [];
  const laborItems: Array<{ name: string; price: number }> = [];

  // TV Mounting Services
  if (options.tvCount > 0) {
    // First TV - Base price depends on mounting type
    let basePrice1stTV = 0;
    
    // Start with standard or fireplace mounting
    if (options.isFireplace) {
      // Over fireplace mounting
      const fireplaceService = pricing.tv_mounting.fireplace;
      tvMountingItems.push({
        name: fireplaceService.name,
        price: fireplaceService.price
      });
      basePrice1stTV = fireplaceService.price;
    } else {
      // Standard mounting
      const standardService = pricing.tv_mounting.standard;
      tvMountingItems.push({
        name: standardService.name,
        price: standardService.price
      });
      basePrice1stTV = standardService.price;
    }
    
    // Add non-drywall fee if needed (for brick, masonry)
    if (options.tvMountSurface === 'nonDrywall') {
      const nonDrywallFee = pricing.tv_mounting.non_drywall_addon;
      tvMountingItems.push({
        name: nonDrywallFee.name,
        price: nonDrywallFee.price
      });
      basePrice1stTV += nonDrywallFee.price;
    }
    
    // Add high-rise fee if needed
    if (options.isHighRise) {
      const highRiseFee = pricing.tv_mounting.high_rise_addon;
      tvMountingItems.push({
        name: highRiseFee.name,
        price: highRiseFee.price
      });
      basePrice1stTV += highRiseFee.price;
    }
    
    basePrice += basePrice1stTV;

    // Additional TVs with discount
    if (options.tvCount > 1) {
      const additionalTvCount = options.tvCount - 1;
      // Additional TVs are charged at standard rate
      const additionalTvBaseCost = additionalTvCount * pricing.tv_mounting.standard.price;
      tvMountingItems.push({
        name: `Additional TV Installation (${additionalTvCount})`,
        price: additionalTvBaseCost
      });
      basePrice += additionalTvBaseCost;

      // Apply multi-TV discount
      const multiTvDiscount = additionalTvCount * pricing.discounts.multiple_tvs.amount;
      if (multiTvDiscount > 0) {
        tvMountingItems.push({
          name: pricing.discounts.multiple_tvs.name,
          price: -multiTvDiscount,
          isDiscount: true
        });
        discounts += multiTvDiscount;
      }
    }

    // Unmounting service
    if (options.needsUnmount) {
      const unmountService = pricing.tv_mounting.unmount;
      tvMountingItems.push({ 
        name: unmountService.name, 
        price: unmountService.price 
      });
      additionalServices += unmountService.price;
    }

    // Remounting service
    if (options.needsRemount) {
      const remountService = pricing.tv_mounting.existing_mount;
      tvMountingItems.push({ 
        name: remountService.name, 
        price: remountService.price 
      });
      additionalServices += remountService.price;
    }

    breakdown.push({
      category: "TV Mounting",
      items: tvMountingItems
    });
  }

  // Standalone TV Services
  if (options.unmountOnlyCount > 0) {
    const unmountService = pricing.tv_mounting.unmount;
    const unmountFee = options.unmountOnlyCount * unmountService.price;
    breakdown.push({
      category: "TV Unmounting",
      items: [{
        name: options.unmountOnlyCount > 1 ? `${unmountService.name} (${options.unmountOnlyCount})` : unmountService.name,
        price: unmountFee
      }]
    });
    basePrice += unmountFee;
  }

  if (options.remountOnlyCount > 0) {
    const remountService = pricing.tv_mounting.existing_mount;
    const remountFee = options.remountOnlyCount * remountService.price;
    breakdown.push({
      category: "TV Remounting",
      items: [{
        name: options.remountOnlyCount > 1 ? `${remountService.name} (${options.remountOnlyCount})` : remountService.name,
        price: remountFee
      }]
    });
    basePrice += remountFee;
  }

  // Wire Concealment & Outlet Installation
  if (options.outletCount > 0) {
    // First outlet installation
    const firstOutletService = pricing.wire_concealment.standard;
    wireItems.push({
      name: firstOutletService.name,
      price: firstOutletService.price
    });
    additionalServices += firstOutletService.price;

    // Additional outlets
    if (options.outletCount > 1) {
      const additionalOutletCount = options.outletCount - 1;
      const additionalOutletService = pricing.wire_concealment.additional;
      const additionalOutletPrice = additionalOutletCount * additionalOutletService.price;
      
      wireItems.push({
        name: `${additionalOutletService.name} (${additionalOutletCount})`,
        price: additionalOutletPrice
      });
      additionalServices += additionalOutletPrice;

      // Multi-outlet discount
      const multiOutletDiscount = additionalOutletCount * pricing.discounts.multiple_outlets.amount;
      if (multiOutletDiscount > 0) {
        wireItems.push({
          name: pricing.discounts.multiple_outlets.name,
          price: -multiOutletDiscount,
          isDiscount: true
        });
        discounts += multiOutletDiscount;
      }
    }

    // Add wire concealment items to breakdown
    if (wireItems.length > 0) {
      breakdown.push({
        category: "Wire Concealment & Outlets",
        items: wireItems
      });
    }
  }

  // Smart Home Installations
  if (options.smartCameras > 0 || options.smartDoorbells > 0 || options.smartFloodlights > 0) {
    if (options.smartCameras > 0) {
      const cameraService = pricing.smart_home.security_camera;
      const basePriceCamera = options.smartCameras * cameraService.price;
      smartHomeItems.push({
        name: options.smartCameras > 1 ? `${cameraService.name} (${options.smartCameras})` : cameraService.name,
        price: basePriceCamera
      });
      additionalServices += basePriceCamera;
    }

    if (options.smartDoorbells > 0) {
      const doorbellService = pricing.smart_home.doorbell;
      const basePriceDoorbell = options.smartDoorbells * doorbellService.price;
      smartHomeItems.push({
        name: options.smartDoorbells > 1 ? `${doorbellService.name} (${options.smartDoorbells})` : doorbellService.name,
        price: basePriceDoorbell
      });
      additionalServices += basePriceDoorbell;

      // Add brick installation fee if needed
      if (options.installation?.brickInstallation) {
        // Per new pricing, brick installation costs are included in the non-drywall fee
        const nonDrywallFee = pricing.tv_mounting.non_drywall_addon;
        smartHomeItems.push({
          name: `${nonDrywallFee.name} (for doorbell${options.smartDoorbells > 1 ? 's' : ''})`,
          price: nonDrywallFee.price * options.smartDoorbells
        });
        additionalServices += nonDrywallFee.price * options.smartDoorbells;
      }
    }

    if (options.smartFloodlights > 0) {
      const floodlightService = pricing.smart_home.floodlight;
      const floodlightPrice = options.smartFloodlights * floodlightService.price;
      smartHomeItems.push({
        name: options.smartFloodlights > 1 ? `${floodlightService.name} (${options.smartFloodlights})` : floodlightService.name,
        price: floodlightPrice
      });
      additionalServices += floodlightPrice;
    }

    if (smartHomeItems.length > 0) {
      breakdown.push({
        category: "Smart Home",
        items: smartHomeItems
      });
    }
  }

  // General Handyman Work
  if (options.generalLaborHours > 0) {
    const handymanService = pricing.custom_services.handyman;
    
    // Calculate price based on hours and 30-minute increments
    let hoursPrice = 0;
    
    if (options.generalLaborHours <= 1) {
      // Minimum charge is $100
      hoursPrice = handymanService.minimum;
    } else {
      // First hour is $100, then $50 per 30 minutes
      const additionalHours = options.generalLaborHours - 1;
      const halfHourIncrements = Math.ceil(additionalHours * 2);
      hoursPrice = handymanService.price + (halfHourIncrements * handymanService.half_hour_rate);
    }
    
    laborItems.push({
      name: `${handymanService.name} (${options.generalLaborHours} ${options.generalLaborHours === 1 ? 'hour' : 'hours'})`,
      price: hoursPrice
    });
    additionalServices += hoursPrice;
    
    if (laborItems.length > 0) {
      breakdown.push({
        category: "Additional Services",
        items: laborItems
      });
    }
  }

  // Travel Fee - Based on new pricing, there is no travel fee
  if (options.travelDistance > 30 && pricing.travel.fee > 0) {
    travelFee = pricing.travel.fee;
    breakdown.push({
      category: "Travel",
      items: [
        { name: "Travel Fee (>30 minutes)", price: travelFee }
      ]
    });
  }

  // Calculate total
  const total = basePrice + additionalServices - discounts + travelFee;

  return {
    basePrice,
    additionalServices,
    discounts,
    travelFee,
    total,
    breakdown
  };
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}