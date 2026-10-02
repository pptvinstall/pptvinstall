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
      price: 30,
      description: "Fixed position TV mount for TVs between 32\" and 55\"."
    },
    fixedBig: {
      name: "Fixed Mount (56\"+)",
      price: 40,
      description: "Fixed position TV mount for TVs 56\" and larger."
    },
    tiltingSmall: {
      name: "Tilting Mount (32\"-55\")",
      price: 40,
      description: "Tilting TV mount for TVs between 32\" and 55\"."
    },
    tiltingBig: {
      name: "Tilting Mount (56\"+)",
      price: 50,
      description: "Tilting TV mount for TVs 56\" and larger."
    },
    fullMotionSmall: {
      name: "Full Motion Mount (32\"-55\")",
      price: 60,
      description: "Full motion (articulating) TV mount for TVs between 32\" and 55\"."
    },
    fullMotionBig: {
      name: "Full Motion Mount (56\"+)",
      price: 80,
      description: "Full motion (articulating) TV mount for TVs 56\" and larger."
    }
  },

  // Wire Concealment & Outlet Installation
  wireConcealment: {
    standard: {
      name: "Outlet Behind TV / Clean-Cord Setup",
      price: 100,
      description: "Installing an outlet behind the TV as the primary clean-cord solution."
    },
    additional: {
      name: "Additional Outlet Behind TV (Same Visit)",
      price: 100,
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

  // Sound System Installation
  soundSystem: {
    soundbar: {
      name: "Soundbar Installation & Setup",
      price: 150,
      description: "Professional soundbar mounting and audio setup with TV integration."
    },
    surroundSound: {
      name: "5.1 Surround Sound Installation",
      price: 300,
      description: "Complete 5.1 surround sound system installation with speaker placement and calibration."
    },
    speakerMount: {
      name: "Individual Speaker Wall Mount",
      price: 50,
      description: "Professional wall mounting for individual speakers."
    }
  },

  // Custom Services (Hourly Rate)
  customServices: {
    handyman: {
      name: "Handyman / General Work",
      price: 100,
      hourly: true,
      minimum: 100,
      halfHourRate: 50,
      description: "Shelves, mirrors, furniture assembly, and general home tasks. $100 for the first hour, $50 for each additional 30 minutes."
    }
  },

  // Discounts
  discounts: {
    multipleTvs: {
      name: "Multi-TV Discount (Owner Approved)",
      amount: 0
    },
    multipleOutlets: {
      name: "Multi-Outlet Discount (Owner Approved)",
      amount: 0
    },
    mountBundle: {
      name: "Mount Bundle Discount (Owner Approved)",
      amount: 0
    }
  },

  // Zero-TV standalone services
  otherServices: {
    tvUnmounting: {
      name: "TV Unmounting / Removal",
      price: 50,
      description: "Safe removal of an existing wall-mounted TV. Per TV.",
    },
    avTroubleshooting: {
      name: "AV Troubleshooting",
      price: 100,
      hourly: true,
      halfHourRate: 50,
      minimum: 100,
      description: "Remote issues, HDMI problems, sound not working, streaming setup. $100 first hour, $50 per additional 30 min.",
    },
    wireManagementOnly: {
      name: "Wire Management / Cable Tidy",
      price: 75,
      additionalLocationPrice: 50,
      description: "Already mounted but wires are a mess? $75 for one TV location, +$50 per additional location.",
    },
    deviceSetup: {
      name: "Device Setup & Configuration",
      price: 75,
      description: "Smart TV setup, streaming apps, Alexa/Google Home, WiFi config. $75 flat.",
    },
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