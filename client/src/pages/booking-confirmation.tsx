import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, CalendarIcon, MapPinIcon, Clock, User, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/loading-spinner";

export default function BookingConfirmation() {
  const [location] = useLocation();
  const [storedBookingId, setStoredBookingId] = useState<string | null>(null);
  const [storedBookingData, setStoredBookingData] = useState<any>(null);
  const [rawAppointmentTime, setRawAppointmentTime] = useState<string | null>(null);

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

      // Check for stored raw appointment time
      const sessionRawTime = sessionStorage.getItem("rawAppointmentTime");
      if (sessionRawTime) {
        setRawAppointmentTime(sessionRawTime);
        console.log("Retrieved raw appointment time from session:", sessionRawTime);
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
  console.log("Booking confirmation - URL params:", { 
    urlBookingId, 
    storedBookingId, 
    rawAppointmentTime,
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
  console.log("Raw appointment time from session:", rawAppointmentTime);
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

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date for display
  const getFormattedDate = () => {
    try {
      const date = new Date(booking.preferredDate);
      return format(date, 'MMMM d, yyyy');
    } catch (e) {
      console.error("Date formatting error:", e);
      return "Date not available";
    }
  };

  // Use stored appointment time directly without any conversion
  // This fixes the timezone issue by using exactly what the user selected
  const getTime = () => {
    // First use the raw time from session storage if available
    if (rawAppointmentTime) {
      console.log("Using raw appointment time from session storage:", rawAppointmentTime);
      return rawAppointmentTime;
    }
    
    // Then check if the booking object has appointmentTime
    if (booking.appointmentTime) {
      console.log("Using appointment time from booking object:", booking.appointmentTime);
      return booking.appointmentTime;
    }

    console.log("No exact time available, falling back to date parsing");
    
    // Last resort: try to extract from date, but this is prone to timezone issues
    try {
      const date = new Date(booking.preferredDate);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } catch (e) {
      console.error("Time formatting error:", e);
      return "Time not available";
    }
  };

  // Estimate service duration based on service type
  const getEstimatedDuration = () => {
    const serviceType = booking.serviceType?.toLowerCase() || '';
    
    // Count number of TVs and smart home devices
    const tvCount = (serviceType.match(/tv/gi) || []).length;
    const smartHomeCount = (
      (serviceType.match(/doorbell/gi) || []).length +
      (serviceType.match(/camera/gi) || []).length +
      (serviceType.match(/floodlight/gi) || []).length
    );
    
    // Base duration is 1 hour for first TV, plus 30 min for each additional
    let duration = 60;
    
    if (tvCount > 1) {
      duration += (tvCount - 1) * 30;
    }
    
    // Each smart home device adds 30 min
    if (smartHomeCount > 0) {
      duration += smartHomeCount * 30;
    }
    
    // Fireplace mounting adds extra time
    if (serviceType.includes('fireplace')) {
      duration += 30;
    }
    
    // Convert to hours and minutes
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    if (hours === 0) {
      return `${minutes} minutes`;
    } else if (minutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`;
    }
  };

  // Calculate estimated price based on service type
  const getEstimatedPrice = () => {
    const serviceType = booking.serviceType?.toLowerCase() || '';
    
    // Base pricing
    let total = 0;
    
    // TV mounting prices
    const tvCount = (serviceType.match(/tv/gi) || []).length;
    if (tvCount > 0) {
      // Assume standard TV mounting price is $149
      total += 149;
      
      // Additional TVs
      if (tvCount > 1) {
        total += (tvCount - 1) * 99; // Each additional TV at $99
      }
      
      // Add for fireplace if mentioned
      if (serviceType.includes('fireplace')) {
        total += 50; // Additional for fireplace mounting
      }
    }
    
    // Smart home device prices
    const doorbellCount = (serviceType.match(/doorbell/gi) || []).length;
    const cameraCount = (serviceType.match(/camera/gi) || []).length;
    const floodlightCount = (serviceType.match(/floodlight/gi) || []).length;
    
    // Add smart home installation costs
    total += doorbellCount * 99; // $99 per doorbell
    total += cameraCount * 129;  // $129 per camera
    total += floodlightCount * 149; // $149 per floodlight
    
    return total.toFixed(2);
  };

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Booking Confirmation</h1>
          <Link to="/">
            <Button variant="outline" className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg p-4 mb-6">
              <h2 className="text-xl font-semibold mb-2">Booking Successful!</h2>
              <p>Your installation has been confirmed. We'll see you soon!</p>
            </div>

            <h3 className="text-xl font-semibold mb-4">Appointment Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CalendarIcon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Date</h4>
                    <p>{getFormattedDate()}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Time</h4>
                    <p className="font-semibold text-lg">{getTime()}</p>
                    <p className="text-sm text-muted-foreground">
                      Estimated duration: {getEstimatedDuration()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPinIcon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Location</h4>
                    <p>{booking.streetAddress}</p>
                    {booking.addressLine2 && <p>{booking.addressLine2}</p>}
                    <p>{booking.city}, {booking.state} {booking.zipCode}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-primary mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1v22"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium">Estimated Total</h4>
                    <p className="font-semibold text-lg">${getEstimatedPrice()}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Contact Information</h4>
                    <p>{booking.name}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Email</h4>
                    <p>{booking.email}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Phone</h4>
                    <p>{booking.phone}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <h3 className="text-xl font-semibold mb-4">Service Details</h3>
            <p className="mb-4">{booking.serviceType}</p>
            
            {booking.notes && (
              <div className="mb-6">
                <h4 className="font-medium mb-2">Additional Notes</h4>
                <p className="text-sm text-muted-foreground">{booking.notes}</p>
              </div>
            )}

            <Separator className="my-6" />

            <h3 className="text-xl font-semibold mb-4">What Happens Next?</h3>
            <div className="space-y-2 text-muted-foreground">
              <p>• One of our installation specialists will contact you within 24 hours before your scheduled appointment.</p>
              <p>• You'll receive a confirmation email with all appointment details.</p>
              <p>• Please have your TV and any mounts or equipment ready before our arrival.</p>
              <p>• Clear the installation area of any obstacles or decorations.</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
