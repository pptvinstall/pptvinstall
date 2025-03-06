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
  
  /**
   * Initialize the Google Calendar service
   * @param calendarId - The ID of the calendar to use for availability checking
   * @param apiKey - Google API key for accessing calendar data
   */
  constructor(calendarId: string, apiKey: string) {
    this.calendarId = calendarId;
    
    // Initialize the Google Calendar API client
    this.calendar = google.calendar({
      version: 'v3',
      auth: apiKey
    });
  }

  /**
   * Fetch unavailable time slots from Google Calendar
   * @param startDate - The start date to check for availability
   * @param endDate - The end date to check for availability
   * @returns Promise with an array of unavailable time slots
   */
  async getUnavailableTimeSlots(
    startDate: Date, 
    endDate: Date
  ): Promise<UnavailableTimeSlot[]> {
    try {
      // Format dates for the Google Calendar API
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
      
      // Group events by date
      const unavailableByDate: Record<string, string[]> = {};
      
      for (const event of events) {
        if (event.start?.dateTime) {
          // Parse the event start time
          const eventStart = new Date(event.start.dateTime);
          
          // Format the date as YYYY-MM-DD for grouping
          const dateKey = eventStart.toISOString().split('T')[0];
          
          // Format the time as "7:30 PM"
          const timeString = eventStart.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          
          // Add to the unavailable slots for this date
          if (!unavailableByDate[dateKey]) {
            unavailableByDate[dateKey] = [];
          }
          
          unavailableByDate[dateKey].push(timeString);
        }
      }
      
      // Convert to the expected return format
      return Object.entries(unavailableByDate).map(([date, timeSlots]) => ({
        date,
        timeSlots
      }));
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      return [];
    }
  }

  /**
   * Check if a specific date and time is available
   * @param date - The date to check in YYYY-MM-DD format
   * @param timeSlot - The time slot to check (e.g., "7:30 PM")
   * @param unavailableSlots - Array of unavailable time slots
   * @returns boolean indicating if the slot is available
   */
  isTimeSlotAvailable(
    date: string,
    timeSlot: string,
    unavailableSlots: UnavailableTimeSlot[]
  ): boolean {
    // Find the unavailable slots for this date
    const dateUnavailable = unavailableSlots.find(slot => slot.date === date);
    
    // If no unavailable slots for this date, the time is available
    if (!dateUnavailable) {
      return true;
    }
    
    // Check if the time slot is in the unavailable list
    return !dateUnavailable.timeSlots.includes(timeSlot);
  }
}

// Get API keys from environment variables
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

// Create and export a singleton instance
export const googleCalendarService = new GoogleCalendarService(
  GOOGLE_CALENDAR_ID,
  GOOGLE_API_KEY
);
