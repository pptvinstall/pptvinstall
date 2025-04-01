import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format, parse } from 'date-fns';

export interface BusinessHour {
  id?: number;
  dayOfWeek: number;  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string;  // 24-hour format HH:MM
  endTime: string;    // 24-hour format HH:MM
  isAvailable: boolean;
  updatedAt?: string;
}

/**
 * Hook to fetch and manage business hours
 */
export function useBusinessHours() {
  const {
    data: businessHours,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['/api/business-hours'],
    queryFn: async () => {
      console.log('Fetching business hours from API...');
      try {
        const res = await apiRequest('GET', '/api/business-hours');
        if (!res.ok) {
          console.error('API request failed:', res.status, res.statusText);
          throw new Error('Failed to fetch business hours');
        }
        const data = await res.json();
        console.log('Received business hours from API:', data);
        
        if (!data.businessHours || !Array.isArray(data.businessHours) || data.businessHours.length === 0) {
          console.warn('No business hours data received from API or in unexpected format');
          
          // Fallback to default hours if API returns empty data
          console.log('Using fallback business hours');
          return [
            { dayOfWeek: 0, startTime: '11:00', endTime: '19:00', isAvailable: true }, // Sunday
            { dayOfWeek: 1, startTime: '18:30', endTime: '22:30', isAvailable: true }, // Monday
            { dayOfWeek: 2, startTime: '18:30', endTime: '22:30', isAvailable: true }, // Tuesday
            { dayOfWeek: 3, startTime: '18:30', endTime: '22:30', isAvailable: true }, // Wednesday
            { dayOfWeek: 4, startTime: '18:30', endTime: '22:30', isAvailable: true }, // Thursday
            { dayOfWeek: 5, startTime: '18:30', endTime: '22:30', isAvailable: true }, // Friday
            { dayOfWeek: 6, startTime: '11:00', endTime: '19:00', isAvailable: true }, // Saturday
          ];
        }
        
        return data.businessHours;
      } catch (err) {
        console.error('Error fetching business hours:', err);
        throw err;
      }
    }
  });

  /**
   * Get business hours for a specific day of the week
   * @param dayOfWeek Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
   */
  const getBusinessHoursForDay = useCallback((dayOfWeek: number): BusinessHour | undefined => {
    if (!businessHours) return undefined;
    return businessHours.find((hours: BusinessHour) => hours.dayOfWeek === dayOfWeek);
  }, [businessHours]);

  /**
   * Get time slots for a specific date based on business hours
   * @param date Date to get time slots for
   * @param intervalMinutes Interval between time slots in minutes (default: 60)
   */
  const getTimeSlotsForDate = useCallback((date: Date, intervalMinutes: number = 60): string[] => {
    // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeek = date.getDay();
    
    console.log(`Generating time slots for day of week: ${dayOfWeek} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]})`);
    console.log(`Business hours data:`, businessHours);
    
    // Get business hours for this day
    const hoursForDay = getBusinessHoursForDay(dayOfWeek);
    console.log(`Hours for day ${dayOfWeek}:`, hoursForDay);
    
    // If no business hours set or the day is marked as unavailable, return empty array
    if (!hoursForDay || !hoursForDay.isAvailable) {
      console.log(`No business hours for day ${dayOfWeek} or it's marked as unavailable`);
      return [];
    }
    
    // Parse start and end times (assuming 24-hour format HH:MM)
    const [startHour, startMinute] = hoursForDay.startTime.split(':').map(Number);
    const [endHour, endMinute] = hoursForDay.endTime.split(':').map(Number);
    
    console.log(`Business hours: ${startHour}:${startMinute} - ${endHour}:${endMinute}`);
    
    // Create date objects that ensure we're working with the correct date 
    // regardless of timezone by using explicit components
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    // Create a date object for the selected date with the start time
    const startDate = new Date(year, month, day, startHour, startMinute, 0, 0);
    
    // Create a date object for the selected date with the end time
    const endDate = new Date(year, month, day, endHour, endMinute, 0, 0);
    
    console.log(`Start time: ${startDate.toISOString()}, End time: ${endDate.toISOString()}`);
    
    // Calculate the number of slots between start and end time
    const totalMinutes = (endDate.getTime() - startDate.getTime()) / 60000;
    const numSlots = Math.floor(totalMinutes / intervalMinutes);
    
    console.log(`Total minutes: ${totalMinutes}, Number of slots: ${numSlots}`);
    
    const timeSlots: string[] = [];
    
    // Generate time slots
    for (let i = 0; i < numSlots; i++) {
      const slotTime = new Date(startDate.getTime() + i * intervalMinutes * 60000);
      
      // Format as "h:mm A" (e.g., "9:00 AM", "1:30 PM")
      timeSlots.push(format(slotTime, 'h:mm a'));
    }
    
    console.log(`Generated ${timeSlots.length} time slots for ${format(date, 'yyyy-MM-dd')}:`, timeSlots);
    return timeSlots;
  }, [getBusinessHoursForDay]);

  /**
   * Check if a specific date & time is within business hours
   * @param date Date to check
   * @param timeStr Time string in "h:mm a" format (e.g., "9:00 AM")
   * @returns Boolean indicating if time is within business hours
   */
  const isWithinBusinessHours = useCallback((date: Date, timeStr: string): boolean => {
    const dayOfWeek = date.getDay();
    const hoursForDay = getBusinessHoursForDay(dayOfWeek);
    
    // If no business hours or day is marked as unavailable
    if (!hoursForDay || !hoursForDay.isAvailable) {
      return false;
    }
    
    // Parse the time string (e.g., "9:00 AM") to get hours/minutes
    // Create a new date object to avoid timezone issues when parsing
    const timeDate = parse(timeStr, 'h:mm a', new Date());
    
    // Get hours and minutes from the parsed time
    const hour = timeDate.getHours();
    const minute = timeDate.getMinutes();
    
    // Parse business hours
    const [startHour, startMinute] = hoursForDay.startTime.split(':').map(Number);
    const [endHour, endMinute] = hoursForDay.endTime.split(':').map(Number);
    
    // Convert to minutes for easier comparison
    const timeInMinutes = hour * 60 + minute;
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;
    
    // Check if the time is within business hours
    return timeInMinutes >= startTimeInMinutes && timeInMinutes < endTimeInMinutes;
  }, [getBusinessHoursForDay]);

  return {
    businessHours,
    isLoading,
    isError,
    error,
    getBusinessHoursForDay,
    getTimeSlotsForDate,
    isWithinBusinessHours
  };
}