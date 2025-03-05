import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { format } from "date-fns";

export default function BookingConfirmation() {
  const [bookingData, setBookingData] = useState(null);
  const [rawAppointmentTime, setRawAppointmentTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      // Log initialization
      console.log("Booking confirmation - URL params:", {
        urlBookingId: null,
        storedBookingId: null,
        rawAppointmentTime: sessionStorage.getItem("appointmentTime"),
        hasStoredData: !!sessionStorage.getItem("bookingData")
      });

      // Get raw time from session storage
      const rawTime = sessionStorage.getItem("appointmentTime");
      if (rawTime) {
        console.log("Retrieved raw appointment time from session:", rawTime);
        setRawAppointmentTime(rawTime);
      }

      // Get booking data from session storage
      const storedData = sessionStorage.getItem("bookingData");
      if (storedData) {
        console.log("Found booking data in session storage:", storedData);
        const parsedData = JSON.parse(storedData);
        setBookingData(parsedData);
      }

      console.log("Session storage booking data:", JSON.parse(sessionStorage.getItem("bookingData")));
      console.log("Raw appointment time from session:", rawAppointmentTime);
      console.log("Final booking data being used:", bookingData);

      setLoading(false);
    } catch (err) {
      console.error("Error loading booking data:", err);
      setError("Failed to load booking details. Please try again.");
      setLoading(false);
    }
  }, []);

  // If there's raw time in session storage, use that instead
  useEffect(() => {
    const rawTime = sessionStorage.getItem("appointmentTime");
    if (rawTime) {
      console.log("Using raw appointment time from session storage:", rawTime);
      setRawAppointmentTime(rawTime);
    }
  }, []);

  const calculateEstimatedTotal = (serviceType) => {
    if (!serviceType) return "0.00";

    // Base pricing
    let total = 0;

    // Smart home device prices from services page
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

  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="text-center">
          <div className="animate-pulse">Loading booking details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <Button className="mt-4" variant="outline" asChild>
            <Link to="/">Return to Homepage</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Booking Not Found</h1>
          <p>We couldn't find your booking details. Please try again or contact support.</p>
          <Button className="mt-4" variant="outline" asChild>
            <Link to="/">Return to Homepage</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-center mb-8">
          <h1 className="text-3xl font-bold text-green-700 mb-2">Booking Confirmed!</h1>
          <p className="text-green-600">
            Thank you for your booking. We'll see you soon!
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-6 border-b pb-2">Booking Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Customer Information</h3>
              <p className="mb-1"><span className="font-semibold">Name:</span> {bookingData.name}</p>
              <p className="mb-1"><span className="font-semibold">Email:</span> {bookingData.email}</p>
              <p className="mb-1"><span className="font-semibold">Phone:</span> {bookingData.phone}</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">Service Details</h3>
              <p className="mb-1"><span className="font-semibold">Service:</span> {bookingData.serviceType}</p>
              <p className="mb-1">
                <span className="font-semibold">Date:</span> {bookingData.preferredDate ? format(new Date(bookingData.preferredDate), "MMMM d, yyyy") : "No date selected"}
              </p>
              <p className="mb-1">
                <span className="font-semibold">Time:</span> {rawAppointmentTime || bookingData.appointmentTime || "No time selected"}
              </p>
              <p className="mb-4">
                <span className="font-semibold">Estimated Total:</span>{" "}
                <span className="text-xl font-bold text-brand-blue-600">${calculateEstimatedTotal(bookingData.serviceType)}</span>
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-medium text-gray-700 mb-2">Service Address</h3>
            <p className="mb-1">{bookingData.streetAddress}</p>
            {bookingData.addressLine2 && <p className="mb-1">{bookingData.addressLine2}</p>}
            <p className="mb-1">{bookingData.city}, {bookingData.state} {bookingData.zipCode}</p>
          </div>

          {bookingData.notes && (
            <div className="mt-6">
              <h3 className="font-medium text-gray-700 mb-2">Additional Notes</h3>
              <p className="italic">{bookingData.notes}</p>
            </div>
          )}

          <div className="mt-8 border-t pt-6">
            <h3 className="font-medium text-gray-700 mb-2">What's Next?</h3>
            <p className="mb-4">
              You'll receive a confirmation email with these details. Our team will contact you 24 hours before your appointment to confirm.
            </p>
            <p className="text-sm text-gray-500">
              Need to make changes? Please contact us at (404) 702-4748 or support@pictureperfecttv.com
            </p>
          </div>

          <div className="mt-8 flex justify-between">
            <Button variant="outline" asChild className="inline-flex items-center">
              <Link to="/">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Return to Homepage
              </Link>
            </Button>

            <Button asChild>
              <Link to="/services">Book Another Service</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}