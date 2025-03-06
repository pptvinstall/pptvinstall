import { useEffect, useState } from 'react';
import { addDays } from 'date-fns';

// Define the interface for unavailable time slots
export interface UnavailableTimeSlot {
  date: string; // ISO format date
  timeSlots: string[]; // Array of time strings like "7:30 PM"
}

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

        // Use the new server-side API endpoint
        const response = await fetch(`/api/calendar/availability?startDate=${today.toISOString()}&endDate=${endDate.toISOString()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch availability: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setUnavailableSlots(data.unavailableSlots);
        } else {
          throw new Error(data.message || 'Unknown error fetching availability');
        }
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
  const isTimeSlotAvailable = async (date: string, timeSlot: string): Promise<boolean> => {
    // If we're still loading or encountered an error, assume the slot is available
    // This prevents blocking the booking flow on API failures
    if (isLoading || error) {
      console.warn('Calendar availability check bypassed due to loading or error state');
      return true;
    }

    try {
      // Use the specific time slot check endpoint
      const response = await fetch(`/api/calendar/checkTimeSlot?date=${date}&timeSlot=${encodeURIComponent(timeSlot)}`);

      if (!response.ok) {
        console.warn(`Error checking time slot availability: ${response.status}`);
        return true; // Fallback to available if API fails
      }

      const data = await response.json();
      return data.success ? data.isAvailable : true;
    } catch (err) {
      console.error('Error checking slot availability:', err);
      return true; // Fallback to available if API fails
    }
  };

  return {
    isTimeSlotAvailable,
    isLoading,
    error,
    unavailableSlots
  };
}