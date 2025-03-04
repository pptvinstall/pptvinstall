// Price constants for smart home installations
export const SMART_DEVICE_PRICES = {
  DOORBELL: {
    BASE: 75,
    BRICK_SURFACE: 10,
  },
  FLOODLIGHT: {
    BASE: 125,
  },
  CAMERA: {
    BASE: 75,
    HEIGHT_FEE: 25, // For installations above 8ft
  }
} as const;

// Notes for each service type
export const SERVICE_NOTES = {
  DOORBELL: "Please ensure device is charged if wireless",
  FLOODLIGHT: "Wireless or existing wiring required",
  CAMERA_HEIGHT: "Additional fee for installations above 8ft"
} as const;

// Multi-device discount configuration
export const MULTI_DEVICE_DISCOUNT = {
  PER_ADDITIONAL_DEVICE: 10
} as const;

// Helper function to calculate multi-device discount
export function calculateMultiDeviceDiscount(deviceCount: number): number {
  if (deviceCount <= 1) return 0;
  return (deviceCount - 1) * MULTI_DEVICE_DISCOUNT.PER_ADDITIONAL_DEVICE;
}

// Types for service breakdown
export type PriceItem = {
  label: string;
  price: number;
  note?: string;
  isDiscount?: boolean;
};

export type ServiceBreakdown = {
  title: string;
  items: PriceItem[];
};

// Helper function to format price as currency
export function formatPrice(amount: number | string): string {
  const price = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
}
