import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, Clock } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Booking } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface CustomerBookingDialogProps {
  booking?: Booking | null;
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

export function CustomerBookingDialog({
  booking,
  isOpen,
  onClose,
  onUpdate,
  isUpdating,
}: CustomerBookingDialogProps) {
  const { toast } = useToast();
  const [displayDate, setDisplayDate] = useState<string>('');
  
  useEffect(() => {
    if (booking?.preferredDate) {
      try {
        const date = new Date(booking.preferredDate);
        setDisplayDate(format(date, "EEEE, MMMM d, yyyy"));
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
  
  console.log("SimpleBookingDialog initialized with booking:", booking);

  // Function to handle form submission
  function onSubmit(data: BookingUpdateFormValues) {
    if (!booking) {
      toast({
        title: "Error",
        description: "No booking selected",
        variant: "destructive",
      });
      return;
    }
    
    onUpdate({
      appointmentTime: data.appointmentTime,
      notes: data.notes,
    });
  }

  if (!booking) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="dialog-content sm:max-w-[450px] w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-background rounded-t-xl sm:rounded-xl shadow-xl"
        onEscapeKeyDown={onClose}
        onOpenAutoFocus={(e) => {
          // Prevent autofocus
          e.preventDefault();
        }}>
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl">Update Your Booking</DialogTitle>
          <DialogDescription>
            Change your appointment time or add special instructions.
          </DialogDescription>
        </DialogHeader>
        
        {/* Current Booking Info */}
        <div className="bg-muted p-4 rounded-md mb-4">
          <div className="flex items-center mb-2">
            <Calendar className="w-5 h-5 mr-2 text-primary" />
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
                  <p className="text-xs text-muted-foreground">Format: 2:30 PM, 5:00 PM, etc.</p>
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
            
            <DialogFooter className="pt-4">
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