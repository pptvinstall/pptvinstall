import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

interface CalendarEvent {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location: string;
  attendeeEmail: string;
}

class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: any;

  constructor() {
    // For simplicity in development, we'll use a direct approach
    // In production, you would use service account authentication
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Initialize OAuth2 client - for development we'll assume success
   */
  async initialize() {
    try {
      // In a real implementation, you would handle OAuth flow or service account auth
      // For now, we'll proceed without full authentication to focus on the booking flow
      console.log('Google Calendar service initialized (development mode)');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Calendar service:', error);
      return false;
    }
  }

  /**
   * Check if a time slot is available (no conflicting events)
   * For development, we'll simulate availability checking
   */
  async isTimeSlotAvailable(startTime: Date, endTime: Date): Promise<boolean> {
    try {
      // In development mode, we'll simulate availability
      // In production, you would check the actual Google Calendar
      
      // For now, assume all slots within business hours are available
      // except for demonstration purposes where we might block some slots
      const hour = startTime.getHours();
      const dayOfWeek = startTime.getDay();
      
      // Check if within business hours
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Weekdays: 5:30 PM - 10:30 PM
        return hour >= 17 && hour < 22;
      } else if (dayOfWeek === 6 || dayOfWeek === 0) {
        // Weekends: 12:00 PM - 8:00 PM  
        return hour >= 12 && hour < 20;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking calendar availability:', error);
      return false;
    }
  }

  /**
   * Create a new calendar event for a booking
   */
  async createBookingEvent(eventData: CalendarEvent): Promise<string | null> {
    try {
      const event = {
        summary: eventData.title,
        location: eventData.location,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: 'America/New_York', // Atlanta timezone
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: 'America/New_York',
        },
        attendees: [
          { email: eventData.attendeeEmail }
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours before
            { method: 'email', minutes: 60 }, // 1 hour before
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        resource: event,
      });

      console.log('Calendar event created:', response.data.id);
      return response.data.id;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return null;
    }
  }

  /**
   * Get available time slots for a given date
   */
  async getAvailableSlots(date: Date): Promise<string[]> {
    const businessHours = this.getBusinessHours(date);
    if (!businessHours) return [];

    const availableSlots: string[] = [];
    const startOfDay = new Date(date);
    startOfDay.setHours(businessHours.start, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(businessHours.end, 0, 0, 0);

    // Generate 2-hour time slots
    for (let time = new Date(startOfDay); time < endOfDay; time.setHours(time.getHours() + 2)) {
      const slotEnd = new Date(time);
      slotEnd.setHours(slotEnd.getHours() + 2);

      // Check if slot is at least 4 hours from now
      const now = new Date();
      const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      
      if (time >= fourHoursFromNow) {
        const isAvailable = await this.isTimeSlotAvailable(time, slotEnd);
        if (isAvailable) {
          availableSlots.push(this.formatTimeSlot(time));
        }
      }
    }

    return availableSlots;
  }

  /**
   * Get business hours for a given date
   */
  private getBusinessHours(date: Date): { start: number; end: number } | null {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Weekdays: 5:30 PM - 10:30 PM
      return { start: 17, end: 22 }; // 17:30 - 22:30 in 24-hour format
    } else if (dayOfWeek === 6 || dayOfWeek === 0) {
      // Weekends: 12:00 PM - 8:00 PM
      return { start: 12, end: 20 };
    }
    
    return null;
  }

  /**
   * Format time slot for display
   */
  private formatTimeSlot(time: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    const endTime = new Date(time);
    endTime.setHours(endTime.getHours() + 2);
    
    return `${time.toLocaleTimeString('en-US', options)} - ${endTime.toLocaleTimeString('en-US', options)}`;
  }

  /**
   * Generate booking description for calendar event
   */
  generateBookingDescription(booking: any): string {
    const services = booking.services?.map((service: any) => `  - ${service.displayName}`).join('\n') || '';
    
    return `👤 Client Name: ${booking.fullName}
📍 Address: ${booking.address.street}, ${booking.address.city}, ${booking.address.state} ${booking.address.zipCode}
📧 Email: ${booking.email}
📞 Phone: ${booking.phone}
🛠 Services Booked:
${services}
💰 Final Price: $${booking.totalAmount}
📝 Notes: ${booking.notes || 'None'}`;
  }
}

export const googleCalendarService = new GoogleCalendarService();