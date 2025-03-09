import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useLocation } from "wouter"; 
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { bookingSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { IntegratedBookingWizard } from "@/components/ui/integrated-booking-wizard";

export default function BookingPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation(); 

  // Fetch existing bookings for selected date
  const { data: existingBookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const response = await fetch("/api/bookings");
      if (!response.ok) {
        console.error(`Error fetching bookings: ${response.status}`);
        return [];
      }
      const data = await response.json();
      return data.bookings || [];
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Booking mutation received data:", data);

      // Use simple fetch instead of apiRequest to directly handle response
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log("API response status:", response.status);

      // Parse response JSON
      const responseData = await response.json();
      console.log("API response data:", responseData);

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to create booking');
      }

      return responseData;
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
          smartHomeItems: data.booking.smartHomeItems || []
        };

        // Additionally store the raw date to ensure it's preserved exactly
        if (data.booking.preferredDate) {
          sessionStorage.setItem('rawBookingDate', data.booking.preferredDate);
        }

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
          setLocation(`/booking-confirmation?id=${bookingId}`);
        }, 100);
      }

      toast({
        title: "Booking successful!",
        description: "You will receive a confirmation email shortly.",
      });
    },
    onError: (error: any) => {
      console.error("Booking error:", error);

      // Show more detailed error message if available
      const errorMessage = error.message || "There was an error processing your booking.";

      toast({
        title: "Booking failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Book Your Installation</h1>
            <p className="text-xl text-gray-600">
              Schedule your TV mounting or smart home installation service
            </p>
          </div>

          <IntegratedBookingWizard
            onSubmit={(data) => mutation.mutate(data)}
            isSubmitting={mutation.isPending}
            existingBookings={existingBookings}
            isLoadingBookings={isLoadingBookings}
          />
        </div>
      </div>
    </div>
  );
}