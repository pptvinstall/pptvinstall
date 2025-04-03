import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, Clock } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { Booking } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useBusinessHours } from "@/hooks/use-business-hours";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CustomerBookingDialogProps {
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
    required_error: "Please select a time",
  }),
  notes: z.string().optional(),
});

type BookingUpdateFormValues = z.infer<typeof bookingUpdateSchema>;

export function CustomerBookingDialog({
  booking,
  isOpen,
  onClose,
  onUpdate,
  isUpdating,
}: CustomerBookingDialogProps) {
  const { toast } = useToast();
  const { getTimeSlotsForDate, getBusinessHoursForDay } = useBusinessHours();
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [timeSlotAvailability, setTimeSlotAvailability] = useState<Record<string, boolean>>({});
  const [bookingBufferHours, setBookingBufferHours] = useState<number>(2); // Default to 2 hours

  // Fetch booking buffer hours
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

  // Setup the form with default values from the booking
  const form = useForm<BookingUpdateFormValues>({
    resolver: zodResolver(bookingUpdateSchema),
    defaultValues: {
      // Make sure to properly parse the date string to a Date object
      preferredDate: booking.preferredDate ? 
        (typeof booking.preferredDate === 'string' ? new Date(booking.preferredDate) : 
         (typeof booking.preferredDate === 'object' ? new Date(booking.preferredDate) : new Date())) 
        : new Date(),
      appointmentTime: booking.appointmentTime || "",
      notes: booking.notes || "",
    },
  });
  
  console.log("CustomerBookingDialog initialized with booking:", booking);

  // Watch the date to update time slots
  const selectedDate = form.watch("preferredDate");

  // Update time slots when date changes
  useEffect(() => {
    if (selectedDate) {
      const slots = getTimeSlotsForDate(selectedDate, 60);
      setTimeSlots(slots);

      // Check availability for each time slot
      const availability: Record<string, boolean> = {};
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      for (const slot of slots) {
        // Skip checking for the current booking's time slot (it's available to itself)
        // Convert booking.preferredDate to a consistent format for comparison
        const bookingDateStr = typeof booking.preferredDate === 'string' ? 
          booking.preferredDate : 
          (booking.preferredDate && typeof booking.preferredDate === 'object' ? 
            format(new Date(booking.preferredDate), "yyyy-MM-dd") : '');
            
        if (dateStr === bookingDateStr && slot === booking.appointmentTime) {
          console.log(`Current booking time slot: ${dateStr} at ${slot} - marking as available`);
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
            // Normalize the booking date for comparison
            const bDate = typeof b.preferredDate === 'string' ? 
                          b.preferredDate : 
                          (b.preferredDate && typeof b.preferredDate === 'object' ? 
                          format(new Date(b.preferredDate), "yyyy-MM-dd") : '');
                          
            return bDate === dateStr && 
                   b.appointmentTime === slot && 
                   b.id !== booking.id && 
                   b.status === 'active';
          }
        );
        
        availability[`${dateStr}|${slot}`] = !conflictingBooking;
      }
      
      setTimeSlotAvailability(availability);
    }
  }, [selectedDate, existingBookings, getTimeSlotsForDate, booking.preferredDate, booking.appointmentTime, booking.id, bookingBufferHours]);

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
          <DialogDescription>
            Update your booking details. Changes you make will be confirmed via email.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Date Picker */}
            <FormField
              control={form.control}
              name="preferredDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Appointment Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "EEE, MMM d, yyyy")
                          ) : (
                            <span>Select a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
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
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Time Picker */}
            <FormField
              control={form.control}
              name="appointmentTime"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Appointment Time</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          {field.value ? field.value : <span>Select a time</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-2">
                        <div className="py-2 px-4 text-sm font-medium">
                          Available Time Slots
                        </div>
                        {timeSlots.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2 p-2 max-h-[300px] overflow-auto">
                            {timeSlots.map((time) => {
                              const isAvailable = isTimeSlotAvailable(selectedDate, time);
                              const key = `${format(selectedDate, 'yyyy-MM-dd')}|${time}`;
                              
                              return (
                                <Button
                                  key={time}
                                  type="button"
                                  variant={field.value === time ? "default" : "outline"}
                                  className={cn(
                                    "justify-start text-left font-normal",
                                    !isAvailable && "opacity-50 cursor-not-allowed"
                                  )}
                                  disabled={!isAvailable}
                                  onClick={() => field.onChange(time)}
                                >
                                  {time}
                                </Button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            No available time slots for the selected date.
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
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
                  <FormLabel>Special Instructions or Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional details or requests..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Updating..." : "Update Booking"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}