
// Define types for TV installations
export interface TVInstallation {
  id: string;
  name: string;
  description: string;
  type: string;
  basePrice: number;
  isMostPopular?: boolean;
  isPromoted?: boolean;
}

// Define types for Smart Home installations
export interface SmartHomeInstallation {
  id: string;
  name: string;
  description: string;
  type: string;
  basePrice: number;
}

// Define types for booking
export interface Booking {
  id?: string;
  name: string;
  email: string;
  phone: string;
  streetAddress: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  notes?: string;
  serviceType: string;
  preferredDate: string;
  appointmentTime: string;
  status: string;
  pricingTotal?: number;
  pricingBreakdown?: any;
  consentToContact: boolean;
  createdAt?: string;
}
