import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function BookingConfirmation() {
  const [location] = useLocation();
  // Extract the ID from the URL using URLSearchParams
  const searchParams = new URLSearchParams(location?.split('?')[1] || "");
  const bookingId = searchParams.get('id');

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      const response = await fetch(`/api/bookings/${bookingId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch booking details');
      }
      return response.json();
    },
    enabled: !!bookingId
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-24 px-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-24 px-4 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Booking Not Found</h1>
        <p className="text-lg mb-8">Sorry, we couldn't find your booking. Please check your booking ID and try again.</p>
        <Link to="/book-now" className="inline-block bg-brand-blue-500 text-white py-3 px-6 rounded-lg font-medium">
          Book a New Appointment
        </Link>
      </div>
    );
  }

  // Create a safe booking object with all the expected properties
  const booking = data;
  // Handle missing fields gracefully
  const serviceType = booking.serviceType || "N/A";
  const preferredDate = booking.preferredDate || "N/A";
  const appointmentTime = booking.appointmentTime || "To be confirmed";
  const streetAddress = booking.streetAddress || "N/A";
  const city = booking.city || "N/A";
  const state = booking.state || "N/A";
  const zipCode = booking.zipCode || "N/A";
  const email = booking.email || "N/A";
  const name = booking.name || "Guest"; //Added default value for name


  // Rest of your component code that uses the booking data
  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <Card className="border-2 border-primary/10 shadow-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl">Booking Confirmed!</CardTitle>
          <CardDescription className="text-lg">
            Thank you for booking with us, {name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-2">
              <h3 className="font-medium">Booking Details:</h3>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <div className="text-muted-foreground">Service:</div>
                <div>{serviceType}</div>
                <div className="text-muted-foreground">Date:</div>
                <div>{preferredDate}</div>
                <div className="text-muted-foreground">Time:</div>
                <div>{appointmentTime}</div>
                <div className="text-muted-foreground">Address:</div>
                <div>{streetAddress}, {city}, {state} {zipCode}</div>
              </div>
            </div>
            <div className="pt-4">
              <div className="grid gap-2">
                <h3 className="font-medium">What happens next?</h3>
                <p className="text-sm text-muted-foreground">
                  We've sent a confirmation email to {email} with all the details of your booking. 
                  Our team will contact you within 24 hours to confirm your appointment time.
                </p>
              </div>
            </div>
            <div className="pt-4 flex justify-center">
              <Link to="/">
                <Button className="w-full sm:w-auto">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Return to Homepage
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}