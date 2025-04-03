import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  appointmentTime: z.string().min(1, "Please select a time"),
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
  const [displayDate, setDisplayDate] = useState<string>('');
  
  useEffect(() => {
    if (booking?.preferredDate) {
      try {
        const date = new Date(booking.preferredDate);
        setDisplayDate(date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }));
      } catch (error) {
        console.error("Error formatting date:", error);
        setDisplayDate(String(booking.preferredDate));
      }
    }
  }, [booking]);

  // Setup the form with default values from the booking
  const form = useForm<BookingUpdateFormValues>({
    resolver: zodResolver(bookingUpdateSchema),
    defaultValues: {
      appointmentTime: booking?.appointmentTime || "",
      notes: booking?.notes || "",
    },
  });

  // Function to handle form submission
  function onSubmit(data: BookingUpdateFormValues) {    
    onUpdate({
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
          <h2 className="text-xl font-bold">Update Your Booking</h2>
          <p className="text-sm text-gray-500">
            Change your appointment time or add special instructions.
          </p>
        </div>
        
        {/* Current Booking Info */}
        <div className="bg-gray-100 p-4 rounded-md mb-4">
          <div className="flex items-center mb-2">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            <h3 className="font-medium">Appointment Details</h3>
          </div>
          
          <div className="text-sm space-y-2">
            <div>
              <span className="font-medium">Date:</span> {displayDate}
            </div>
            <div>
              <span className="font-medium">Current Time:</span> {booking.appointmentTime || 'Not set'}
            </div>
            <div>
              <span className="font-medium">Service:</span> {booking.serviceType}
            </div>
            <div>
              <span className="font-medium">Address:</span> {booking.streetAddress}, {booking.city}, {booking.state} {booking.zipCode}
            </div>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Time Input */}
            <FormField
              control={form.control}
              name="appointmentTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Time</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 2:30 PM" {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-gray-500">Format: 2:30 PM, 5:00 PM, etc.</p>
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