// pricing-data.ts - Centralized pricing data that's easily editable

export const pricingData = {
  // TV Mounting Services
  tvMounting: {
    standard: {
      name: "Standard TV Mounting (Customer's Mount)",
      price: 100,
      description: "Mounting a TV on drywall with a customer-provided mount, any size."
    },
    fireplace: {
      name: "Over Fireplace TV Mounting",
      price: 200,
      description: "Mounting a TV above a fireplace (non-drywall)."
    },
    nonDrywall: {
      name: "Non-Drywall (Brick, Masonry, etc.)",
      price: 50,
      description: "Additional fee for mounting on brick, stone, or other non-drywall surfaces."
    },
    highRise: {
      name: "High-Rise/Steel Stud Mounting",
      price: 25,
      description: "Additional fee for mounting in high-rise buildings or on steel studs."
    },
    remount: {
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
  tvMounts: {
    fixedSmall: {
      name: "Fixed Mount (32\"-55\")",
      price: 50,
      description: "Fixed position TV mount for TVs between 32\" and 55\"."
    },
    fixedBig: {
      name: "Fixed Mount (56\"+)",
      price: 65,
      description: "Fixed position TV mount for TVs 56\" and larger."
    },
    tiltingSmall: {
      name: "Tilting Mount (32\"-55\")",
      price: 65,
      description: "Tilting TV mount for TVs between 32\" and 55\"."
    },
    tiltingBig: {
      name: "Tilting Mount (56\"+)",
      price: 80,
      description: "Tilting TV mount for TVs 56\" and larger."
    },
    fullMotionSmall: {
      name: "Full Motion Mount (32\"-55\")",
      price: 90,
      description: "Full motion (articulating) TV mount for TVs between 32\" and 55\"."
    },
    fullMotionBig: {
      name: "Full Motion Mount (56\"+)",
      price: 120,
      description: "Full motion (articulating) TV mount for TVs 56\" and larger."
    }
  },

  // Wire Concealment & Outlet Installation
  wireConcealment: {
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
    fireplaceWarning: {
      name: "Wire Concealment Above Fireplace",
      price: 0, // Price will be determined after assessment
      restriction: true,
      description: "Requires pictures of the nearest outlet for pricing."
    }
  },

  // Smart Home Installation
  smartHome: {
    securityCamera: {
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
    floodlightNoWiring: {
      name: "Smart Floodlight Installation (No Wiring)",
      price: 0, // Price will be determined after assessment
      restriction: true,
      description: "Requires assessment for proper pricing."
    }
  },

  // Custom Services (Hourly Rate)
  customServices: {
    handyman: {
      name: "General Handyman Work",
      price: 100,
      hourly: true,
      minimum: 100,
      halfHourRate: 50,
      description: "Shelves, Mirrors, Furniture Assembly. $50 for every additional 30 minutes."
    }
  },

  // Discounts
  discounts: {
    multipleTvs: {
      name: "$10 Off Per Additional TV",
      amount: 10
    },
    multipleOutlets: {
      name: "$10 Off Per Additional Outlet Install",
      amount: 10
    },
    mountBundle: {
      name: "$5 Off Per Additional Mount Purchased",
      amount: 5
    }
  },

  // Travel fee
  travel: {
    fee: 0
  }
};

// Pricing-related utility functions
export function formatPrice(price: number | string): string {
  const numberPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `$${numberPrice.toFixed(0)}`;
}

// Types for pricing items
export type PricingItem = {
  name: string;
  price: number;
  description: string;
  restriction?: boolean;
  hourly?: boolean;
  minimum?: number;
  halfHourRate?: number;
};

export type DiscountItem = {
  name: string;
  amount: number;
};

// Type for the full pricing structure
export type PricingData = typeof pricingData;