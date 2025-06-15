import { useEffect, useState, useCallback } from 'react';
import { addDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

// Define the interface for unavailable time slots
export interface UnavailableTimeSlot {
  date: string; // ISO format date
  timeSlots: string[]; // Array of time strings like "7:30 PM"
}

/**
 * Hook to fetch and manage calendar availability data
 */
export function useCalendarAvailability() {
  // Cache availability data with React Query instead of local state
  const { data: unavailableSlots = [], isLoading, error } = useQuery({
    queryKey: ['calendar-availability'],
    queryFn: async () => {
      const today = new Date();
      // Look 30 days into the future
      const endDate = addDays(today, 30);

      // Use the server-side API endpoint
      const response = await fetch(
        `/api/calendar/availability?startDate=${today.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch availability: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        return data.unavailableSlots;
      } else {
        throw new Error(data.message || 'Unknown error fetching availability');
      }
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false // Don't refetch when window regains focus
  });

  /**
   * Check if a specific date and time slot is available
   * Uses a dedicated API endpoint to reduce client-side processing
   */
  const isTimeSlotAvailable = useCallback(async (date: string, timeSlot: string): Promise<boolean> => {
    try {
      // Use the specific time slot check endpoint
      const response = await fetch(
        `/api/calendar/checkTimeSlot?date=${date}&timeSlot=${encodeURIComponent(timeSlot)}`
      );

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
  }, []);

  return {
    isTimeSlotAvailable,
    isLoading,
    error,
    unavailableSlots
  };
}