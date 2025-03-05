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

  // Parse the booking ID from the URL using native URLSearchParams
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
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

  // Parse detailed services if available
  let services: string[] = [];
  let serviceBreakdown: any[] = [];
  try {
    if (booking.detailedServices) {
      const detailedData = JSON.parse(booking.detailedServices);
      services = detailedData.services || [];
      serviceBreakdown = detailedData.serviceBreakdown || [];
    }
  } catch (e) {
    console.error("Error parsing detailed services:", e);
    // Fallback to service type if detailed services can't be parsed
    services = [booking.serviceType];
  }

  // Format date and handle time display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return "Date not available";
    }
  };

  // Use stored appointment time or extract from date
  const getTime = () => {
    if (booking.appointmentTime) {
      return booking.appointmentTime;
    }

    try {
      const date = new Date(booking.preferredDate);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } catch (e) {
      return "Time not available";
    }
  };

  // Format price from totalPrice field or default value
  const getTotalPrice = () => {
    if (booking.totalPrice) {
      return `$${parseFloat(booking.totalPrice).toFixed(2)}`;
    }
    return "Price not available";
  };

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Thank You for Booking!</h1>
        <p className="text-xl">Your installation has been scheduled.</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
          <CardDescription>
            A confirmation email has been sent to {booking.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div>
              <h3 className="font-medium mb-2">Appointment</h3>
              <div className="bg-muted p-4 rounded-lg">
                <div className="font-semibold">{formatDate(booking.preferredDate)}</div>
                <div>{getTime()}</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Service Details</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                {services.length > 0 ? (
                  services.map((service, index) => (
                    <div key={index} className="p-2 bg-background/50 rounded">
                      {service}
                    </div>
                  ))
                ) : (
                  <div>{booking.serviceType}</div>
                )}

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex justify-between font-semibold">
                    <span>Total Price:</span>
                    <span>{getTotalPrice()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Installation Address</h3>
              <div className="bg-muted p-4 rounded-lg">
                <div>{booking.streetAddress}</div>
                {booking.addressLine2 && <div>{booking.addressLine2}</div>}
                <div>{booking.city}, {booking.state} {booking.zipCode}</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Contact Information</h3>
              <div className="bg-muted p-4 rounded-lg">
                <div>{booking.name}</div>
                <div>{booking.email}</div>
                <div>{booking.phone}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center space-y-4">
        <h2 className="text-2xl font-semibold">What Happens Next?</h2>
        <p>
          One of our installation specialists will contact you before your scheduled 
          appointment to confirm the details. Please have your TV and other equipment 
          ready on the day of installation.
        </p>
        <div className="pt-6">
          <Link to="/" className="inline-flex items-center">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}