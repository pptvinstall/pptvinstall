// Pricing configuration based on updated structure
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
    brick_masonry: {
      name: "Non-Drywall TV Mounting (Brick/Masonry)",
      price: 150,
      description: "Mounting a TV on a brick or masonry wall."
    },
    fireplace_brick: {
      name: "Over Fireplace TV Mounting (Brick/Masonry)",
      price: 250,
      description: "Mounting a TV above a fireplace on brick/masonry."
    },
    high_rise: {
      name: "High-Rise/Steel Stud Mounting",
      price: 125,
      description: "Mounting a TV in a high-rise or on steel studs, requiring special anchors."
    },
    existing_mount: {
      name: "Remount on Existing Wall Mount (Arms Provided)",
      price: 50,
      description: "Reattaching a TV to an existing mount with matching arms."
    },
    unmount: {
      name: "TV Unmounting Service",
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
      name: "Wire Concealment & New Outlet Installation",
      price: 100,
      description: "Installing a new outlet behind the TV by tapping into an existing one below."
    },
    additional: {
      name: "Additional Outlet Installation",
      price: 90,
      description: "Each additional outlet installation at the same location."
    },
    fireplace_warning: {
      name: "Wire Concealment Above Fireplace",
      restriction: true,
      description: "Must provide pictures of the nearest outlet for pricing."
    }
  },

  // Smart Home Installation
  smart_home: {
    security_camera: {
      name: "Smart Security Camera Install",
      price: 75,
      description: "Installing a smart security camera."
    },
    doorbell: {
      name: "Smart Doorbell Install",
      price: 85,
      description: "Installing a smart video doorbell."
    },
    floodlight: {
      name: "Smart Floodlight Install (Existing Wiring)",
      price: 125,
      description: "Installing a smart floodlight with existing wiring."
    },
    floodlight_no_wiring: {
      name: "Smart Floodlight Install (No Existing Wiring)",
      restriction: true,
      description: "Requires additional assessment for wiring and junction box installation."
    }
  },

  // Custom Services (Hourly Rate)
  custom_services: {
    handyman: {
      name: "General Handyman Work",
      price: 100,
      description: "Includes mounting shelves, mirrors, furniture assembly, etc. $50 for each additional 30 minutes."
    }
  },

  // Discounts
  discounts: {
    multiple_tvs: {
      name: "$10 Off Each Additional TV Mounting",
      amount: 10
    },
    multiple_outlets: {
      name: "$10 Off Each Additional Outlet Install",
      amount: 10
    },
    mount_bundle: {
      name: "$5 Off Each Additional Mount Purchased",
      amount: 5
    }
  },

  // Legacy pricing for backward compatibility
  travel: {
    fee: 20,
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
    // Determine base mounting price based on conditions
    let baseTvOption: keyof typeof pricing.tv_mounting = 'standard';
    
    if (options.isFireplace) {
      baseTvOption = options.tvMountSurface === 'nonDrywall' ? 'fireplace_brick' : 'fireplace';
    } else if (options.tvMountSurface === 'nonDrywall') {
      baseTvOption = 'brick_masonry';
    } else if (options.isHighRise) {
      baseTvOption = 'high_rise';
    }
    
    const baseService = pricing.tv_mounting[baseTvOption];
    tvMountingItems.push({
      name: baseService.name,
      price: baseService.price
    });
    basePrice += baseService.price;

    // Additional TVs with discount
    if (options.tvCount > 1) {
      const additionalTvCount = options.tvCount - 1;
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
        // Using a fixed price for brick installation (not in new pricing, so using a fixed amount)
        const brickFee = 10 * options.smartDoorbells;
        smartHomeItems.push({
          name: `Brick Installation Fee (${options.smartDoorbells} doorbell${options.smartDoorbells > 1 ? 's' : ''})`,
          price: brickFee
        });
        additionalServices += brickFee;
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
    const hoursPrice = Math.ceil(options.generalLaborHours * 2) / 2 * handymanService.price;
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

  // Travel Fee
  if (options.travelDistance > 30) {
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