/**
 * Facebook Pixel Utility Functions
 * 
 * This utility provides methods to track events with Facebook's Meta Pixel.
 * Only use this when the fbq function is available (client-side only).
 */

// Ensure the function exists in the global scope (client-side only)
const isFbqAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof (window as any).fbq === 'function';
};

// Basic event tracking
export const trackEvent = (event: string, params?: object): void => {
  if (!isFbqAvailable()) return;
  
  try {
    if (params) {
      (window as any).fbq('track', event, params);
    } else {
      (window as any).fbq('track', event);
    }
    console.debug(`Meta Pixel: Tracked "${event}" event`, params || '');
  } catch (error) {
    console.error('Meta Pixel tracking error:', error);
  }
};

// Standard events
export const trackPageView = (): void => {
  trackEvent('PageView');
};

export const trackViewContent = (contentData?: object): void => {
  trackEvent('ViewContent', contentData);
};

export const trackLead = (leadData?: object): void => {
  trackEvent('Lead', leadData);
};

export const trackContact = (contactData?: object): void => {
  trackEvent('Contact', contactData);
};

export const trackSchedule = (scheduleData?: object): void => {
  trackEvent('Schedule', scheduleData);
};

export const trackPurchase = (purchaseData: {
  value: number;
  currency: string;
  content_ids?: string[];
  content_type?: string;
}): void => {
  trackEvent('Purchase', purchaseData);
};

// Export singleton
export default {
  trackEvent,
  trackPageView,
  trackViewContent,
  trackLead,
  trackContact,
  trackSchedule,
  trackPurchase
};