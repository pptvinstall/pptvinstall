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
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
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
    return <LoadingSpinner />;
  }

  if (error || !booking) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">Error Loading Booking Details</h1>
        <p className="mb-6">We encountered an issue retrieving your booking information.</p>
        <Link to="/" className="inline-flex items-center">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Return to Homepage
        </Link>
      </div>
    );
  }

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
            Thank you for booking with us, {booking.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-2">
              <h3 className="font-medium">Booking Details:</h3>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <div className="text-muted-foreground">Service:</div>
                <div>{booking.serviceType}</div>
                <div className="text-muted-foreground">Date:</div>
                <div>{booking.preferredDate}</div>
                <div className="text-muted-foreground">Time:</div>
                <div>{booking.appointmentTime || "To be confirmed"}</div>
                <div className="text-muted-foreground">Address:</div>
                <div>{booking.streetAddress}, {booking.city}, {booking.state} {booking.zipCode}</div>
              </div>
            </div>
            <div className="pt-4">
              <div className="grid gap-2">
                <h3 className="font-medium">What happens next?</h3>
                <p className="text-sm text-muted-foreground">
                  We've sent a confirmation email to {booking.email} with all the details of your booking. 
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