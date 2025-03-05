
import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";

function BookingConfirmation() {
  const [location] = useLocation();
  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateTotal = (serviceType: string) => {
    // Base pricing
    let total = 0;

    // Smart home device prices
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Parse URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const urlBookingId = urlParams.get('bookingId');
        
        // Check if booking data is stored in session storage
        const storedBookingData = sessionStorage.getItem('bookingData');
        const rawAppointmentTime = sessionStorage.getItem('appointmentTime');
        
        console.log("Booking confirmation - URL params:", {
          urlBookingId,
          storedBookingId: storedBookingData ? JSON.parse(storedBookingData).id : null,
          rawAppointmentTime,
          hasStoredData: !!storedBookingData
        });
        
        console.log("Booking confirmation - URL params:", { bookingId: urlBookingId, location });
        
        // Attempt to load from API if booking ID is provided
        let apiBookingData = null;
        if (urlBookingId) {
          try {
            const response = await fetch(`/api/booking/${urlBookingId}`);
            if (response.ok) {
              apiBookingData = await response.json();
            }
          } catch (err) {
            console.error("Error fetching booking from API:", err);
          }
        }
        
        console.log("API Booking data:", apiBookingData);
        console.log("Session storage booking data:", storedBookingData ? JSON.parse(storedBookingData) : null);
        console.log("Raw appointment time from session:", rawAppointmentTime);
        
        // Use API data if available, otherwise use session storage
        let finalBookingData = null;
        if (apiBookingData && apiBookingData.data) {
          finalBookingData = apiBookingData.data;
        } else if (storedBookingData) {
          console.log("Retrieved raw appointment time from session:", rawAppointmentTime);
          console.log("Found booking data in session storage:", storedBookingData);
          
          finalBookingData = JSON.parse(storedBookingData);
          
          // Add appointment time from session if available
          if (rawAppointmentTime && !finalBookingData.appointmentTime) {
            finalBookingData.appointmentTime = rawAppointmentTime;
            console.log("Using raw appointment time from session storage:", rawAppointmentTime);
          }
        }
        
        console.log("Final booking data being used:", finalBookingData);
        
        if (finalBookingData) {
          setBookingData(finalBookingData);
        } else {
          setError("Booking information not found. Please try again or contact support.");
        }
      } catch (err) {
        console.error("Error in booking confirmation:", err);
        setError("An error occurred while loading your booking information.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-lg">Loading your booking information...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-500">Booking Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <div className="mt-6">
              <Button asChild>
                <Link href="/">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Return to Homepage
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-600">Booking Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>We couldn't find your booking information. Please return to the booking page and try again.</p>
            <div className="mt-6">
              <Button asChild>
                <Link href="/services">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Go to Services
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="shadow-lg border-green-100">
        <CardHeader className="bg-green-50 border-b border-green-100">
          <CardTitle className="text-2xl text-green-800 flex items-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 mr-2 text-green-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7"
              />
            </svg>
            Booking Confirmed!
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Service Information</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="font-medium">{bookingData.serviceType}</p>
                <p className="text-gray-600 mt-1">
                  {format(new Date(bookingData.preferredDate), 'EEEE, MMMM d, yyyy')}
                  <span className="mx-2">•</span>
                  {bookingData.appointmentTime}
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Customer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">Name</p>
                  <p className="font-medium">{bookingData.name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Email</p>
                  <p className="font-medium">{bookingData.email}</p>
                </div>
                <div>
                  <p className="text-gray-600">Phone</p>
                  <p className="font-medium">{bookingData.phone}</p>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Installation Address</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="font-medium">{bookingData.streetAddress}</p>
                {bookingData.addressLine2 && <p>{bookingData.addressLine2}</p>}
                <p>{bookingData.city}, {bookingData.state} {bookingData.zipCode}</p>
              </div>
            </div>
            
            {bookingData.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">Additional Notes</h3>
                  <p className="bg-gray-50 p-4 rounded-md italic">{bookingData.notes}</p>
                </div>
              </>
            )}
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Estimated Cost</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between">
                  <p className="text-gray-600">Base service</p>
                  <p className="font-medium">${calculateTotal(bookingData.serviceType)}</p>
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <p>Final price may vary based on actual installation requirements</p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <p className="text-sm text-gray-600">
                We'll contact you shortly to confirm your booking and provide any additional details.
              </p>
              <p className="text-sm text-gray-600">
                Thank you for choosing Picture Perfect TV Install!
              </p>
              <div className="flex justify-center pt-4">
                <Button asChild>
                  <Link href="/">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Return to Homepage
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BookingConfirmation;
