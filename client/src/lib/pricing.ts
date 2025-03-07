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
    doorbell: 85, // Per smart doorbell
    floodlight: 125, // Per smart floodlight
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
  unmountOnlyCount: number;
  remountOnlyCount: number;
  travelDistance: number;
  installation: {
    mountHeight?: number;
    brickInstallation?: boolean;
  };
};

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
  let basePrice = 0;
  let additionalServices = 0;
  let discounts = 0;
  let travelFee = 0;

  const breakdown: Array<{
    category: string;
    items: Array<{ name: string; price: number; isDiscount?: boolean }>;
  }> = [];

  const tvMountingItems: Array<{ name: string; price: number; isDiscount?: boolean }> = [];
  const electricalItems: Array<{ name: string; price: number; isDiscount?: boolean }> = [];
  const smartHomeItems: Array<{ name: string; price: number }> = [];
  const laborItems: Array<{ name: string; price: number }> = [];

  // TV Mounting
  if (options.tvCount > 0) {
    const baseTvPrice = options.isFireplace ? pricing.tvMounting.fireplace : pricing.tvMounting.base;
    tvMountingItems.push({
      name: options.isFireplace ? "Fireplace TV Installation" : "Standard TV Installation",
      price: baseTvPrice
    });
    basePrice += baseTvPrice;

    if (options.tvMountSurface === 'nonDrywall') {
      const nonDrywallFee = pricing.tvMounting.nonDrywall;
      tvMountingItems.push({
        name: "Non-Drywall Surface (masonry/brick/stone)",
        price: nonDrywallFee
      });
      additionalServices += nonDrywallFee;
    }

    if (options.isHighRise) {
      const highRiseFee = pricing.tvMounting.highRise;
      tvMountingItems.push({
        name: "High-Rise/Steel Studs Fee",
        price: highRiseFee
      });
      additionalServices += highRiseFee;
    }

    if (options.tvCount > 1) {
      const additionalTvCount = options.tvCount - 1;
      const additionalTvBaseCost = additionalTvCount * pricing.tvMounting.base;
      tvMountingItems.push({
        name: `Additional TV Installation (${additionalTvCount})`,
        price: additionalTvBaseCost
      });
      basePrice += additionalTvBaseCost;

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

    breakdown.push({
      category: "TV Mounting",
      items: tvMountingItems
    });
  }

  // Smart Home Installations
  if (options.smartCameras > 0 || options.smartDoorbells > 0 || options.smartFloodlights > 0) {
    if (options.smartCameras > 0) {
      const basePrice = options.smartCameras * pricing.smartHome.camera;
      smartHomeItems.push({
        name: `Smart Camera Installation (${options.smartCameras})`,
        price: basePrice
      });
      additionalServices += basePrice;

      const mountHeight = options.installation?.mountHeight || 0;
      if (mountHeight > 8) {
        const heightDifference = mountHeight - 8;
        const surchargeMultiplier = Math.ceil(heightDifference / 4);
        const heightSurcharge = surchargeMultiplier * 25 * options.smartCameras;

        if (heightSurcharge > 0) {
          smartHomeItems.push({
            name: `Height Surcharge (${heightDifference}ft above 8ft)`,
            price: heightSurcharge
          });
          additionalServices += heightSurcharge;
        }
      }
    }

    if (options.smartDoorbells > 0) {
      const basePrice = options.smartDoorbells * pricing.smartHome.doorbell;
      smartHomeItems.push({
        name: `Smart Doorbell Installation (${options.smartDoorbells})`,
        price: basePrice
      });
      additionalServices += basePrice;

      if (options.installation?.brickInstallation) {
        const brickFee = 10 * options.smartDoorbells;
        smartHomeItems.push({
          name: 'Brick Installation Fee',
          price: brickFee
        });
        additionalServices += brickFee;
      }
    }

    if (options.smartFloodlights > 0) {
      const floodlightPrice = options.smartFloodlights * pricing.smartHome.floodlight;
      smartHomeItems.push({
        name: `Smart Floodlight Installation (${options.smartFloodlights})`,
        price: floodlightPrice
      });
      additionalServices += floodlightPrice;
    }

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

    breakdown.push({
      category: "General Labor",
      items: laborItems
    });
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