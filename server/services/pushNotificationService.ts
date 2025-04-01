import webpush from 'web-push';
import { db } from '../db';
import { customers } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Generate VAPID keys using web-push generate-vapid-keys
// These should be stored in environment variables for security
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BLW2oRUGC-MN20YeSE3vZ11gi_NVrcMjWvsWF0CaNh7T4vzaCiZoZY0wDwIsjvg4xHnrCxHTDxupCm0bNe-CkU4';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'HtbOcU_AQOlGGIFXSFE_-_v8jk0qAA_KqQy3mQBxeqM';

// Configure with your VAPID keys
webpush.setVapidDetails(
  'mailto:support@pictureperfecttv.install', // Change this to your email
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

/**
 * Interface for push subscription object
 */
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Service for handling push notifications
 */
export class PushNotificationService {
  /**
   * Get the VAPID public key for subscription
   */
  getPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  /**
   * Save a push subscription for a user
   */
  async saveSubscription(customerId: number, subscription: PushSubscription): Promise<boolean> {
    try {
      // Update the customer's subscription info
      await db.update(customers)
        .set({ 
          pushSubscription: subscription as any,
          notificationsEnabled: true 
        })
        .where(eq(customers.id, customerId));
      
      return true;
    } catch (error) {
      console.error('Failed to save push subscription:', error);
      return false;
    }
  }

  /**
   * Disable notifications for a user
   */
  async disableNotifications(customerId: number): Promise<boolean> {
    try {
      await db.update(customers)
        .set({ 
          notificationsEnabled: false 
        })
        .where(eq(customers.id, customerId));
      
      return true;
    } catch (error) {
      console.error('Failed to disable notifications:', error);
      return false;
    }
  }

  /**
   * Send a notification to a specific user
   */
  async sendNotification(
    customerId: number, 
    title: string, 
    body: string, 
    data: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      // Fetch the user's subscription
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId)
      });

      if (!customer || !customer.notificationsEnabled || !customer.pushSubscription) {
        console.log(`Customer ${customerId} has no push subscription or notifications disabled`);
        return false;
      }

      // Prepare the notification payload
      const payload = JSON.stringify({
        title,
        body,
        data: {
          ...data,
          dateOfSend: Date.now(),
        },
        actions: [
          {
            action: 'view',
            title: 'View Details',
          }
        ],
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png'
      });

      // Send the notification
      await webpush.sendNotification(
        customer.pushSubscription as webpush.PushSubscription,
        payload
      );

      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Send a booking reminder notification
   */
  async sendBookingReminder(
    customerId: number,
    bookingId: number,
    bookingDate: string,
    bookingTime: string,
    serviceType: string
  ): Promise<boolean> {
    const title = 'Upcoming Appointment Reminder';
    const body = `Your ${serviceType} appointment is scheduled for ${bookingDate} at ${bookingTime}. We're looking forward to seeing you soon!`;
    
    return this.sendNotification(customerId, title, body, {
      bookingId,
      type: 'reminder',
      bookingDate,
      bookingTime,
    });
  }

  /**
   * Send a booking confirmation notification
   */
  async sendBookingConfirmation(
    customerId: number,
    bookingId: number,
    bookingDate: string,
    bookingTime: string,
    serviceType: string
  ): Promise<boolean> {
    const title = 'Booking Confirmed';
    const body = `Your ${serviceType} appointment for ${bookingDate} at ${bookingTime} has been confirmed. Thank you for booking with us!`;
    
    return this.sendNotification(customerId, title, body, {
      bookingId,
      type: 'confirmation',
      bookingDate,
      bookingTime,
    });
  }

  /**
   * Send a booking cancellation notification
   */
  async sendBookingCancellation(
    customerId: number,
    bookingDate: string,
    bookingTime: string,
    serviceType: string
  ): Promise<boolean> {
    const title = 'Booking Cancelled';
    const body = `Your ${serviceType} appointment for ${bookingDate} at ${bookingTime} has been cancelled.`;
    
    return this.sendNotification(customerId, title, body, {
      type: 'cancellation',
      bookingDate,
      bookingTime,
    });
  }
}

export const pushNotificationService = new PushNotificationService();