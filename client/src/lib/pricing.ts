// Pricing configuration
export const pricing = {
  tvMounting: {
    base: 100,
    additionalTv: 10,
    nonDrywall: 50,
    fireplace: 200,
    highRise: 25,
    unmount: 50,
    remount: 50,
  },

  electrical: {
    outletInstallation: 100,
    additionalOutlet: 10,
  },

  smartHome: {
    camera: 75,
    doorbell: 85,
    floodlight: 125,
    heightSurcharge: 25, // per 4ft increment above 8ft
    brickInstallation: 10,
  },

  bundles: {
    tvPlusOutlet: 190,
  },

  generalLabor: {
    hourly: 100,
    halfHour: 50,
  },

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
    mountHeight?: number;
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
  const electricalItems: Array<{ name: string; price: number; isDiscount?: boolean }> = [];
  const smartHomeItems: Array<{ name: string; price: number }> = [];
  const laborItems: Array<{ name: string; price: number }> = [];

  // TV Mounting Services
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

  // Standalone TV Services
  if (options.unmountOnlyCount > 0) {
    const unmountFee = options.unmountOnlyCount * pricing.tvMounting.unmount;
    breakdown.push({
      category: "TV Unmounting",
      items: [{
        name: options.unmountOnlyCount > 1 ? `TV Unmounting Only (${options.unmountOnlyCount})` : "TV Unmounting Only",
        price: unmountFee
      }]
    });
    basePrice += unmountFee;
  }

  if (options.remountOnlyCount > 0) {
    const remountFee = options.remountOnlyCount * pricing.tvMounting.remount;
    breakdown.push({
      category: "TV Remounting",
      items: [{
        name: options.remountOnlyCount > 1 ? `TV Remounting Only (${options.remountOnlyCount})` : "TV Remounting Only",
        price: remountFee
      }]
    });
    basePrice += remountFee;
  }

  // Smart Home Installations
  if (options.smartCameras > 0 || options.smartDoorbells > 0 || options.smartFloodlights > 0) {
    if (options.smartCameras > 0) {
      // Base camera price
      const basePrice = options.smartCameras * pricing.smartHome.camera;
      smartHomeItems.push({
        name: `Smart Camera Installation (${options.smartCameras})`,
        price: basePrice
      });
      additionalServices += basePrice;

      // Height surcharge calculation
      if (options.installation?.mountHeight) {
        const height = options.installation.mountHeight;
        if (height > 8) {
          const heightDifference = height - 8;
          const surchargeMultiplier = Math.ceil(heightDifference / 4);
          const heightSurcharge = surchargeMultiplier * pricing.smartHome.heightSurcharge * options.smartCameras;

          if (heightSurcharge > 0) {
            smartHomeItems.push({
              name: `Height Surcharge (${heightDifference}ft above 8ft)`,
              price: heightSurcharge
            });
            additionalServices += heightSurcharge;
          }
        }
      }
    }

    if (options.smartDoorbells > 0) {
      // Base doorbell price
      const basePrice = options.smartDoorbells * pricing.smartHome.doorbell;
      smartHomeItems.push({
        name: `Smart Doorbell Installation (${options.smartDoorbells})`,
        price: basePrice
      });
      additionalServices += basePrice;

      // Brick installation fee
      if (options.installation?.brickInstallation) {
        const brickFee = pricing.smartHome.brickInstallation * options.smartDoorbells;
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

    if (smartHomeItems.length > 0) {
      breakdown.push({
        category: "Smart Home",
        items: smartHomeItems
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