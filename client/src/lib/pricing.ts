// Pricing configuration
export const pricing = {
  baseMounting: {
    basic: 100, // Customer provides mount
    overFireplace: 100, // Additional fee
    ceiling: 175,
  },

  mounts: {
    fixed: {
      small: 40, // 32"-55"
      large: 60, // 56"+
    },
    tilt: {
      small: 50,
      large: 70,
    },
    fullMotion: {
      small: 80,
      large: 100,
    }
  },

  electrical: {
    outletInstallation: 100,
  },

  additionalServices: {
    soundbarBasic: 50,
    soundbarConcealed: 75,
    shelfInstallation: 50,
  },

  discounts: {
    multiTvLabor: 10, // Per additional TV
    multiTvMount: 5, // Per additional mount
  },

  deposit: {
    basic: 20,
    premium: 75,
    custom: 100,
  },

  travel: {
    freeRadius: 20, // miles
    ratePerMile: 1,
  }
};

export type ServiceOptions = {
  tvSize: 'small' | 'large';
  mountType: 'fixed' | 'tilt' | 'fullMotion' | 'none';
  location: 'standard' | 'fireplace' | 'ceiling';
  wireConcealment: boolean;
  additionalTvs: number;
  soundbar: 'none' | 'basic' | 'concealed';
  shelves: number;
  distance: number; // miles from business location
};

// This function can also accept a string for backward compatibility
export function calculatePrice(options: ServiceOptions | string): {
  basePrice: number;
  mountPrice: number;
  additionalServices: number;
  travelFee: number;
  discounts: number;
  total: number;
} {
  // If options is a string, convert it to default ServiceOptions
  if (typeof options === 'string') {
    // Parse the string to extract some basic information for pricing
    const isFireplace = options.toLowerCase().includes('fireplace');
    const isCeiling = options.toLowerCase().includes('ceiling');
    const isLargeTV = options.toLowerCase().includes('56"') || options.toLowerCase().includes('larger');
    const hasMountType = options.toLowerCase().includes('fixed') || 
                         options.toLowerCase().includes('tilt') || 
                         options.toLowerCase().includes('fullmotion');

    // Default options with extracted info
    options = {
      tvSize: isLargeTV ? 'large' : 'small',
      mountType: hasMountType ? (
        options.toLowerCase().includes('fixed') ? 'fixed' :
        options.toLowerCase().includes('tilt') ? 'tilt' :
        options.toLowerCase().includes('fullmotion') ? 'fullMotion' : 'none'
      ) : 'none',
      location: isFireplace ? 'fireplace' : isCeiling ? 'ceiling' : 'standard',
      wireConcealment: false,
      additionalTvs: 0,
      soundbar: 'none',
      shelves: 0,
      distance: 0
    };
  }

  let basePrice = pricing.baseMounting.basic;
  let mountPrice = 0;
  let additionalServices = 0;
  let discounts = 0;

  // Base installation price
  if (options.location === 'fireplace') {
    basePrice += pricing.baseMounting.overFireplace;
  } else if (options.location === 'ceiling') {
    basePrice = pricing.baseMounting.ceiling;
  }

  // Mount price if needed
  if (options.mountType !== 'none') {
    const sizeCategory = options.tvSize;
    mountPrice = pricing.mounts[options.mountType][sizeCategory];
  }

  // Additional services
  if (options.soundbar === 'basic') {
    additionalServices += pricing.additionalServices.soundbarBasic;
  } else if (options.soundbar === 'concealed') {
    additionalServices += pricing.additionalServices.soundbarConcealed;
  }

  additionalServices += options.shelves * pricing.additionalServices.shelfInstallation;

  // Multi-TV discounts
  if (options.additionalTvs > 0) {
    discounts += options.additionalTvs * pricing.discounts.multiTvLabor;
    if (options.mountType !== 'none') {
      discounts += options.additionalTvs * pricing.discounts.multiTvMount;
    }
  }

  // Travel fee
  const travelFee = options.distance > pricing.travel.freeRadius
    ? (options.distance - pricing.travel.freeRadius) * pricing.travel.ratePerMile
    : 0;

  const subtotal = basePrice + mountPrice + additionalServices - discounts;
  const total = subtotal + travelFee;

  return {
    basePrice,
    mountPrice,
    additionalServices,
    travelFee,
    discounts,
    total
  };
}