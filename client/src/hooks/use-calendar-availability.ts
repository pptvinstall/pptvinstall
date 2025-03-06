import { useEffect, useState } from 'react';
import { addDays } from 'date-fns';
import { googleCalendarService, UnavailableTimeSlot } from '@/lib/googleCalendarService';

/**
 * Hook to fetch and manage calendar availability data
 */
export function useCalendarAvailability() {
  const [unavailableSlots, setUnavailableSlots] = useState<UnavailableTimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch unavailable time slots for the next 30 days
  useEffect(() => {
    async function fetchAvailability() {
      try {
        setIsLoading(true);
        setError(null);
        
        const today = new Date();
        // Look 30 days into the future
        const endDate = addDays(today, 30);
        
        const slots = await googleCalendarService.getUnavailableTimeSlots(today, endDate);
        setUnavailableSlots(slots);
      } catch (err) {
        console.error('Error fetching calendar availability:', err);
        setError(err instanceof Error ? err : new Error('Unknown error fetching availability'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchAvailability();
  }, []);

  /**
   * Check if a specific date and time slot is available
   */
  const isTimeSlotAvailable = (date: string, timeSlot: string): boolean => {
    // If we're still loading or encountered an error, assume the slot is available
    // This prevents blocking the booking flow on API failures
    if (isLoading || error) {
      console.warn('Calendar availability check bypassed due to loading or error state');
      return true;
    }
    
    return googleCalendarService.isTimeSlotAvailable(date, timeSlot, unavailableSlots);
  };

  return {
    isTimeSlotAvailable,
    isLoading,
    error,
    unavailableSlots
  };
}
