import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, Info } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { useBusinessHours } from "@/hooks/use-business-hours";
import { cn } from "@/lib/utils";
import type { Booking } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface MobileEditDialogProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: Partial<Booking>) => void;
  isUpdating: boolean;
}

// Schema for booking updates
const bookingUpdateSchema = z.object({
  preferredDate: z.date({
    required_error: "Please select a date",
  }),
  appointmentTime: z.string({
    required_error: "Please select a time"
  }).min(1, "Please select a time"),
  notes: z.string().optional(),
});

type BookingUpdateFormValues = z.infer<typeof bookingUpdateSchema>;

export function MobileEditDialog({
  booking,
  isOpen,
  onClose,
  onUpdate,
  isUpdating,
}: MobileEditDialogProps) {
  const { toast } = useToast();
  const { getTimeSlotsForDate, getBusinessHoursForDay } = useBusinessHours();
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [timeSlotAvailability, setTimeSlotAvailability] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [bookingBufferHours, setBookingBufferHours] = useState<number>(2);

  // Fetch booking buffer hours setting
  useEffect(() => {
    async function fetchBookingBuffer() {
      try {
        const response = await fetch("/api/system-settings/booking-buffer");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.bookingBufferHours !== undefined) {
            setBookingBufferHours(Number(data.bookingBufferHours));
          }
        }
      } catch (error) {
        console.error("Error fetching booking buffer setting:", error);
      }
    }
    
    fetchBookingBuffer();
  }, []);

  // Get existing bookings to check availability
  const { data: existingBookingsData } = useQuery({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      const response = await fetch("/api/bookings");
      const data = await response.json();
      return data;
    },
  });

  const existingBookings = existingBookingsData?.bookings || [];

  // Set initial date from booking
  useEffect(() => {
    if (booking?.preferredDate) {
      try {
        const date = new Date(booking.preferredDate);
        setSelectedDate(date);
      } catch (error) {
        console.error("Error parsing date:", error);
      }
    }
  }, [booking]);

  // Setup the form with default values from the booking
  const form = useForm<BookingUpdateFormValues>({
    resolver: zodResolver(bookingUpdateSchema),
    defaultValues: {
      preferredDate: booking?.preferredDate ? new Date(booking.preferredDate) : undefined,
      appointmentTime: booking?.appointmentTime || "",
      notes: booking?.notes || "",
    },
  });

  // Watch the date to update time slots
  const watchedDate = form.watch("preferredDate");

  // Update time slots when date changes
  useEffect(() => {
    if (!watchedDate) return;

    setSelectedDate(watchedDate);
    const slots = getTimeSlotsForDate(watchedDate, 60);
    setTimeSlots(slots);

    // Check availability for each time slot
    const availability: Record<string, boolean> = {};
    const dateStr = format(watchedDate, "yyyy-MM-dd");
    
    for (const slot of slots) {
      // Skip checking for the current booking's time slot (it's available to itself)
      const bookingDateStr = booking?.preferredDate ? 
        (typeof booking.preferredDate === 'string' ? 
          booking.preferredDate : 
          format(new Date(booking.preferredDate), "yyyy-MM-dd"))
        : '';
          
      if (dateStr === bookingDateStr && slot === booking?.appointmentTime) {
        availability[`${dateStr}|${slot}`] = true;
        continue;
      }

      // Check if slot is in the past
      const slotDate = new Date(dateStr);
      const timeMatch = slot.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3].toUpperCase();
        
        if (period === 'PM' && hours < 12) {
          hours += 12;
        } else if (period === 'AM' && hours === 12) {
          hours = 0;
        }
        
        slotDate.setHours(hours, minutes, 0, 0);
        
        const now = new Date();
        const bufferTime = new Date(now.getTime() + bookingBufferHours * 60 * 60 * 1000);
        
        if (slotDate <= bufferTime) {
          availability[`${dateStr}|${slot}`] = false;
          continue;
        }
      }

      // Check if slot conflicts with other bookings
      const conflictingBooking = existingBookings.find(
        (b: any) => {
          const bDate = typeof b.preferredDate === 'string' ? 
                        b.preferredDate : 
                        (b.preferredDate ? format(new Date(b.preferredDate), "yyyy-MM-dd") : '');
                        
          return bDate === dateStr && 
                b.appointmentTime === slot && 
                b.id !== booking?.id && 
                b.status === 'active';
        }
      );
      
      availability[`${dateStr}|${slot}`] = !conflictingBooking;
    }
    
    setTimeSlotAvailability(availability);
  }, [watchedDate, existingBookings, getTimeSlotsForDate, booking?.id, booking?.appointmentTime, booking?.preferredDate, bookingBufferHours]);

  // Check if a time slot is available
  const isTimeSlotAvailable = (date: Date, time: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const key = `${dateStr}|${time}`;
    return timeSlotAvailability[key] !== false;
  };

  // Function to handle form submission
  function onSubmit(data: BookingUpdateFormValues) {    
    // Format the date for the API
    const formattedDate = format(data.preferredDate, "yyyy-MM-dd");
    
    // Check if the selected time slot is available
    if (!isTimeSlotAvailable(data.preferredDate, data.appointmentTime)) {
      toast({
        title: "Time slot unavailable",
        description: "The selected time slot is no longer available. Please choose another time.",
        variant: "destructive",
      });
      return;
    }
    
    onUpdate({
      preferredDate: formattedDate,
      appointmentTime: data.appointmentTime,
      notes: data.notes,
    });
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div 
        className="bg-white w-full max-h-[85vh] overflow-y-auto rounded-t-xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2">
          <h2 className="text-xl font-bold">Reschedule Appointment</h2>
          <p className="text-sm text-muted-foreground">
            Change your appointment date, time or add special instructions.
          </p>
        </div>
        
        {/* Current Booking Info */}
        <div className="bg-muted p-4 rounded-md mb-4">
          <div className="flex items-center mb-2">
            <Info className="w-5 h-5 mr-2 text-primary" />
            <h3 className="font-medium">Current Details</h3>
          </div>
          
          <div className="text-sm space-y-2">
            <div>
              <span className="font-medium">Service:</span> {booking.serviceType}
            </div>
            <div>
              <span className="font-medium">Current Time:</span> {booking.preferredDate ? format(new Date(booking.preferredDate), "MMM d, yyyy") : ''} at {booking.appointmentTime || 'Not set'}
            </div>
            <div>
              <span className="font-medium">Address:</span> {booking.streetAddress}, {booking.city}, {booking.state} {booking.zipCode}
            </div>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Date Picker */}
            <FormField
              control={form.control}
              name="preferredDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Select New Date</FormLabel>
                  <div className="border rounded-md p-2">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        if (date) {
                          field.onChange(date);
                        }
                      }}
                      disabled={(date) => {
                        // Can't select dates in the past
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);
                        
                        // Can't select days when the business is closed
                        const businessHours = getBusinessHoursForDay(date.getDay());
                        const isClosed = !businessHours || !businessHours.isAvailable;
                        
                        return date < now || isClosed;
                      }}
                      initialFocus
                      className="rounded-md border-none"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Time Slot Selector */}
            <FormField
              control={form.control}
              name="appointmentTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select New Time</FormLabel>
                  <div className="border rounded-md p-2">
                    <div className="py-2 px-2 text-sm font-medium border-b mb-2">
                      Available Time Slots
                    </div>
                    {timeSlots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 p-2">
                        {timeSlots.map((time) => {
                          const isAvailable = isTimeSlotAvailable(selectedDate!, time);
                          
                          return (
                            <Button
                              key={time}
                              type="button"
                              variant={field.value === time ? "default" : "outline"}
                              className={cn(
                                "justify-center text-center w-full font-normal text-sm py-2 px-2",
                                !isAvailable && "opacity-50 cursor-not-allowed",
                                field.value === time && "bg-primary text-primary-foreground"
                              )}
                              disabled={!isAvailable}
                              onClick={() => field.onChange(time)}
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              {time}
                            </Button>
                          );
                        })}
                      </div>
                    ) : selectedDate ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No available time slots for the selected date.
                      </div>
                    ) : (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Please select a date first.
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Instructions (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional details or requests..."
                      className="resize-none h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Updating..." : "Update Booking"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}