import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function BookingConfirmation() {
  const [location] = useLocation();

  // Parse the booking ID from the URL using native URLSearchParams
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const bookingId = searchParams.get('id');

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['/api/bookings', bookingId],
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
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center justify-center p-2 bg-green-100 text-green-800 rounded-full mb-4">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold mb-4 text-green-700">Booking Confirmed!</h1>
        <p className="text-xl">Your installation has been scheduled successfully.</p>
      </motion.div>

      <Card className="mb-8 shadow-md border-green-100">
        <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 rounded-t-lg">
          <CardTitle>Booking Details</CardTitle>
          <CardDescription>
            A confirmation email has been sent to {booking.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6">
            <div>
              <h3 className="font-medium mb-2">Appointment</h3>
              <div className="bg-muted p-4 rounded-lg">
                <div className="font-semibold text-lg">{formatDate(booking.preferredDate)}</div>
                <div className="text-primary font-medium">{getTime()}</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Service Details</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                {services.length > 0 ? (
                  services.map((service, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 bg-background/50 rounded border-l-2 border-primary"
                    >
                      {service}
                    </motion.div>
                  ))
                ) : (
                  <div>{booking.serviceType}</div>
                )}

                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total Price:</span>
                    <span className="text-primary">{getTotalPrice()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Installation Address</h3>
              <div className="bg-muted p-4 rounded-lg">
                <div className="font-medium">{booking.streetAddress}</div>
                {booking.addressLine2 && <div>{booking.addressLine2}</div>}
                <div>{booking.city}, {booking.state} {booking.zipCode}</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Contact Information</h3>
              <div className="bg-muted p-4 rounded-lg">
                <div className="font-medium">{booking.name}</div>
                <div>{booking.email}</div>
                <div>{booking.phone}</div>
              </div>
            </div>

            {booking.notes && (
              <div>
                <h3 className="font-medium mb-2">Additional Notes</h3>
                <div className="bg-muted p-4 rounded-lg italic">
                  "{booking.notes}"
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="bg-blue-50 p-6 rounded-lg shadow-sm mb-8"
      >
        <h2 className="text-2xl font-semibold text-blue-800 mb-3">What Happens Next?</h2>
        <p className="mb-4">
          One of our installation specialists will contact you before your scheduled 
          appointment to confirm the details. Please have your TV and other equipment 
          ready on the day of installation.
        </p>
        <ul className="list-disc pl-5 space-y-2 mb-4">
          <li>Prepare the installation area (clear obstacles, ensure access)</li>
          <li>Have your TV and any purchased mounts available</li>
          <li>Ensure power outlets are accessible</li>
          <li>Our technician will call you before arrival</li>
        </ul>
      </motion.div>

      <div className="text-center pt-4 border-t border-gray-200">
        <Link to="/">
          <Button variant="outline" className="inline-flex items-center">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Return to Homepage
          </Button>
        </Link>
      </div>
    </div>
  );
}