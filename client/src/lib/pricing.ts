
// Pricing configuration based on the new price list
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

  // Travel fee (not mentioned in current pricing)
  travel: {
    fee: 0
  }
};

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
      const standardService = pricing.tv_mounting.standard;
      tvMountingItems.push({
        name: standardService.name,
        price: standardService.price
      });
      basePrice += standardService.price;
    } else if (options.tvMountType === 'fireplace') {
      const fireplaceService = pricing.tv_mounting.fireplace;
      tvMountingItems.push({
        name: fireplaceService.name,
        price: fireplaceService.price
      });
      basePrice += fireplaceService.price;
    }
    
    // Add-ons for the TV mount
    if (options.nonDrywall) {
      const nonDrywallAddon = pricing.tv_mounting.non_drywall_addon;
      tvMountingItems.push({
        name: nonDrywallAddon.name,
        price: nonDrywallAddon.price
      });
      additionalServices += nonDrywallAddon.price;
    }
    
    if (options.highRiseMount) {
      const highRiseAddon = pricing.tv_mounting.high_rise_addon;
      tvMountingItems.push({
        name: highRiseAddon.name,
        price: highRiseAddon.price
      });
      additionalServices += highRiseAddon.price;
    }
    
    // Mount purchase options
    if (options.tvMountPurchase) {
      const mountSize = options.tvSize === 'large' ? 'big' : 'small';
      const mountType = options.tvMountPurchase;
      const mountKey = `${mountType}_${mountSize}`;
      
      if (pricing.tv_mounts[mountKey]) {
        const mountService = pricing.tv_mounts[mountKey];
        tvMountingItems.push({
          name: mountService.name,
          price: mountService.price
        });
        additionalServices += mountService.price;
      }
    }
    
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
    const wireItems = [];
    
    // First outlet installation
    const firstOutletService = pricing.wire_concealment.standard;
    wireItems.push({
      name: firstOutletService.name,
      price: firstOutletService.price
    });
    additionalServices += firstOutletService.price;
    
    // Additional outlet installations with discount
    if (options.outletCount > 1) {
      const additionalOutletCount = options.outletCount - 1;
      const additionalOutletService = pricing.wire_concealment.additional;
      const additionalOutletFee = additionalOutletCount * additionalOutletService.price;
      
      wireItems.push({
        name: `${additionalOutletService.name} (${additionalOutletCount})`,
        price: additionalOutletFee
      });
      additionalServices += additionalOutletFee;
      
      // Apply outlet discount
      const outletDiscount = additionalOutletCount * pricing.discounts.multiple_outlets.amount;
      if (outletDiscount > 0) {
        wireItems.push({
          name: pricing.discounts.multiple_outlets.name,
          price: -outletDiscount,
          isDiscount: true
        });
        discounts += outletDiscount;
      }
    }
    
    breakdown.push({
      category: "Wire Concealment & Outlet Installation",
      items: wireItems
    });
  }

  // Smart Home Installations
  const smartHomeItems = [];
  
  // Security Cameras
  if (options.securityCameraCount > 0) {
    const cameraService = pricing.smart_home.security_camera;
    const cameraFee = options.securityCameraCount * cameraService.price;
    
    smartHomeItems.push({
      name: options.securityCameraCount > 1 ? `${cameraService.name} (${options.securityCameraCount})` : cameraService.name,
      price: cameraFee
    });
    additionalServices += cameraFee;
  }
  
  // Doorbells
  if (options.doorbellCount > 0) {
    const doorbellService = pricing.smart_home.doorbell;
    const doorbellFee = options.doorbellCount * doorbellService.price;
    
    smartHomeItems.push({
      name: options.doorbellCount > 1 ? `${doorbellService.name} (${options.doorbellCount})` : doorbellService.name,
      price: doorbellFee
    });
    additionalServices += doorbellFee;
  }
  
  // Floodlights (existing wiring)
  if (options.floodlightCount > 0) {
    const floodlightService = pricing.smart_home.floodlight;
    const floodlightFee = options.floodlightCount * floodlightService.price;
    
    smartHomeItems.push({
      name: options.floodlightCount > 1 ? `${floodlightService.name} (${options.floodlightCount})` : floodlightService.name,
      price: floodlightFee
    });
    additionalServices += floodlightFee;
  }
  
  if (smartHomeItems.length > 0) {
    breakdown.push({
      category: "Smart Home Installation",
      items: smartHomeItems
    });
  }
  
  // Handyman Services (hourly)
  if (options.handymanHours > 0) {
    const handymanService = pricing.custom_services.handyman;
    let handymanFee = 0;
    
    // First hour is at base rate
    handymanFee += handymanService.price;
    
    // Additional time charged at half-hour increments
    if (options.handymanHours > 1) {
      const additionalHalfHours = Math.ceil((options.handymanHours - 1) * 2);
      handymanFee += additionalHalfHours * handymanService.half_hour_rate;
    }
    
    breakdown.push({
      category: "Handyman Services",
      items: [{
        name: `${handymanService.name} (${options.handymanHours} hour${options.handymanHours > 1 ? 's' : ''})`,
        price: handymanFee
      }]
    });
    
    additionalServices += handymanFee;
  }
  
  // Travel fee (if applicable)
  if (options.distance > 0 && pricing.travel.fee > 0) {
    const travelFee = pricing.travel.fee;
    breakdown.push({
      category: "Travel",
      items: [{
        name: "Travel Fee",
        price: travelFee
      }]
    });
    additionalServices += travelFee;
  }

  // Calculate the total
  const total = basePrice + additionalServices - discounts;
  
  return {
    basePrice,
    additionalServices,
    discounts,
    total,
    breakdown
  };
}
