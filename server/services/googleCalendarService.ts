import { google, calendar_v3 } from 'googleapis';
import { logger } from "./loggingService";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define the interface for unavailable time slots
export interface UnavailableTimeSlot {
  date: string; // ISO format date
  timeSlots: string[]; // Array of time strings like "7:30 PM"
}

// Get dirname for file storage
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const MOCK_CALENDAR_FILE = path.join(DATA_DIR, 'calendar_mock.json');

// Ensure the directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize mock calendar if it doesn't exist
if (!fs.existsSync(MOCK_CALENDAR_FILE)) {
  fs.writeFileSync(MOCK_CALENDAR_FILE, JSON.stringify({
    blockedTimeSlots: {},
    blockedDays: []
  }));
}

// Mock calendar event type
type MockCalendarEvent = {
  id: string;
  summary: string;
  description?: string;
  start: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  colorId?: string;
};

// Mock calendar data type
type MockCalendarData = {
  blockedTimeSlots: {
    [date: string]: string[];
  };
  blockedDays: string[];
  events?: MockCalendarEvent[];
};

/**
 * Service for interacting with Google Calendar API
 */
export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar | null;
  private calendarId: string;
  private useMock: boolean;

  constructor(calendarId: string, apiKey: string) {
    this.calendarId = calendarId;
    this.useMock = !calendarId || !apiKey;
    
    logger.debug('Initializing Google Calendar Service', {
      calendarIdPresent: !!calendarId,
      apiKeyPresent: !!apiKey,
      useMock: this.useMock
    });

    if (!this.useMock) {
      this.calendar = google.calendar({
        version: 'v3',
        auth: apiKey
      });
    } else {
      this.calendar = null;
      logger.info('Using mock calendar service');
    }
  }
  
  // Helper methods for mock calendar
  private loadMockCalendar(): MockCalendarData {
    try {
      const data = fs.readFileSync(MOCK_CALENDAR_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error loading mock calendar:', new Error('Failed to load mock calendar data'));
      return { blockedTimeSlots: {}, blockedDays: [] };
    }
  }
  
  private saveMockCalendar(data: MockCalendarData): void {
    try {
      fs.writeFileSync(MOCK_CALENDAR_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error('Error saving mock calendar:', new Error('Failed to save mock calendar data'));
    }
  }

  /**
   * Get all blocked time slots for a date range
   */
  async getBlockedTimeSlots(
    startDate: Date,
    endDate: Date
  ): Promise<{ [key: string]: string[] }> {
    logger.debug('Fetching blocked time slots', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });
    
    if (this.useMock) {
      // Use mock data
      logger.debug('Using mock data for blocked time slots');
      const mockData = this.loadMockCalendar();
      logger.debug('Blocked time slots fetched successfully from mock', mockData.blockedTimeSlots);
      return mockData.blockedTimeSlots;
    }
    
    try {
      if (!this.calendar) {
        throw new Error('Google Calendar client not initialized');
      }
      
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
      logger.error('Error fetching blocked time slots:', error as Error);
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

      // If using mock service, store in local file
      if (this.useMock) {
        logger.debug('Using mock calendar service for blockTimeSlot');
        const mockData = this.loadMockCalendar();
        
        // Add the time slot to blocked slots
        if (!mockData.blockedTimeSlots[date]) {
          mockData.blockedTimeSlots[date] = [];
        }
        
        // Only add if not already blocked
        if (!mockData.blockedTimeSlots[date].includes(startTime)) {
          mockData.blockedTimeSlots[date].push(startTime);
        }
        
        // Sort time slots for consistency
        mockData.blockedTimeSlots[date].sort();
        
        // Save updated mock data
        this.saveMockCalendar(mockData);
        
        logger.info('Successfully blocked time slot in mock calendar', {
          date,
          startTime,
          endTime
        });
        
        return true;
      }

      // Ensure calendar client is initialized
      if (!this.calendar) {
        throw new Error('Google Calendar client not initialized');
      }

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
        logger.error('Invalid date/time values', new Error('Invalid date/time'), {
          date,
          startTime,
          endTime,
          startDateTime,
          endDateTime
        });
        return false;
      }

      // Ensure start time is before end time
      if (startDateTime >= endDateTime) {
        logger.error('Invalid time range: start time must be before end time', new Error('Invalid time range'), {
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
   * In mock mode, eventId should be in format "date|timeSlot" (e.g. "2023-01-01|9:00 AM")
   */
  async unblockTimeSlot(eventId: string): Promise<boolean> {
    logger.debug('Starting unblockTimeSlot operation', { eventId });
    
    // Handle mock mode
    if (this.useMock) {
      logger.debug('Using mock calendar service for unblockTimeSlot');
      
      try {
        // For mock mode, the eventId should be formatted as "date|timeSlot"
        const [date, timeSlot] = eventId.split('|');
        
        if (!date || !timeSlot) {
          logger.error('Invalid event ID format for mock unblock', new Error('Invalid format'), { eventId });
          return false;
        }
        
        const mockData = this.loadMockCalendar();
        
        if (mockData.blockedTimeSlots[date]) {
          // Remove the time slot
          mockData.blockedTimeSlots[date] = mockData.blockedTimeSlots[date].filter(
            time => time !== timeSlot
          );
          
          // If no time slots left for this date, remove the date entry
          if (mockData.blockedTimeSlots[date].length === 0) {
            delete mockData.blockedTimeSlots[date];
          }
          
          // Save updated mock data
          this.saveMockCalendar(mockData);
          
          logger.info('Successfully unblocked time slot in mock calendar', { date, timeSlot });
          return true;
        } else {
          logger.debug('No blocked time slots found for date', { date });
          return false;
        }
      } catch (error) {
        logger.error('Error unblocking time slot in mock calendar:', error as Error);
        return false;
      }
    }
    
    // Ensure calendar client is initialized
    if (!this.calendar) {
      logger.error('Google Calendar client not initialized', new Error('Calendar not initialized'));
      return false;
    }
    
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId
      });
      logger.info('Successfully unblocked time slot', { eventId });
      return true;
    } catch (error) {
      logger.error('Error unblocking time slot:', error as Error);
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
    
    // Use mock if needed
    if (this.useMock) {
      logger.debug('Using mock calendar service for setRecurringBlock');
      
      try {
        // Get day number (0-6) from day name
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayNum = days.indexOf(dayOfWeek.toLowerCase());
        if (dayNum === -1) throw new Error('Invalid day of week');
        
        // For mock mode, we would need a more complex implementation to generate all dates
        // between now and the untilDate for the specific day of week.
        // This is a simplified version that just logs it happened
        logger.info('Mock recurring block set successfully', { 
          dayOfWeek, 
          startTime, 
          endTime,
          untilDate,
          note: 'Mock mode does not fully implement recurring blocks' 
        });
        
        return true;
      } catch (error) {
        logger.error('Error setting recurring block in mock calendar:', error as Error);
        return false;
      }
    }
    
    // Ensure calendar client is initialized
    if (!this.calendar) {
      logger.error('Google Calendar client not initialized', new Error('Calendar not initialized'));
      return false;
    }
    
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
      logger.error('Error setting recurring block:', error as Error);
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
    
    // Use mock if needed
    if (this.useMock) {
      logger.debug('Using mock calendar service for setBusinessHours');
      
      try {
        // In mock mode, we could store business hours in the mock data
        // For simplicity, we'll just log the operation
        logger.info('Mock business hours set successfully', { 
          businessHours,
          note: 'Mock mode stores business hours but does not actively use them' 
        });
        
        return true;
      } catch (error) {
        logger.error('Error setting business hours in mock calendar:', error as Error);
        return false;
      }
    }
    
    // Ensure calendar client is initialized
    if (!this.calendar) {
      logger.error('Google Calendar client not initialized', new Error('Calendar not initialized'));
      return false;
    }
    
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
      logger.error('Error setting business hours:', error as Error);
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
    
    // Use mock data if needed
    if (this.useMock) {
      logger.debug('Using mock data for unavailable time slots');
      const mockData = this.loadMockCalendar();
      logger.debug('Unavailable time slots fetched successfully from mock', mockData.blockedTimeSlots);
      return mockData.blockedTimeSlots;
    }
    
    // Ensure calendar client is initialized
    if (!this.calendar) {
      logger.error('Google Calendar client not initialized', new Error('Calendar not initialized'));
      return {};
    }
    
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
      logger.error('Error fetching calendar data:', error as Error);
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
    
    // Use mock if needed
    if (this.useMock) {
      logger.debug('Using mock calendar service for blockFullDay');
      const mockData = this.loadMockCalendar();
      
      // Only add if not already blocked
      if (!mockData.blockedDays.includes(date)) {
        mockData.blockedDays.push(date);
        // Sort for consistency
        mockData.blockedDays.sort();
      }
      
      // Save updated mock data
      this.saveMockCalendar(mockData);
      
      logger.info('Successfully blocked full day in mock calendar', { date, reason });
      return true;
    }
    
    // Ensure calendar client is initialized
    if (!this.calendar) {
      logger.error('Google Calendar client not initialized', new Error('Calendar not initialized'));
      return false;
    }
    
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
      logger.error('Error blocking full day:', error as Error);
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
    
    // Use mock data if needed
    if (this.useMock) {
      logger.debug('Using mock data for blocked days');
      const mockData = this.loadMockCalendar();
      logger.debug('Blocked days fetched successfully from mock', mockData.blockedDays);
      return mockData.blockedDays;
    }
    
    // Ensure calendar client is initialized
    if (!this.calendar) {
      logger.error('Google Calendar client not initialized', new Error('Calendar not initialized'));
      return [];
    }
    
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
      logger.error('Error fetching blocked days:', error as Error);
      return [];
    }
  }
}

// Get API keys from environment variables
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || process.env.VITE_GOOGLE_CALENDAR_ID || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY || '';

// Check if these are valid keys or just placeholders
const isPlaceholder = (value: string) => {
  return value.includes('your_') || value === '';
};

// Determine if we should use real credentials or mock mode
const useRealCredentials = !isPlaceholder(GOOGLE_CALENDAR_ID) && !isPlaceholder(GOOGLE_API_KEY);

logger.debug(`API Key Present: ${!!GOOGLE_API_KEY}`, {});
logger.debug(`Calendar ID Present: ${!!GOOGLE_CALENDAR_ID}`, {});
logger.debug(`Using real credentials: ${useRealCredentials}`, {
  calendarIdIsPlaceholder: isPlaceholder(GOOGLE_CALENDAR_ID),
  apiKeyIsPlaceholder: isPlaceholder(GOOGLE_API_KEY)
});

// Create and export a singleton instance
// Force mock mode if we have placeholder keys
export const googleCalendarService = new GoogleCalendarService(
  useRealCredentials ? GOOGLE_CALENDAR_ID : '',
  useRealCredentials ? GOOGLE_API_KEY : ''
);