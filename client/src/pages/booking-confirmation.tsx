import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function BookingConfirmation() {
  const [location] = useLocation();
  const [storedBookingId, setStoredBookingId] = useState<string | null>(null);
  const [storedBookingData, setStoredBookingData] = useState<any>(null);

  // Extract booking ID from URL and/or session storage
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const urlBookingId = searchParams.get('id');

  // Check session storage for booking details on component mount
  useEffect(() => {
    try {
      // Check for stored booking ID
      const sessionBookingId = sessionStorage.getItem("bookingId");
      if (sessionBookingId) {
        setStoredBookingId(sessionBookingId);
      }

      // Check for stored booking details
      const sessionBookingData = sessionStorage.getItem("bookingDetails");
      if (sessionBookingData) {
        setStoredBookingData(JSON.parse(sessionBookingData));
        console.log("Found booking data in session storage:", sessionBookingData);
      }
    } catch (err) {
      console.error("Error retrieving booking details from session storage:", err);
    }
  }, []);

  // Determine which booking ID to use (URL param takes precedence)
  const bookingId = urlBookingId || storedBookingId;

  // Log the available booking information sources
  console.log("Booking confirmation - source data:", { 
    urlBookingId, 
    storedBookingId, 
    hasStoredData: !!storedBookingData 
  });

  // Fetch booking from API if we have a booking ID
  const { data: apiBooking, isLoading, error } = useQuery({
    queryKey: ['/api/bookings', bookingId],
    queryFn: async ({ queryKey }) => {
      if (!bookingId) return null;

      try {
        // Explicitly construct the API URL
        const response = await fetch(`/api/bookings/${bookingId}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error fetching booking (${response.status}):`, errorText);
          throw new Error(`Failed to fetch booking details: ${response.status}`);
        }

        const data = await response.json();
        console.log("Successfully fetched booking from API:", data);
        return data;
      } catch (error) {
        console.error("Error in booking fetch query:", error);
        throw error;
      }
    },
    enabled: !!bookingId, // Only run the query if we have a bookingId
    retry: 2, // Retry failed requests up to 2 times
    staleTime: Infinity // Don't refetch this data automatically
  });

  // Determine which booking data to use - API data has priority over stored data
  const booking = apiBooking || storedBookingData;

  // Debug information
  console.log("Booking confirmation - URL params:", { bookingId, location });
  console.log("API Booking data:", apiBooking);
  console.log("Session storage booking data:", storedBookingData);
  console.log("Final booking data being used:", booking);
  console.log("Loading state:", isLoading);
  console.log("Error state:", error);

  // Show loading spinner while fetching and no stored data is available
  if (isLoading && !storedBookingData) {
    return <LoadingSpinner />;
  }

  // Show error if both API fetch failed and no stored data is available
  if ((error || !apiBooking) && !storedBookingData) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">Error Loading Booking Details</h1>
        <p className="mb-6">
          We encountered an issue retrieving your booking information. 
          {error ? ` Error: ${error instanceof Error ? error.message : String(error)}` : ''}
        </p>
        {/* Fix DOM nesting - Use Link to wrap Button instead of Button wrapping Link */}
        <Link to="/">
          <Button variant="outline" className="inline-flex items-center">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Return to Homepage
          </Button>
        </Link>
      </div>
    );
  }

  // If we still don't have booking data, show error
  if (!booking) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">Booking Not Found</h1>
        <p className="mb-6">
          We couldn't find any booking information. If you've just made a booking, please check your email for confirmation.
        </p>
        <Link to="/">
          <Button variant="outline" className="inline-flex items-center">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Return to Homepage
          </Button>
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
      console.error("Date formatting error:", e);
      return "Date not available";
    }
  };

  // Use stored appointment time or extract from date
  // Updated to format time specifically for Eastern Time (Metro Atlanta)
  const getTime = () => {
    if (booking.appointmentTime) {
      return booking.appointmentTime;
    }

    try {
      const date = new Date(booking.preferredDate);
      // Format time in Eastern Time Zone (for Metro Atlanta)
      return date.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } catch (e) {
      console.error("Time formatting error:", e);
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