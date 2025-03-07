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
  unmountOnlyCount: number; // New property for standalone TV unmounting
  remountOnlyCount: number; // New property for standalone TV remounting
  travelDistance: number; // in minutes
  installation: {
    mountHeight?: number; // Added for camera height surcharge
    brickInstallation?: boolean; // Added for doorbell brick installation
  };
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

  // TV Mounting (rest of the code is unchanged)

  // Standalone TV Unmounting (rest of the code is unchanged)

  // Standalone TV Remounting (rest of the code is unchanged)

  // Electrical Work (rest of the code is unchanged)

  // Bundle Discount (rest of the code is unchanged)

  // Smart Home Installations
  if (options.smartCameras > 0 || options.smartDoorbells > 0 || options.smartFloodlights > 0) {
    // Smart cameras with height surcharge calculation
    if (options.smartCameras > 0) {
      const basePrice = options.smartCameras * pricing.smartHome.camera;
      smartHomeItems.push({
        name: `Smart Camera Installation (${options.smartCameras})`,
        price: basePrice
      });
      additionalServices += basePrice;

      // Calculate height surcharge if above 8 feet
      if (options.installation && options.installation.mountHeight > 8) {
        const heightDifference = options.installation.mountHeight - 8;
        const surchargeMultiplier = Math.ceil(heightDifference / 4);
        const heightSurcharge = surchargeMultiplier * 25 * options.smartCameras;

        smartHomeItems.push({
          name: `Height Surcharge (${heightDifference}ft above 8ft)`,
          price: heightSurcharge
        });
        additionalServices += heightSurcharge;
      }
    }

    // Smart doorbells with brick installation fee
    if (options.smartDoorbells > 0) {
      const basePrice = options.smartDoorbells * pricing.smartHome.doorbell;
      smartHomeItems.push({
        name: `Smart Doorbell Installation (${options.smartDoorbells})`,
        price: basePrice
      });
      additionalServices += basePrice;

      // Add brick installation fee if applicable
      if (options.installation && options.installation.brickInstallation) {
        const brickFee = 10 * options.smartDoorbells;
        smartHomeItems.push({
          name: 'Brick Installation Fee',
          price: brickFee
        });
        additionalServices += brickFee;
      }
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

  // General Labor (rest of the code is unchanged)

  // Travel Fee (rest of the code is unchanged)

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

// Function for formatting prices (rest of the code is unchanged)
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}