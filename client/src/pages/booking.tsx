import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom"; 
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { bookingSchema, type InsertBooking } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { BookingWizard } from "@/components/ui/booking-wizard";

export default function Booking() {
  const { toast } = useToast();
  const location = useLocation(); // Use useLocation correctly
  const navigate = useNavigate(); 


  // Fetch existing bookings for selected date
  const { data: existingBookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const response = await fetch("/api/bookings");
      if (!response.ok) {
        console.error(`Error fetching bookings: ${response.status}`);
        return [];
      }
      return response.json();
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertBooking) => {
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking');
      }

      const result = await response.json();
      console.log("Booking success response:", result);
      return result;
    },
    onSuccess: (data) => {
      // Store the booking data and ID in session storage for retrieval
      if (data.booking) {
        const bookingId = data.booking.id;

        // Clear any previous booking data first
        sessionStorage.clear();

        // Store all booking information
        sessionStorage.setItem('bookingId', bookingId);

        // Store the entire booking data including smart home items if present
        const bookingWithSmartHome = {
          ...data.booking,
          smartHomeItems: formData.smartHome || []
        };

        // Log what we're storing for debugging
        console.log("Storing booking data in session:", bookingWithSmartHome);

        // Stringify and store the complete booking data
        sessionStorage.setItem('bookingData', JSON.stringify(bookingWithSmartHome));

        // Store appointment time separately for redundancy
        if (data.booking.appointmentTime) {
          sessionStorage.setItem('appointmentTime', data.booking.appointmentTime);
        }

        // Small delay to ensure storage is complete before navigation
        setTimeout(() => {
          // Redirect to confirmation page
          navigate(`/booking-confirmation?id=${bookingId}`);
        }, 100);
      }

      toast({
        title: "Booking successful!",
        description: "You will receive a confirmation email shortly.",
      });
    },
    onError: (error) => {
      console.error("Booking error:", error);
      toast({
        title: "Booking failed",
        description: "There was an error processing your booking.",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <motion.div
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-bold mb-4">Book Your Installation</h1>
            <p className="text-xl text-gray-600">
              Schedule your TV mounting or smart home installation service
            </p>
          </motion.div>

          <BookingWizard
            onSubmit={(data) => mutation.mutate(data as InsertBooking)}
            isSubmitting={mutation.isPending}
            existingBookings={existingBookings}
            isLoadingBookings={isLoadingBookings}
          />
        </motion.div>
      </div>
    </div>
  );
}