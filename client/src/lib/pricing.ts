// Pricing configuration
export const pricing = {
  tvMounting: {
    base: 100, // Base price for TV mounting with customer-provided mount
    additionalTv: 10, // Discount per additional TV
    nonDrywall: 50, // Additional for masonry or non-drywall surfaces
    fireplace: 200, // Base price for fireplace installation
    highRise: 25, // Additional for high-rise or steel studs
    unmount: 50, // Price for unmounting a TV
    remount: 50, // Price for remounting with existing hardware
  },

  electrical: {
    outletInstallation: 100, // New outlet behind TV (non-fireplace only)
    additionalOutlet: 10, // Discount per additional outlet
  },

  smartHome: {
    camera: 75, // Per smart security camera
    doorbell: 85, // Per smart doorbell (updated from 75 to 85)
    floodlight: 125, // Per smart floodlight (updated from 100 to 125)
  },

  bundles: {
    tvPlusOutlet: 190, // TV mount + outlet relocation
  },

  generalLabor: {
    hourly: 100, // Per hour for non-standard tasks
    halfHour: 50, // Per additional 30 minutes
  },

  travel: {
    fee: 20, // For distances requiring >30 min driving
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
  travelDistance: number; // in minutes
};

// Calculate price based on service options
export function calculatePrice(options: ServiceOptions): {
  basePrice: number;
  additionalServices: number;
  discounts: number;
  travelFee: number;
  total: number;
  breakdown: Array<{
    category: string;
    items: Array<{
      name: string;
      price: number;
      isDiscount?: boolean;
    }>;
  }>;
} {
  const breakdown: Array<{
    category: string;
    items: Array<{ name: string; price: number; isDiscount?: boolean }>;
  }> = [];

  // Initialize prices
  let basePrice = 0;
  let additionalServices = 0;
  let discounts = 0;
  let tvMountingItems: { name: string; price: number; isDiscount?: boolean }[] = [];
  let electricalItems: { name: string; price: number; isDiscount?: boolean }[] = [];
  let smartHomeItems: { name: string; price: number }[] = [];
  let laborItems: { name: string; price: number }[] = [];

  // TV Mounting
  if (options.tvCount > 0) {
    // First TV mounting
    const baseTvPrice = options.isFireplace 
      ? pricing.tvMounting.fireplace 
      : pricing.tvMounting.base;

    tvMountingItems.push({ 
      name: options.isFireplace 
        ? "Fireplace TV Installation" 
        : "Standard TV Installation", 
      price: baseTvPrice 
    });
    basePrice += baseTvPrice;

    // Non-drywall surface fee
    if (options.tvMountSurface === 'nonDrywall') {
      const nonDrywallFee = pricing.tvMounting.nonDrywall;
      tvMountingItems.push({ 
        name: "Non-Drywall Surface (masonry/brick/stone)", 
        price: nonDrywallFee 
      });
      additionalServices += nonDrywallFee;
    }

    // High-rise or steel studs fee
    if (options.isHighRise) {
      const highRiseFee = pricing.tvMounting.highRise;
      tvMountingItems.push({ 
        name: "High-Rise/Steel Studs Fee", 
        price: highRiseFee 
      });
      additionalServices += highRiseFee;
    }

    // Additional TVs and discount
    if (options.tvCount > 1) {
      const additionalTvCount = options.tvCount - 1;
      const additionalTvBaseCost = additionalTvCount * pricing.tvMounting.base;
      tvMountingItems.push({ 
        name: `Additional TV Installation (${additionalTvCount})`, 
        price: additionalTvBaseCost 
      });
      basePrice += additionalTvBaseCost;

      // Apply multi-TV discount
      const multiTvDiscount = additionalTvCount * pricing.tvMounting.additionalTv;
      if (multiTvDiscount > 0) {
        tvMountingItems.push({ 
          name: "Multi-TV Discount", 
          price: -multiTvDiscount, 
          isDiscount: true 
        });
        discounts += multiTvDiscount;
      }
    }

    // Unmount and remount
    if (options.needsUnmount) {
      const unmountFee = pricing.tvMounting.unmount;
      tvMountingItems.push({ name: "TV Unmounting", price: unmountFee });
      additionalServices += unmountFee;
    }

    if (options.needsRemount) {
      const remountFee = pricing.tvMounting.remount;
      tvMountingItems.push({ name: "TV Remounting", price: remountFee });
      additionalServices += remountFee;
    }

    // Add TV mounting items to breakdown
    breakdown.push({
      category: "TV Mounting",
      items: tvMountingItems
    });
  }

  // Electrical Work
  if (options.outletCount > 0) {
    // First outlet
    electricalItems.push({ 
      name: "Outlet Installation", 
      price: pricing.electrical.outletInstallation 
    });
    additionalServices += pricing.electrical.outletInstallation;

    // Additional outlets and discount
    if (options.outletCount > 1) {
      const additionalOutletCount = options.outletCount - 1;
      const additionalOutletBaseCost = additionalOutletCount * pricing.electrical.outletInstallation;
      electricalItems.push({ 
        name: `Additional Outlet Installation (${additionalOutletCount})`, 
        price: additionalOutletBaseCost 
      });
      additionalServices += additionalOutletBaseCost;

      // Apply multi-outlet discount
      const multiOutletDiscount = additionalOutletCount * pricing.electrical.additionalOutlet;
      if (multiOutletDiscount > 0) {
        electricalItems.push({ 
          name: "Multi-Outlet Discount", 
          price: -multiOutletDiscount, 
          isDiscount: true 
        });
        discounts += multiOutletDiscount;
      }
    }

    // Add electrical items to breakdown
    breakdown.push({
      category: "Electrical Work",
      items: electricalItems
    });
  }

  // Bundle Discount (TV mount + outlet)
  if (options.tvCount > 0 && options.outletCount > 0 && !options.isFireplace) {
    // Calculate standard pricing
    const standardPrice = pricing.tvMounting.base + pricing.electrical.outletInstallation;
    // Calculate bundle price
    const bundlePrice = pricing.bundles.tvPlusOutlet;
    // Calculate bundle savings
    const bundleSavings = standardPrice - bundlePrice;

    if (bundleSavings > 0) {
      // Add bundle discount to breakdown
      breakdown.push({
        category: "Bundle Discount",
        items: [
          { 
            name: "TV Mount + Outlet Bundle", 
            price: -bundleSavings, 
            isDiscount: true 
          }
        ]
      });
      discounts += bundleSavings;
    }
  }

  // Smart Home Installations
  if (options.smartCameras > 0 || options.smartDoorbells > 0 || options.smartFloodlights > 0) {
    // Smart cameras
    if (options.smartCameras > 0) {
      const cameraPrice = options.smartCameras * pricing.smartHome.camera;
      smartHomeItems.push({ 
        name: `Smart Camera Installation (${options.smartCameras})`, 
        price: cameraPrice 
      });
      additionalServices += cameraPrice;
    }

    // Smart doorbells
    if (options.smartDoorbells > 0) {
      const doorbellPrice = options.smartDoorbells * pricing.smartHome.doorbell;
      smartHomeItems.push({ 
        name: `Smart Doorbell Installation (${options.smartDoorbells})`, 
        price: doorbellPrice 
      });
      additionalServices += doorbellPrice;
    }

    // Smart floodlights
    if (options.smartFloodlights > 0) {
      const floodlightPrice = options.smartFloodlights * pricing.smartHome.floodlight;
      smartHomeItems.push({ 
        name: `Smart Floodlight Installation (${options.smartFloodlights})`, 
        price: floodlightPrice 
      });
      additionalServices += floodlightPrice;
    }

    // Add smart home items to breakdown
    breakdown.push({
      category: "Smart Home",
      items: smartHomeItems
    });
  }

  // General Labor
  if (options.generalLaborHours > 0) {
    const fullHours = Math.floor(options.generalLaborHours);
    const hasHalfHour = (options.generalLaborHours - fullHours) > 0;

    if (fullHours > 0) {
      const hourlyPrice = fullHours * pricing.generalLabor.hourly;
      laborItems.push({ 
        name: `General Labor (${fullHours} hour${fullHours > 1 ? 's' : ''})`, 
        price: hourlyPrice 
      });
      additionalServices += hourlyPrice;
    }

    if (hasHalfHour) {
      laborItems.push({ 
        name: "General Labor (30 minutes)", 
        price: pricing.generalLabor.halfHour 
      });
      additionalServices += pricing.generalLabor.halfHour;
    }

    // Add labor items to breakdown
    breakdown.push({
      category: "General Labor",
      items: laborItems
    });
  }

  // Travel Fee
  let travelFee = 0;
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

// Function for formatting prices
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}