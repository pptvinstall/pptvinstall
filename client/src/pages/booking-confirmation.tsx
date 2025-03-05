import { useState, useEffect } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryParams } from "@/hooks/use-query-params";

export default function BookingConfirmation() {
  const queryParams = useQueryParams();
  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [formattedTime, setFormattedTime] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Get booking ID from URL or session storage
        const urlBookingId = queryParams.get("id");
        const storedBookingId = sessionStorage.getItem("bookingId");
        const rawAppointmentTime = sessionStorage.getItem("appointmentTime");

        // Use either URL booking ID or stored booking ID
        const effectiveBookingId = urlBookingId || storedBookingId;

        console.log("Booking confirmation - URL params:", {
          urlBookingId,
          storedBookingId,
          rawAppointmentTime,
          hasStoredData: sessionStorage.getItem("bookingData") !== null
        });

        // Get booking data from session storage
        const storedData = sessionStorage.getItem("bookingData");
        console.log("Session storage booking data:", storedData);

        let data = null;

        if (storedData) {
          try {
            data = JSON.parse(storedData);
            console.log("Successfully parsed booking data from session storage");
          } catch (e) {
            console.error("Error parsing booking data from session storage:", e);
          }
        }

        // If no data from session storage, try fetching from API
        if (!data && effectiveBookingId) {
          try {
            const response = await fetch(`/api/booking/${effectiveBookingId}`);
            if (response.ok) {
              const result = await response.json();
              if (result.success && result.booking) {
                data = result.booking;
                console.log("Successfully fetched booking data from API");
              }
            }
          } catch (e) {
            console.error("Error fetching booking data from API:", e);
          }
        }

        // Get appointment time from session storage if needed
        if (rawAppointmentTime && data && !data.appointmentTime) {
          console.log("Retrieved raw appointment time from session:", rawAppointmentTime);
          data.appointmentTime = rawAppointmentTime;
        }

        // Set the booking data
        console.log("Final booking data being used:", data);
        setBookingData(data);

        // Format time if available
        if (data?.appointmentTime) {
          setFormattedTime(data.appointmentTime);
        }
      } catch (err) {
        console.error("Error in booking confirmation:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [bookingId]);

  // Calculate estimated price based on service type
  const calculateEstimatedPrice = () => {
    if (!bookingData?.serviceType) return "$0";

    let basePrice = 0;

    // TV mounting prices
    if (bookingData.serviceType.includes("32\"-55\"")) {
      basePrice += 129; // Small TV
    } else if (bookingData.serviceType.includes("56\"-75\"")) {
      basePrice += 159; // Medium TV
    } else if (bookingData.serviceType.includes("76\" or larger")) {
      basePrice += 199; // Large TV
    }

    // Smart home add-ons
    if (bookingData.smartHomeItems) {
      if (bookingData.smartHomeItems.includes("doorbell")) basePrice += 89;
      if (bookingData.smartHomeItems.includes("camera")) basePrice += 79;
      if (bookingData.smartHomeItems.includes("floodlight")) basePrice += 99;
    }

    return `$${basePrice}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
            <div className="animate-pulse flex flex-col items-center space-y-4">
              <div className="h-12 w-12 bg-muted rounded-full"></div>
              <div className="h-4 w-32 bg-muted rounded"></div>
              <div className="h-4 w-48 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !bookingData) {
    return (
      <div className="container mx-auto py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Booking Not Found</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px] space-y-6">
            <p className="text-center text-muted-foreground">
              We couldn't find your booking information. Please try again or contact us for assistance.
            </p>
            <Button variant="default" asChild>
              <Link to="/">Return to Homepage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="bg-green-50 dark:bg-green-950 border-b">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-center text-2xl">Booking Confirmed!</CardTitle>
          <CardDescription className="text-center text-lg">
            Thank you for choosing Picture Perfect TV Install
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-1">
            <h3 className="font-medium">Service Details</h3>
            <p className="text-muted-foreground">{bookingData.serviceType}</p>
            {bookingData.smartHomeItems && (
              <p className="text-muted-foreground">
                Smart Home: {bookingData.smartHomeItems.join(", ")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <h3 className="font-medium">Appointment Date</h3>
              <p className="text-muted-foreground">
                {bookingData.preferredDate
                  ? format(new Date(bookingData.preferredDate), "EEEE, MMMM d, yyyy")
                  : "Date not available"}
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="font-medium">Appointment Time</h3>
              <p className="text-muted-foreground">{formattedTime || "Time not available"}</p>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-medium">Customer Information</h3>
            <p className="text-muted-foreground">{bookingData.name}</p>
            <p className="text-muted-foreground">{bookingData.email}</p>
            <p className="text-muted-foreground">{bookingData.phone}</p>
          </div>

          <div className="space-y-1">
            <h3 className="font-medium">Address</h3>
            <p className="text-muted-foreground">{bookingData.streetAddress}</p>
            {bookingData.addressLine2 && (
              <p className="text-muted-foreground">{bookingData.addressLine2}</p>
            )}
            <p className="text-muted-foreground">
              {bookingData.city}, {bookingData.state} {bookingData.zipCode}
            </p>
          </div>

          {bookingData.notes && (
            <div className="space-y-1">
              <h3 className="font-medium">Additional Notes</h3>
              <p className="text-muted-foreground">{bookingData.notes}</p>
            </div>
          )}

          <div className="bg-muted p-4 rounded-md">
            <h3 className="font-medium mb-2">Estimated Price</h3>
            <p className="text-xl font-bold">{calculateEstimatedPrice()}</p>
            <p className="text-sm text-muted-foreground mt-1">
              This is an estimate. Final price may vary based on additional services or special requirements.
            </p>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              A confirmation email has been sent to {bookingData.email}. If you have any questions, 
              please contact us at (404) 702-4748.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}