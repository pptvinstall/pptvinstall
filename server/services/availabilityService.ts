import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './loggingService';
import { db } from '../db';
import { businessHours } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Interface for time slot structure
 */
export interface TimeSlot {
  date: string;     // ISO format date (YYYY-MM-DD)
  time: string;     // Time string (e.g., "7:30 PM")
  reason?: string;  // Optional reason for blocking
}

/**
 * Interface for blocked days
 */
export interface BlockedDay {
  date: string;     // ISO format date (YYYY-MM-DD)
  reason?: string;  // Optional reason for blocking
}

/**
 * Interface for availability data structure
 */
interface AvailabilityData {
  blockedTimeSlots: TimeSlot[];
  blockedDays: BlockedDay[];
  lastUpdated: string;
}

// Get dirname for file storage
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const AVAILABILITY_FILE = path.join(DATA_DIR, 'availability.json');

// Ensure the directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize availability data if it doesn't exist
if (!fs.existsSync(AVAILABILITY_FILE)) {
  const initialData: AvailabilityData = {
    blockedTimeSlots: [],
    blockedDays: [],
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(AVAILABILITY_FILE, JSON.stringify(initialData, null, 2));
}

/**
 * Service for managing availability internally
 */
export class AvailabilityService {
  private availabilityData: AvailabilityData = {
    blockedTimeSlots: [],
    blockedDays: [],
    lastUpdated: new Date().toISOString()
  };

  constructor() {
    this.loadAvailabilityData();
  }

  /**
   * Load availability data from storage
   */
  private loadAvailabilityData(): void {
    try {
      const data = fs.readFileSync(AVAILABILITY_FILE, 'utf-8');
      this.availabilityData = JSON.parse(data);
      logger.debug('Availability data loaded successfully');
    } catch (error) {
      logger.error('Error loading availability data:', error as Error);
      // Initialize with default empty data
      this.availabilityData = {
        blockedTimeSlots: [],
        blockedDays: [],
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Save availability data to storage
   */
  private saveAvailabilityData(): void {
    try {
      this.availabilityData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(AVAILABILITY_FILE, JSON.stringify(this.availabilityData, null, 2));
      logger.debug('Availability data saved successfully');
    } catch (error) {
      logger.error('Error saving availability data:', error as Error);
    }
  }

  /**
   * Get all blocked time slots
   */
  getAllBlockedTimeSlots(): TimeSlot[] {
    return this.availabilityData.blockedTimeSlots;
  }

  /**
   * Get blocked time slots by date
   */
  getBlockedTimeSlotsForDate(date: string): TimeSlot[] {
    return this.availabilityData.blockedTimeSlots.filter(slot => slot.date === date);
  }

  /**
   * Get blocked time slots for date range
   */
  getBlockedTimeSlotsForDateRange(startDate: string, endDate: string): { [key: string]: string[] } {
    const result: { [key: string]: string[] } = {};
    
    // Convert dates to Date objects for comparison
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Filter time slots within the date range
    const relevantSlots = this.availabilityData.blockedTimeSlots.filter(slot => {
      const slotDate = new Date(slot.date);
      return slotDate >= start && slotDate <= end;
    });
    
    // Group by date
    for (const slot of relevantSlots) {
      if (!result[slot.date]) {
        result[slot.date] = [];
      }
      result[slot.date].push(slot.time);
    }
    
    return result;
  }

  /**
   * Block a specific time slot
   */
  blockTimeSlot(date: string, time: string, reason?: string): boolean {
    try {
      // Check if this time slot is already blocked
      const existingIndex = this.availabilityData.blockedTimeSlots.findIndex(
        slot => slot.date === date && slot.time === time
      );
      
      // If already blocked, update reason if provided
      if (existingIndex !== -1) {
        if (reason) {
          this.availabilityData.blockedTimeSlots[existingIndex].reason = reason;
        }
      } else {
        // Add new blocked time slot
        this.availabilityData.blockedTimeSlots.push({
          date,
          time,
          reason
        });
      }
      
      // Save changes
      this.saveAvailabilityData();
      logger.info('Time slot blocked successfully', { date, time });
      return true;
    } catch (error) {
      logger.error('Error blocking time slot:', error as Error);
      return false;
    }
  }

  /**
   * Block multiple time slots at once
   */
  blockTimeSlots(date: string, times: string[], reason?: string): boolean {
    try {
      let success = true;
      
      // Block each time slot
      for (const time of times) {
        const result = this.blockTimeSlot(date, time, reason);
        if (!result) {
          success = false;
        }
      }
      
      return success;
    } catch (error) {
      logger.error('Error blocking multiple time slots:', error as Error);
      return false;
    }
  }

  /**
   * Unblock a specific time slot
   */
  unblockTimeSlot(date: string, time: string): boolean {
    try {
      // Find and remove the time slot
      this.availabilityData.blockedTimeSlots = this.availabilityData.blockedTimeSlots.filter(
        slot => !(slot.date === date && slot.time === time)
      );
      
      // Save changes
      this.saveAvailabilityData();
      logger.info('Time slot unblocked successfully', { date, time });
      return true;
    } catch (error) {
      logger.error('Error unblocking time slot:', error as Error);
      return false;
    }
  }

  /**
   * Block an entire day
   */
  blockDay(date: string, reason?: string): boolean {
    try {
      // Check if this day is already blocked
      const existingIndex = this.availabilityData.blockedDays.findIndex(
        day => day.date === date
      );
      
      // If already blocked, update reason if provided
      if (existingIndex !== -1) {
        if (reason) {
          this.availabilityData.blockedDays[existingIndex].reason = reason;
        }
      } else {
        // Add new blocked day
        this.availabilityData.blockedDays.push({
          date,
          reason
        });
      }
      
      // Save changes
      this.saveAvailabilityData();
      logger.info('Day blocked successfully', { date });
      return true;
    } catch (error) {
      logger.error('Error blocking day:', error as Error);
      return false;
    }
  }

  /**
   * Unblock an entire day
   */
  unblockDay(date: string): boolean {
    try {
      // Remove the blocked day
      this.availabilityData.blockedDays = this.availabilityData.blockedDays.filter(
        day => day.date !== date
      );
      
      // Save changes
      this.saveAvailabilityData();
      logger.info('Day unblocked successfully', { date });
      return true;
    } catch (error) {
      logger.error('Error unblocking day:', error as Error);
      return false;
    }
  }

  /**
   * Get all blocked days
   */
  getBlockedDays(): BlockedDay[] {
    return this.availabilityData.blockedDays;
  }

  /**
   * Get blocked days for date range
   */
  getBlockedDaysForDateRange(startDate: string, endDate: string): string[] {
    // Convert dates to Date objects for comparison
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Filter days within the date range
    return this.availabilityData.blockedDays
      .filter(day => {
        const dayDate = new Date(day.date);
        return dayDate >= start && dayDate <= end;
      })
      .map(day => day.date);
  }

  /**
   * Check if a time slot is available
   */
  async isTimeSlotAvailable(date: string, time: string): Promise<boolean> {
    // Check if the day is blocked
    const isDayBlocked = this.availabilityData.blockedDays.some(day => day.date === date);
    if (isDayBlocked) {
      return false;
    }
    
    // Check if the specific time slot is blocked
    const isTimeSlotBlocked = this.availabilityData.blockedTimeSlots.some(
      slot => slot.date === date && slot.time === time
    );
    
    if (isTimeSlotBlocked) {
      return false;
    }
    
    // Check if the time is within business hours for that day
    try {
      // Get the day of week (0 = Sunday, 1 = Monday, ...)
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      
      // Get business hours for this day from the database
      const hoursForDay = await db.query.businessHours.findFirst({
        where: eq(businessHours.dayOfWeek, dayOfWeek)
      });
      
      // If no business hours set or the day is marked as unavailable
      if (!hoursForDay || !hoursForDay.isAvailable) {
        return false;
      }
      
      // Parse the requested time
      const timeComponents = time.match(/(\d+):(\d+)\s+(AM|PM)/i);
      if (!timeComponents) {
        return false;
      }
      
      let hour = parseInt(timeComponents[1], 10);
      const minute = parseInt(timeComponents[2], 10);
      const period = timeComponents[3].toUpperCase();
      
      // Convert to 24-hour format
      if (period === 'PM' && hour < 12) {
        hour += 12;
      } else if (period === 'AM' && hour === 12) {
        hour = 0;
      }
      
      // Parse business hours
      const startHour = parseInt(hoursForDay.startTime.split(':')[0], 10);
      const startMinute = parseInt(hoursForDay.startTime.split(':')[1], 10);
      
      const endHour = parseInt(hoursForDay.endTime.split(':')[0], 10);
      const endMinute = parseInt(hoursForDay.endTime.split(':')[1], 10);
      
      // Convert to minutes for easier comparison
      const requestedTimeInMinutes = hour * 60 + minute;
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;
      
      // Check if the requested time is within business hours
      return requestedTimeInMinutes >= startTimeInMinutes && requestedTimeInMinutes < endTimeInMinutes;
    } catch (error) {
      logger.error('Error checking business hours:', error as Error);
      // Default to unavailable if there's an error
      return false;
    }
  }
}

// Create and export a singleton instance
export const availabilityService = new AvailabilityService();