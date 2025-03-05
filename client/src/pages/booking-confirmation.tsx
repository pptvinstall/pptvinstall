import { useState, useEffect } from "react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
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
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Get booking ID from URL or session storage
        const urlBookingId = queryParams.get("id");
        const storedBookingId = sessionStorage.getItem("bookingId");
        const rawAppointmentTime = sessionStorage.getItem("appointmentTime");
        const rawBookingDate = sessionStorage.getItem("rawBookingDate");

        // Use either URL booking ID or stored booking ID
        const bookingId = urlBookingId || storedBookingId;

        console.log("Booking confirmation - URL params:", {
          urlBookingId,
          storedBookingId,
          rawAppointmentTime,
          rawBookingDate,
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
        if (!data && bookingId) {
          try {
            const response = await fetch(`/api/booking/${bookingId}`);
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

        // Format time if available - USE THE RAW TIME STRING WITHOUT CONVERSION
        if (data?.appointmentTime) {
          setFormattedTime(data.appointmentTime);
        }

        // Format date if available - USE THE RAW DATE STRING WITHOUT CONVERSION
        if (data?.preferredDate) {
          try {
            // If we have rawBookingDate from session storage, prioritize using that
            if (rawBookingDate) {
              console.log("Using raw booking date from session storage:", rawBookingDate);
              // Format it directly without any timezone conversion
              const dateParts = rawBookingDate.split('-');
              if (dateParts.length === 3) {
                const year = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]) - 1; // Months are 0-indexed in JS Date
                const day = parseInt(dateParts[2]);

                // Create the date with the exact components to avoid timezone issues
                const date = new Date(year, month, day);
                setFormattedDate(format(date, "EEEE, MMMM d, yyyy"));
              } else {
                setFormattedDate(rawBookingDate);
              }
            } else {
              // Make sure we use the rawPreferredDate if available to avoid timezone issues
              // Use parseISO which is more reliable with timezone handling
              const date = parseISO(data.preferredDate);
              setFormattedDate(format(date, "EEEE, MMMM d, yyyy"));
            }
          } catch (e) {
            console.error("Error formatting date:", e);
            setFormattedDate("Date not available");
          }
        }
      } catch (err) {
        console.error("Error in booking confirmation:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [queryParams]);

  // Calculate estimated price based on service type
  const calculateEstimatedPrice = () => {
    if (!bookingData?.serviceType) return "$0";

    let basePrice = 0;

    // TV mounting prices
    if (bookingData.serviceType.includes("TV Mount")) {
      // Count how many TV mounts are in the service type
      const tvMountCount = (bookingData.serviceType.match(/TV Mount/g) || []).length;

      // For each TV mount, determine size and location
      for (let i = 0; i < tvMountCount; i++) {
        // Check for size and location in service description
        const isLargeTV = bookingData.serviceType.includes('56"+');
        const isFireplace = bookingData.serviceType.includes("fireplace");
        const isCeiling = bookingData.serviceType.includes("ceiling");
        const hasMasonry = bookingData.serviceType.includes("masonry");
        const hasOutletRelocation = bookingData.serviceType.includes("outlet relocation");

        // Base price by location
        if (isCeiling) {
          basePrice += 175; // Ceiling mount
        } else if (isFireplace) {
          basePrice += 200; // Fireplace (standard + $100)
        } else {
          basePrice += 100; // Standard wall
        }

        // Add-ons
        if (hasMasonry) basePrice += 50;
        if (hasOutletRelocation) basePrice += 100;

        // Mount type charges
        if (bookingData.serviceType.includes("fixed")) {
          basePrice += isLargeTV ? 60 : 40;
        } else if (bookingData.serviceType.includes("tilt")) {
          basePrice += isLargeTV ? 70 : 50;
        } else if (bookingData.serviceType.includes("fullMotion")) {
          basePrice += isLargeTV ? 100 : 80;
        }
      }
    }

    // Smart home devices
    if (bookingData.serviceType.includes("Smart Doorbell")) {
      const doorbellCount = extractQuantity(bookingData.serviceType, "Smart Doorbell");
      let doorbellPrice = 75 * doorbellCount;
      if (bookingData.serviceType.includes("brick")) {
        doorbellPrice += 10 * doorbellCount;
      }
      basePrice += doorbellPrice;
    }

    if (bookingData.serviceType.includes("Floodlight Camera")) {
      const floodlightCount = extractQuantity(bookingData.serviceType, "Floodlight Camera");
      basePrice += 100 * floodlightCount;
    }

    if (bookingData.serviceType.includes("Smart Camera")) {
      const cameraCount = extractQuantity(bookingData.serviceType, "Smart Camera");
      let cameraPrice = 75 * cameraCount;

      // Check for mount height surcharge
      const heightMatch = bookingData.serviceType.match(/at (\d+)ft/);
      if (heightMatch && parseInt(heightMatch[1]) > 8) {
        const extraHeight = parseInt(heightMatch[1]) - 8;
        const heightSurcharge = Math.ceil(extraHeight / 4) * 25;
        cameraPrice += heightSurcharge * cameraCount;
      }

      basePrice += cameraPrice;
    }

    return `$${basePrice}`;
  };

  // Helper function to extract quantities from service description
  const extractQuantity = (serviceText: string, itemName: string): number => {
    const regex = new RegExp(`${itemName} \\((\\d+)\\)`);
    const match = serviceText.match(regex);
    return match ? parseInt(match[1]) : 1;
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
                {formattedDate || "Date not available"}
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