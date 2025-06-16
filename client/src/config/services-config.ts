export interface ServiceConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'tv' | 'smartHome' | 'soundSystem';
  pricing: {
    basePrice: number;
    hourlyRate?: number;
    minimumHours?: number;
  };
  options?: {
    sizes?: Array<{ value: string; label: string; priceModifier?: number }>;
    locations?: Array<{ value: string; label: string; priceModifier?: number }>;
    mountTypes?: Array<{ value: string; label: string; priceModifier?: number }>;
    features?: Array<{ value: string; label: string; priceModifier?: number }>;
  };
  emailTemplate?: {
    subject: string;
    itemDescription: string;
  };
}

export const SERVICES_CONFIG: Record<string, ServiceConfig> = {
  // TV Installation Services
  tvInstallation: {
    id: 'tvInstallation',
    name: 'TV Installation',
    displayName: 'TV Wall Mount Installation',
    description: 'Professional TV mounting and setup service',
    category: 'tv',
    pricing: {
      basePrice: 200,
    },
    options: {
      sizes: [
        { value: 'small', label: '32"-55"', priceModifier: 0 },
        { value: 'large', label: '56" or larger', priceModifier: 50 }
      ],
      locations: [
        { value: 'standard', label: 'Standard Wall', priceModifier: 0 },
        { value: 'fireplace', label: 'Over Fireplace', priceModifier: 75 }
      ],
      mountTypes: [
        { value: 'fixed', label: 'Fixed Mount', priceModifier: 0 },
        { value: 'tilting', label: 'Tilting Mount', priceModifier: 25 },
        { value: 'full_motion', label: 'Full Motion Mount', priceModifier: 75 },
        { value: 'customer', label: 'Customer-Provided Mount', priceModifier: -50 }
      ],
      features: [
        { value: 'masonryWall', label: 'Non-Drywall Surface (Brick/Masonry)', priceModifier: 100 },
        { value: 'highRise', label: 'High-Rise/Steel Studs', priceModifier: 50 },
        { value: 'outletNeeded', label: 'Wire Concealment & Outlet Installation', priceModifier: 150 }
      ]
    },
    emailTemplate: {
      subject: 'TV Installation Service Confirmation',
      itemDescription: 'TV Wall Mount Installation with professional setup'
    }
  },

  // Smart Home Services
  smartCamera: {
    id: 'smartCamera',
    name: 'Smart Security Camera',
    displayName: 'Smart Security Camera Installation',
    description: 'Professional installation and setup of smart security cameras',
    category: 'smartHome',
    pricing: {
      basePrice: 150,
    },
    emailTemplate: {
      subject: 'Smart Security Camera Installation Confirmation',
      itemDescription: 'Smart Security Camera Installation & Setup'
    }
  },

  smartDoorbell: {
    id: 'smartDoorbell',
    name: 'Smart Doorbell',
    displayName: 'Smart Doorbell Installation',
    description: 'Professional installation and setup of smart doorbells',
    category: 'smartHome',
    pricing: {
      basePrice: 125,
    },
    options: {
      features: [
        { value: 'brickInstallation', label: 'Brick/Masonry Installation', priceModifier: 75 },
        { value: 'existingWiring', label: 'Existing Wiring Available', priceModifier: 0 },
        { value: 'newWiring', label: 'New Wiring Required', priceModifier: 100 }
      ]
    },
    emailTemplate: {
      subject: 'Smart Doorbell Installation Confirmation',
      itemDescription: 'Smart Doorbell Installation & Setup'
    }
  },

  smartFloodlight: {
    id: 'smartFloodlight',
    name: 'Smart Floodlight',
    displayName: 'Smart Floodlight Installation',
    description: 'Professional installation and setup of smart floodlights',
    category: 'smartHome',
    pricing: {
      basePrice: 175,
    },
    options: {
      features: [
        { value: 'existingWiring', label: 'Existing Wiring Available', priceModifier: 0 },
        { value: 'newWiring', label: 'New Wiring Required', priceModifier: 125 }
      ]
    },
    emailTemplate: {
      subject: 'Smart Floodlight Installation Confirmation',
      itemDescription: 'Smart Floodlight Installation & Setup'
    }
  },

  // Sound System Services
  soundbarInstallation: {
    id: 'soundbarInstallation',
    name: 'Soundbar Installation',
    displayName: 'Soundbar Installation & Setup',
    description: 'Professional soundbar mounting, wiring, and audio calibration',
    category: 'soundSystem',
    pricing: {
      basePrice: 125,
    },
    emailTemplate: {
      subject: 'Soundbar Installation Service Confirmation',
      itemDescription: 'Professional soundbar installation with mounting and audio setup'
    }
  },

  surroundSoundInstallation: {
    id: 'surroundSoundInstallation',
    name: 'Surround Sound Installation',
    displayName: '5.1 Surround Sound Installation',
    description: 'Complete 5.1 surround sound system installation with speaker placement and calibration',
    category: 'soundSystem',
    pricing: {
      basePrice: 350,
    },
    emailTemplate: {
      subject: '5.1 Surround Sound Installation Confirmation',
      itemDescription: 'Complete 5.1 surround sound system installation with professional calibration'
    }
  },

  speakerMount: {
    id: 'speakerMount',
    name: 'Speaker Wall Mount',
    displayName: 'Speaker Wall Mount Installation',
    description: 'Professional speaker wall mounting with optimal positioning',
    category: 'soundSystem',
    pricing: {
      basePrice: 75,
    },
    emailTemplate: {
      subject: 'Speaker Mount Installation Confirmation',
      itemDescription: 'Professional speaker wall mount installation'
    }
  }
};

// Helper functions for service management
export function getServiceById(serviceId: string): ServiceConfig | undefined {
  return SERVICES_CONFIG[serviceId];
}

export function getServicesByCategory(category: 'tv' | 'smartHome' | 'soundSystem'): ServiceConfig[] {
  return Object.values(SERVICES_CONFIG).filter(service => service.category === category);
}

export function calculateServicePrice(serviceId: string, options: Record<string, any> = {}, quantity: number = 1): number {
  const service = getServiceById(serviceId);
  if (!service) return 0;

  let totalPrice = service.pricing.basePrice;

  // Apply option modifiers
  if (service.options) {
    // Size modifiers
    if (service.options.sizes && options.size) {
      const sizeOption = service.options.sizes.find(s => s.value === options.size);
      if (sizeOption?.priceModifier) {
        totalPrice += sizeOption.priceModifier;
      }
    }

    // Location modifiers
    if (service.options.locations && options.location) {
      const locationOption = service.options.locations.find(l => l.value === options.location);
      if (locationOption?.priceModifier) {
        totalPrice += locationOption.priceModifier;
      }
    }

    // Mount type modifiers
    if (service.options.mountTypes && options.mountType) {
      const mountOption = service.options.mountTypes.find(m => m.value === options.mountType);
      if (mountOption?.priceModifier) {
        totalPrice += mountOption.priceModifier;
      }
    }

    // Feature modifiers
    if (service.options.features) {
      service.options.features.forEach(feature => {
        if (options[feature.value] === true && feature.priceModifier) {
          totalPrice += feature.priceModifier;
        }
      });
    }
  }

  return totalPrice * quantity;
}

export function formatServiceForEmail(serviceId: string, options: Record<string, any> = {}, quantity: number = 1): string {
  const service = getServiceById(serviceId);
  if (!service) return 'Unknown Service';

  let description = service.emailTemplate?.itemDescription || service.displayName;
  
  if (quantity > 1) {
    description += ` (Quantity: ${quantity})`;
  }

  // Add option details
  const details: string[] = [];
  
  if (service.options?.sizes && options.size) {
    const sizeOption = service.options.sizes.find(s => s.value === options.size);
    if (sizeOption) details.push(sizeOption.label);
  }

  if (service.options?.locations && options.location) {
    const locationOption = service.options.locations.find(l => l.value === options.location);
    if (locationOption) details.push(locationOption.label);
  }

  if (service.options?.mountTypes && options.mountType) {
    const mountOption = service.options.mountTypes.find(m => m.value === options.mountType);
    if (mountOption) details.push(mountOption.label);
  }

  if (service.options?.features) {
    service.options.features.forEach(feature => {
      if (options[feature.value] === true) {
        details.push(feature.label);
      }
    });
  }

  if (details.length > 0) {
    description += ` (${details.join(', ')})`;
  }

  return description;
}

// Legacy compatibility mappings
export const LEGACY_SERVICE_MAPPINGS = {
  // TV services
  'tv': 'tvInstallation',
  
  // Smart home services
  'camera': 'smartCamera',
  'doorbell': 'smartDoorbell',
  'floodlight': 'smartFloodlight',
  
  // Sound system services
  'soundbar': 'soundbarInstallation',
  'surroundSound': 'surroundSoundInstallation',
  'speakerMount': 'speakerMount'
};

export function mapLegacyServiceType(legacyType: string): string {
  return LEGACY_SERVICE_MAPPINGS[legacyType as keyof typeof LEGACY_SERVICE_MAPPINGS] || legacyType;
}