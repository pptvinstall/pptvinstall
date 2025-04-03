import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RescheduleDialogProps {
  bookingId: number | string;
  currentDate: Date | string | undefined;
  currentTime: string | undefined;
  onRescheduleSuccess?: (newDate: Date, newTime: string) => void;
  disabled?: boolean;
  trigger?: React.ReactNode;
}

export function RescheduleDialog({
  bookingId,
  currentDate,
  currentTime,
  onRescheduleSuccess,
  disabled = false,
  trigger,
}: RescheduleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    currentDate ? new Date(currentDate) : undefined
  );
  const [selectedTime, setSelectedTime] = useState<string | undefined>(currentTime);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get business hours
  const businessHoursQuery = useQuery({
    queryKey: ['/api/business-hours'],
    queryFn: async () => {
      const response = await fetch('/api/business-hours');
      if (!response.ok) {
        throw new Error('Failed to fetch business hours');
      }
      return response.json();
    },
  });

  // Get booking buffer
  const bookingBufferQuery = useQuery({
    queryKey: ['/api/system-settings/booking-buffer'],
    queryFn: async () => {
      const response = await fetch('/api/system-settings/booking-buffer');
      if (!response.ok) {
        throw new Error('Failed to fetch booking buffer');
      }
      return response.json();
    },
  });

  // Get existing bookings to check availability
  const existingBookingsQuery = useQuery({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const response = await fetch('/api/bookings');
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      return response.json();
    },
  });

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, date, time }: { id: number | string; date: Date; time: string }) => {
      const response = await fetch(`/api/customers/bookings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: format(date, 'yyyy-MM-dd'),
          time,
          status: 'rescheduled',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reschedule booking');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Booking Rescheduled',
        description: `Your appointment has been rescheduled successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customers', 'bookings'] });
      
      if (selectedDate && selectedTime && onRescheduleSuccess) {
        onRescheduleSuccess(selectedDate, selectedTime);
      }
      
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to reschedule booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Generate available appointment times for selected date
  useEffect(() => {
    if (!selectedDate || !businessHoursQuery.data?.businessHours || !bookingBufferQuery.data?.bookingBuffer) {
      return;
    }

    setIsLoading(true);

    try {
      const dayOfWeek = selectedDate.getDay();
      const businessHoursForDay = businessHoursQuery.data.businessHours.find(
        (hours: any) => hours.dayOfWeek === dayOfWeek
      );

      if (!businessHoursForDay || !businessHoursForDay.isOpen) {
        setAvailableTimes([]);
        setIsLoading(false);
        return;
      }

      // Get start and end time
      const [startHour, startMinute] = businessHoursForDay.openTime.split(':').map(Number);
      const [endHour, endMinute] = businessHoursForDay.closeTime.split(':').map(Number);

      const bookingBuffer = bookingBufferQuery.data.bookingBuffer;
      const bufferMinutes = bookingBuffer.value ? parseInt(bookingBuffer.value) : 60;

      // Generate time slots
      const timeSlots: string[] = [];
      let currentHour = startHour;
      let currentMinute = startMinute;

      while (
        currentHour < endHour ||
        (currentHour === endHour && currentMinute < endMinute - bufferMinutes)
      ) {
        const formattedHour = currentHour % 12 === 0 ? 12 : currentHour % 12;
        const period = currentHour < 12 ? 'AM' : 'PM';
        const formattedMinute = currentMinute.toString().padStart(2, '0');
        const timeString = `${formattedHour}:${formattedMinute} ${period}`;

        timeSlots.push(timeString);

        // Increment by buffer minutes
        currentMinute += bufferMinutes;
        if (currentMinute >= 60) {
          currentHour += Math.floor(currentMinute / 60);
          currentMinute %= 60;
        }
      }

      // Filter out already booked times
      if (existingBookingsQuery.data?.bookings) {
        const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
        const bookingsForSelectedDate = existingBookingsQuery.data.bookings.filter(
          (booking: any) => booking.date === formattedSelectedDate && booking.id.toString() !== bookingId.toString()
        );

        const bookedTimes = new Set(bookingsForSelectedDate.map((booking: any) => booking.time));
        const availableTimes = timeSlots.filter((time) => !bookedTimes.has(time));
        
        setAvailableTimes(availableTimes);
      } else {
        setAvailableTimes(timeSlots);
      }
    } catch (error) {
      console.error('Error generating time slots:', error);
      setAvailableTimes([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedDate,
    businessHoursQuery.data,
    bookingBufferQuery.data,
    existingBookingsQuery.data,
    bookingId,
  ]);

  // Auto-select the earliest available time when times are available
  useEffect(() => {
    if (availableTimes.length > 0 && !selectedTime) {
      setSelectedTime(availableTimes[0]);
    }
  }, [availableTimes, selectedTime]);

  const handleReschedule = () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: 'Error',
        description: 'Please select both a date and time for your appointment',
        variant: 'destructive',
      });
      return;
    }

    updateBookingMutation.mutate({
      id: bookingId,
      date: selectedDate,
      time: selectedTime,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" disabled={disabled}>
            Reschedule Appointment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
          <DialogDescription>
            Select a new date and time for your appointment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="date" className="text-sm font-medium">
              Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "EEEE, MMMM d, yyyy")
                  ) : (
                    <span>Select a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedTime(undefined); // Reset time when date changes
                  }}
                  disabled={(date) => {
                    // Disable dates in the past
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <label htmlFor="time" className="text-sm font-medium">
              Time
            </label>
            <div className="grid grid-cols-3 gap-2">
              {isLoading ? (
                <div className="col-span-3 flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : availableTimes.length === 0 ? (
                <div className="col-span-3 text-center py-4 text-muted-foreground">
                  {selectedDate
                    ? "No available times for the selected date"
                    : "Please select a date first"}
                </div>
              ) : (
                availableTimes.map((time) => (
                  <Button
                    key={time}
                    type="button"
                    variant={selectedTime === time ? "default" : "outline"}
                    size="sm"
                    className="gap-1"
                    onClick={() => setSelectedTime(time)}
                  >
                    <Clock className="h-3 w-3" />
                    {time}
                  </Button>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleReschedule}
            disabled={!selectedDate || !selectedTime || updateBookingMutation.isPending}
          >
            {updateBookingMutation.isPending ? "Rescheduling..." : "Confirm Reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}