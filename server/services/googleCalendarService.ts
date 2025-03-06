import { google, calendar_v3 } from 'googleapis';

// Define the interface for unavailable time slots
export interface UnavailableTimeSlot {
  date: string; // ISO format date
  timeSlots: string[]; // Array of time strings like "7:30 PM"
}

/**
 * Service for interacting with Google Calendar API
 */
export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;
  private calendarId: string;

  constructor(calendarId: string, apiKey: string) {
    this.calendarId = calendarId;

    this.calendar = google.calendar({
      version: 'v3',
      auth: apiKey
    });
  }

  /**
   * Block a specific time slot in the calendar
   */
  async blockTimeSlot(
    date: string,
    startTime: string,
    endTime: string,
    reason: string
  ): Promise<boolean> {
    try {
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      const event = {
        summary: 'BLOCKED - Not Available',
        description: reason,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/New_York',
        },
        // Use a specific color for blocked time slots
        colorId: '11', // Red color
      };

      await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: event,
      });

      return true;
    } catch (error) {
      console.error('Error blocking time slot:', error);
      return false;
    }
  }

  /**
   * Set business hours for specific days
   */
  async setBusinessHours(businessHours: {
    [key: string]: { // day of week (0-6, 0 is Sunday)
      start: string, // e.g., "09:00"
      end: string, // e.g., "17:00"
      available: boolean
    }
  }): Promise<boolean> {
    try {
      // First, remove existing business hours events
      const existingEvents = await this.calendar.events.list({
        calendarId: this.calendarId,
        q: 'BUSINESS_HOURS',
      });

      // Delete existing business hours events
      if (existingEvents.data.items) {
        for (const event of existingEvents.data.items) {
          if (event.id) {
            await this.calendar.events.delete({
              calendarId: this.calendarId,
              eventId: event.id,
            });
          }
        }
      }

      // Create new recurring events for each day's business hours
      for (const [dayNum, hours] of Object.entries(businessHours)) {
        if (!hours.available) continue;

        const event = {
          summary: 'BUSINESS_HOURS',
          start: {
            dateTime: `2024-01-0${parseInt(dayNum) + 1}T${hours.start}:00`,
            timeZone: 'America/New_York',
          },
          end: {
            dateTime: `2024-01-0${parseInt(dayNum) + 1}T${hours.end}:00`,
            timeZone: 'America/New_York',
          },
          recurrence: [
            `RRULE:FREQ=WEEKLY;BYDAY=${this.getDayAbbreviation(parseInt(dayNum))}`,
          ],
        };

        await this.calendar.events.insert({
          calendarId: this.calendarId,
          requestBody: event,
        });
      }

      return true;
    } catch (error) {
      console.error('Error setting business hours:', error);
      return false;
    }
  }

  private getDayAbbreviation(dayNum: number): string {
    const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    return days[dayNum];
  }

  /**
   * Fetch unavailable time slots from Google Calendar
   */
  async getUnavailableTimeSlots(
    startDate: Date, 
    endDate: Date
  ): Promise<{ [key: string]: string[] }> {
    try {
      const timeMin = startDate.toISOString();
      const timeMax = endDate.toISOString();

      // Fetch events from the calendar
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      const unavailableByDate: Record<string, string[]> = {};

      for (const event of events) {
        if (event.start?.dateTime) {
          const eventStart = new Date(event.start.dateTime);
          const dateKey = eventStart.toISOString().split('T')[0];
          const timeString = eventStart.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          if (!unavailableByDate[dateKey]) {
            unavailableByDate[dateKey] = [];
          }
          unavailableByDate[dateKey].push(timeString);
        }
      }

      return unavailableByDate;
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      return {};
    }
  }

  /**
   * Check if a specific date and time is available
   */
  isTimeSlotAvailable(
    date: string,
    timeSlot: string,
    unavailableSlots: { [key: string]: string[] }
  ): boolean {
    // Check if the time slot is in the unavailable list
    return !unavailableSlots[date]?.includes(timeSlot);
  }
}

// Get API keys from environment variables
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || process.env.VITE_GOOGLE_CALENDAR_ID || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY || '';

console.log('API Key Present:', !!GOOGLE_API_KEY);
console.log('Calendar ID Present:', !!GOOGLE_CALENDAR_ID);

// Create and export a singleton instance
export const googleCalendarService = new GoogleCalendarService(
  GOOGLE_CALENDAR_ID,
  GOOGLE_API_KEY
);