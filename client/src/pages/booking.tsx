import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { bookingSchema, type InsertBooking } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { BookingWizard } from "@/components/ui/booking-wizard";

export default function Booking() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
      console.log("Submitting booking data:", data);
      const response = await apiRequest("POST", "/api/booking", data);
      return response.json();
    },
    onSuccess: (response, variables) => {
      console.log("Booking success response:", response);

      // Store more comprehensive booking details in session storage
      // This provides a fallback if URL parameters fail
      try {
        if (response && response.id) {
          // Store both confirmation flag and booking details in session storage
          sessionStorage.setItem("bookingConfirmed", "true");
          sessionStorage.setItem("bookingDetails", JSON.stringify(response));
          sessionStorage.setItem("bookingId", response.id.toString());

          // Redirect with ID in URL
          setLocation(`/booking-confirmation?id=${response.id}`);
        } else {
          // Fallback if response doesn't contain ID
          sessionStorage.setItem("bookingConfirmed", "true");
          sessionStorage.setItem("bookingDetails", JSON.stringify(variables));
          setLocation("/booking-confirmation");
        }
      } catch (err) {
        console.error("Error storing booking details:", err);
        setLocation("/booking-confirmation");
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