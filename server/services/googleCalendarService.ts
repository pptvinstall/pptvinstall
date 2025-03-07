import { google, calendar_v3 } from 'googleapis';
import { logger } from "./loggingService";

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
    logger.debug('Initializing Google Calendar Service', {
      calendarIdPresent: !!calendarId,
      apiKeyPresent: !!apiKey
    });

    this.calendar = google.calendar({
      version: 'v3',
      auth: apiKey
    });
  }

  /**
   * Get all blocked time slots for a date range
   */
  async getBlockedTimeSlots(
    startDate: Date,
    endDate: Date
  ): Promise<{ [key: string]: string[] }> {
    logger.debug('Fetching blocked time slots', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });
    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        q: 'BLOCKED', // Search for events marked as blocked
        singleEvents: true,
        orderBy: 'startTime'
      });

      const blockedSlots: { [key: string]: string[] } = {};

      for (const event of response.data.items || []) {
        if (event.start?.dateTime) {
          const eventDate = new Date(event.start.dateTime);
          const dateKey = eventDate.toISOString().split('T')[0];
          const timeString = eventDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          if (!blockedSlots[dateKey]) {
            blockedSlots[dateKey] = [];
          }
          blockedSlots[dateKey].push(timeString);
        }
      }
      logger.debug('Blocked time slots fetched successfully', blockedSlots);
      return blockedSlots;
    } catch (error) {
      logger.error('Error fetching blocked time slots:', error);
      return {};
    }
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
      logger.debug('Starting blockTimeSlot operation', {
        date,
        startTime,
        endTime,
        reason
      });

      // Convert time format (e.g., "6:30 PM") to 24-hour format
      const parseTime = (timeStr: string): { hours: number; minutes: number } => {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);

        if (period === 'PM' && hours !== 12) {
          hours += 12;
        } else if (period === 'AM' && hours === 12) {
          hours = 0;
        }

        return { hours, minutes };
      };

      // Parse start time
      const startParsed = parseTime(startTime);
      // Parse end time - for 30 minute blocks
      const endParsed = parseTime(endTime);

      // Create Date objects with proper timezone
      const startDateTime = new Date(date);
      startDateTime.setHours(startParsed.hours, startParsed.minutes, 0, 0);

      const endDateTime = new Date(date);
      endDateTime.setHours(endParsed.hours, endParsed.minutes, 0, 0);

      // Validate times
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        logger.error('Invalid date/time values', null, {
          date,
          startTime,
          endTime,
          startDateTime,
          endDateTime
        });
        return false;
      }

      logger.debug('Creating calendar event', {
        date,
        startTime,
        endTime,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString()
      });

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
        colorId: '11', // Red color
      };

      await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: event,
      });

      logger.info('Successfully blocked time slot', {
        date,
        startTime,
        endTime
      });

      return true;
    } catch (error) {
      logger.error('Error blocking time slot', error as Error, {
        date,
        startTime,
        endTime,
        reason
      });
      return false;
    }
  }

  /**
   * Unblock a previously blocked time slot
   */
  async unblockTimeSlot(eventId: string): Promise<boolean> {
    logger.debug('Starting unblockTimeSlot operation', { eventId });
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId
      });
      logger.info('Successfully unblocked time slot', { eventId });
      return true;
    } catch (error) {
      logger.error('Error unblocking time slot:', error);
      return false;
    }
  }

  /**
   * Set a recurring blocked time slot
   */
  async setRecurringBlock(
    dayOfWeek: string,
    startTime: string,
    endTime: string,
    untilDate: string
  ): Promise<boolean> {
    logger.debug('Starting setRecurringBlock operation', { dayOfWeek, startTime, endTime, untilDate });
    try {
      // Get day number (0-6) from day name
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayNum = days.indexOf(dayOfWeek.toLowerCase());
      if (dayNum === -1) throw new Error('Invalid day of week');

      // Create a date for next occurrence of this day
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + ((7 + dayNum - startDate.getDay()) % 7));

      const event = {
        summary: 'BLOCKED - Recurring',
        start: {
          dateTime: `${startDate.toISOString().split('T')[0]}T${startTime}`,
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: `${startDate.toISOString().split('T')[0]}T${endTime}`,
          timeZone: 'America/New_York',
        },
        recurrence: [
          `RRULE:FREQ=WEEKLY;BYDAY=${this.getDayAbbreviation(dayNum)};UNTIL=${untilDate.split('T')[0].replace(/-/g, '')}`
        ],
        colorId: '11', // Red color
      };

      await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: event,
      });
      logger.info('Successfully set recurring block', { dayOfWeek, startTime, endTime, untilDate });
      return true;
    } catch (error) {
      logger.error('Error setting recurring block:', error);
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
    logger.debug('Starting setBusinessHours operation', businessHours);
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
      logger.info('Successfully set business hours', businessHours);
      return true;
    } catch (error) {
      logger.error('Error setting business hours:', error);
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
    logger.debug('Fetching unavailable time slots', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });
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
          const eventDate = new Date(event.start.dateTime);
          const dateKey = eventDate.toISOString().split('T')[0];
          const timeString = eventDate.toLocaleTimeString('en-US', {
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
      logger.debug('Unavailable time slots fetched successfully', unavailableByDate);
      return unavailableByDate;
    } catch (error) {
      logger.error('Error fetching calendar data:', error);
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
    logger.debug('Checking time slot availability', { date, timeSlot });
    // Check if the time slot is in the unavailable list
    const isAvailable = !unavailableSlots[date]?.includes(timeSlot);
    logger.debug('Time slot availability', { date, timeSlot, isAvailable });
    return isAvailable;
  }

  /**
   * Block an entire day
   */
  async blockFullDay(
    date: string,
    reason: string = "Day marked as unavailable"
  ): Promise<boolean> {
    logger.debug('Starting blockFullDay operation', { date, reason });
    try {
      const event = {
        summary: 'BLOCKED - Full Day',
        description: reason,
        start: {
          date: date, // Use date instead of dateTime for all-day events
          timeZone: 'America/New_York',
        },
        end: {
          date: date,
          timeZone: 'America/New_York',
        },
        colorId: '11', // Red color
      };

      await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: event,
      });
      logger.info('Successfully blocked full day', { date, reason });
      return true;
    } catch (error) {
      logger.error('Error blocking full day:', error);
      return false;
    }
  }

  /**
   * Get all blocked days
   */
  async getBlockedDays(
    startDate: Date,
    endDate: Date
  ): Promise<string[]> {
    logger.debug('Fetching blocked days', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });
    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        q: 'BLOCKED - Full Day', // Search for full day blocks
        singleEvents: true,
        orderBy: 'startTime'
      });

      const blockedDays: string[] = [];

      for (const event of response.data.items || []) {
        if (event.start?.date) { // date property exists for all-day events
          blockedDays.push(event.start.date);
        }
      }
      logger.debug('Blocked days fetched successfully', blockedDays);
      return blockedDays;
    } catch (error) {
      logger.error('Error fetching blocked days:', error);
      return [];
    }
  }
}

// Get API keys from environment variables
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || process.env.VITE_GOOGLE_CALENDAR_ID || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY || '';

logger.debug('API Key Present:', !!GOOGLE_API_KEY);
logger.debug('Calendar ID Present:', !!GOOGLE_CALENDAR_ID);

// Create and export a singleton instance
export const googleCalendarService = new GoogleCalendarService(
  GOOGLE_CALENDAR_ID,
  GOOGLE_API_KEY
);