
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

// Helper function to parse URL parameters
const useQueryParams = () => {
  const [location] = useLocation();
  return {
    bookingId: new URLSearchParams(location.split("?")[1])?.get("id"),
    location
  };
};

// Helper function to calculate total price
const calculateEstimatedTotal = (serviceType: string): string => {
  // Base pricing
  let total = 0;

  // Smart home device prices with correct pricing
  const doorbellCount = (serviceType.match(/doorbell/gi) || []).length;
  const cameraCount = (serviceType.match(/camera/gi) || []).length;
  const floodlightCount = (serviceType.match(/floodlight/gi) || []).length;

  // TV mounting prices
  const tvCount = (serviceType.match(/tv/gi) || []).length;

  // Add base installation costs
  if (tvCount > 0) {
    // First TV has base price
    total += 149;

    // Additional TVs at discounted rate
    if (tvCount > 1) {
      total += (tvCount - 1) * 99;
    }

    // Add for fireplace if mentioned
    if (serviceType.includes('fireplace')) {
      total += 50;
    }
  }

  // Add smart home installation costs with correct pricing
  total += doorbellCount * 75;  // $75 per doorbell
  total += cameraCount * 75;    // $75 per camera
  total += floodlightCount * 100; // $100 per floodlight

  // For debugging - log to console
  console.log("Calculating price:", { 
    doorbells: doorbellCount * 75,
    cameras: cameraCount * 75,
    floodlights: floodlightCount * 100,
    total
  });

  return total.toFixed(2);
};

export default function BookingConfirmation() {
  const { bookingId } = useQueryParams();
  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [formattedTime, setFormattedTime] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Get booking ID from URL or session storage
        const urlBookingId = new URLSearchParams(window.location.search).get("id");
        const storedBookingId = sessionStorage.getItem("bookingId");
        const rawAppointmentTime = sessionStorage.getItem("appointmentTime");
        const hasStoredData = sessionStorage.getItem("bookingData") !== null;
        
        // Use either URL booking ID or stored booking ID
        const effectiveBookingId = urlBookingId || storedBookingId;
        
        console.log("Booking confirmation - URL params:", {
          urlBookingId,
          storedBookingId,
          rawAppointmentTime,
          hasStoredData
        });
        
        let data = null;

        // First try to get from session storage as it's most reliable
        const sessionData = sessionStorage.getItem("bookingData");
        if (sessionData) {
          try {
            data = JSON.parse(sessionData);
            console.log("Session storage booking data:", data);
          } catch (e) {
            console.error("Error parsing session storage data:", e);
          }
        }

        // If no session data, try to fetch from API if there's a booking ID
        if (!data && effectiveBookingId) {
          try {
            const response = await fetch(`/api/booking/${effectiveBookingId}`);
            if (response.ok) {
              const apiResponse = await response.json();
              if (apiResponse.success && apiResponse.booking) {
                data = apiResponse.booking;
                console.log("API Booking data:", data);
              }
            }
          } catch (apiError) {
            console.error("Error fetching booking data from API:", apiError);
          }
        }

        // If no data from API, check session storage as fallback
        if (!data) {
          const sessionData = sessionStorage.getItem("bookingData");
          console.log("Session storage booking data:", sessionData ? JSON.parse(sessionData) : null);
          
          if (sessionData) {
            data = JSON.parse(sessionData);
          }
        }

        // Get appointment time from session storage if needed
        const rawTime = sessionStorage.getItem("appointmentTime");
        console.log("Raw appointment time from session:", rawTime);
        
        if (rawTime && data && !data.appointmentTime) {
          console.log("Retrieved raw appointment time from session:", rawTime);
          data.appointmentTime = rawTime;
        }

        // Set the booking data
        console.log("Final booking data being used:", data);
        setBookingData(data);
        
        // Format time if available
        if (data?.appointmentTime) {
          console.log("Using raw appointment time from session storage:", data.appointmentTime);
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

  console.log("Loading state:", loading);
  console.log("Error state:", error);

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
            <h3 className="font-medium">Service Location</h3>
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

          <div className="bg-muted/40 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Estimated Total:</h3>
              <p className="text-xl font-semibold">
                ${calculateEstimatedTotal(bookingData.serviceType)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              This is an estimate. Final pricing may vary based on site conditions and additional services requested during installation.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between gap-4 border-t pt-6">
          <Button variant="outline" asChild>
            <Link to="/">Return to Homepage</Link>
          </Button>
          <Button variant="default">
            <a href={`mailto:info@pictureperfecttv.com?subject=Question about my booking&body=Booking reference: ${bookingId || 'N/A'}`}>
              Contact Us
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
