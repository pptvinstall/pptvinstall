
import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/loading-spinner";
import { apiRequest } from "@/lib/queryClient";

export default function BookingConfirmation() {
  const [location] = useLocation();
  // Extract the ID from the URL using URLSearchParams
  const searchParams = new URLSearchParams(location?.split('?')[1] || "");
  const bookingId = searchParams.get('id');
  const [error, setError] = useState<string | null>(null);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      if (!bookingId) {
        // Check if we have stored booking details from a recent submission
        const storedDetails = sessionStorage.getItem("bookingDetails");
        if (storedDetails) {
          return JSON.parse(storedDetails);
        }
        throw new Error('No booking ID provided and no stored booking details found');
      }

      try {
        const response = await apiRequest("GET", `/api/bookings/${bookingId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch booking details');
        }
        return response.json();
      } catch (err) {
        setError('Failed to load booking details. Please contact support.');
        console.error('Error fetching booking:', err);
        return null;
      }
    },
    retry: 3,
    retryDelay: 1000
  });

  useEffect(() => {
    // Log data for debugging
    if (booking) {
      console.log("Loaded booking data:", booking);
    }
  }, [booking]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-24 px-4 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Handle error state
  if (error || !booking) {
    return (
      <div className="container mx-auto py-24 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error || "Unable to load booking details."}</p>
            <Button asChild className="mt-6">
              <Link href="/booking">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Return to Booking
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  let detailedServicesObj;
  try {
    detailedServicesObj = booking.detailedServices 
      ? (typeof booking.detailedServices === 'string' 
          ? JSON.parse(booking.detailedServices) 
          : booking.detailedServices)
      : null;
  } catch (e) {
    console.error("Error parsing detailed services:", e);
    detailedServicesObj = null;
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <motion.div
        className="max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="shadow-lg border-2 border-green-100">
          <CardHeader className="bg-green-50 border-b border-green-100">
            <div className="flex items-center mb-4">
              <CheckCircle2 className="text-green-500 h-8 w-8 mr-3" />
              <CardTitle className="text-2xl text-green-700">Booking Confirmed!</CardTitle>
            </div>
            <CardDescription className="text-base text-green-600">
              We've received your booking and will be in touch shortly.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <div className="grid gap-6">
              {/* Booking details section */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Booking Details</h3>
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Booking ID:</span>
                    <span className="font-medium">{booking.id || "Pending"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Service Type:</span>
                    <span className="font-medium">{booking.serviceType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Appointment Date:</span>
                    <span className="font-medium">
                      {new Date(booking.preferredDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Appointment Time:</span>
                    <span className="font-medium">
                      {booking.appointmentTime || new Date(booking.preferredDate).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true
                      })}
                    </span>
                  </div>
                  {booking.totalPrice && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Estimated Total:</span>
                      <span className="font-medium">
                        ${parseFloat(booking.totalPrice).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Services breakdown */}
              {detailedServicesObj && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-3">Services</h3>
                  {detailedServicesObj.serviceBreakdown && detailedServicesObj.serviceBreakdown.map((section, i) => (
                    <div key={i} className="mb-4 pb-4 border-b last:border-0">
                      <h4 className="font-medium text-blue-700 mb-2">{section.title}</h4>
                      <ul className="pl-5 space-y-1">
                        {section.items && section.items.map((item, j) => (
                          <li key={j} className="flex justify-between">
                            <span className={item.isDiscount ? "text-green-600" : ""}>{item.label}</span>
                            <span className={item.isDiscount ? "text-green-600 font-medium" : "font-medium"}>
                              ${item.price.toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Customer details section */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Customer Details</h3>
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name:</span>
                    <span className="font-medium">{booking.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span className="font-medium">{booking.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span className="font-medium">{booking.phone}</span>
                  </div>
                </div>
              </div>
              
              {/* Installation Address */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Installation Address</h3>
                <div className="grid gap-2">
                  <div>
                    <span className="font-medium">{booking.streetAddress}</span>
                  </div>
                  {booking.addressLine2 && (
                    <div>
                      <span className="font-medium">{booking.addressLine2}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">{booking.city}, {booking.state} {booking.zipCode}</span>
                  </div>
                </div>
              </div>
              
              {/* Notes */}
              {booking.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Additional Notes</h3>
                  <p className="text-gray-700">{booking.notes}</p>
                </div>
              )}
              
              <div className="flex flex-col items-center mt-6 pt-6 border-t">
                <p className="text-gray-500 mb-6 text-center">
                  A confirmation email has been sent to your email address with all the details.
                </p>
                <div className="space-y-3 w-full sm:w-auto sm:space-y-0 sm:flex sm:space-x-4">
                  <Button asChild variant="outline" className="w-full sm:w-auto">
                    <Link href="/">
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Return to Home
                    </Link>
                  </Button>
                  <Button asChild className="w-full sm:w-auto">
                    <Link href="/contact">
                      Contact Us
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
