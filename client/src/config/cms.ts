// Simple configuration management for easy content updates
// This can be expanded to connect to a headless CMS later

export interface SiteConfig {
  businessInfo: {
    name: string;
    phone: string;
    email: string;
    serviceArea: string;
    hours: {
      weekday: string;
      weekend: string;
    };
  };
  messaging: {
    heroTitle: string;
    heroSubtitle: string;
    ctaText: string;
    guaranteeText: string;
  };
  features: {
    showPromotions: boolean;
    showTestimonials: boolean;
    showPWAInstall: boolean;
    enableBookingReminders: boolean;
  };
}

// This could be loaded from a CMS API or external config file
export const siteConfig: SiteConfig = {
  businessInfo: {
    name: "Picture Perfect TV Install",
    phone: "(404) 334-9844",
    email: "PPTVInstall@gmail.com",
    serviceArea: "Metro Atlanta",
    hours: {
      weekday: "Monday-Friday: 6:30 PM - 10:30 PM",
      weekend: "Saturday-Sunday: 11:00 AM - 7:00 PM"
    }
  },
  messaging: {
    heroTitle: "Professional TV Mounting & Smart Home Installation",
    heroSubtitle: "Transform your home with expert TV mounting and smart device installation across Metro Atlanta",
    ctaText: "Book Your Installation",
    guaranteeText: "100% Satisfaction Guaranteed"
  },
  features: {
    showPromotions: true,
    showTestimonials: true,
    showPWAInstall: true,
    enableBookingReminders: true
  }
};

// Helper function to update config (for future CMS integration)
export async function updateSiteConfig(updates: Partial<SiteConfig>): Promise<SiteConfig> {
  // This would call a CMS API in the future
  console.log('Config update requested:', updates);
  return { ...siteConfig, ...updates };
}

// Helper to get config value with fallback
export function getConfigValue<T>(
  path: string, 
  fallback: T
): T {
  const keys = path.split('.');
  let value: any = siteConfig;
  
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) {
      return fallback;
    }
  }
  
  return value ?? fallback;
}