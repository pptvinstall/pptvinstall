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
  const searchParams = new URLSearchParams(location?.split('?')[1] || "");
  const bookingId = searchParams.get('id');
  const [error, setError] = useState<string | null>(null);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      if (!bookingId) {
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
        const data = await response.json();
        console.log("Loaded booking data:", data);
        return data;
      } catch (err) {
        setError('Failed to load booking details. Please contact support.');
        console.error('Error fetching booking:', err);
        return null;
      }
    },
    retry: 3,
    retryDelay: 1000
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-24 px-4 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto py-24 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error || "Unable to load booking details."}</p>
            <Button className="mt-6" onClick={() => window.location.href = "/booking"}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Return to Booking
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format price
  const formatPrice = (amount: number | string) => {
    const price = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Parse detailed services
  let parsedServices;
  try {
    parsedServices = typeof booking.detailedServices === 'string' 
      ? JSON.parse(booking.detailedServices) 
      : booking.detailedServices;
    console.log("Parsed services:", parsedServices);
  } catch (e) {
    console.error("Error parsing detailed services:", e);
    parsedServices = null;
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
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Booking ID:</span>
                    <span className="font-medium">{booking.id}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Status:</span>
                    <span className="font-medium capitalize">{booking.status}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Service Type:</span>
                    <span className="font-medium">{booking.serviceType}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
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
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Appointment Time:</span>
                    <span className="font-medium">{booking.preferredTime}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Total Price:</span>
                    <span className="font-medium text-green-600">
                      {formatPrice(booking.totalPrice || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Services breakdown */}
              {parsedServices && parsedServices.serviceBreakdown && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-3">Services Breakdown</h3>
                  {parsedServices.serviceBreakdown.map((section: any, i: number) => (
                    <div key={i} className="mb-6 last:mb-0">
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-blue-700 mb-3">{section.title}</h4>
                        <div className="space-y-2">
                          {section.items && section.items.map((item: any, j: number) => (
                            <div key={j} className="flex justify-between text-sm">
                              <span className={item.isDiscount ? "text-green-600" : ""}>
                                {item.label}
                              </span>
                              <span className={
                                item.isDiscount 
                                  ? "text-green-600 font-medium" 
                                  : "font-medium"
                              }>
                                {formatPrice(item.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total Amount:</span>
                      <span>{formatPrice(booking.totalPrice || 0)}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      A deposit of {formatPrice(75)} is required to secure your booking
                    </div>
                  </div>
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
                    <span className="font-medium">
                      {booking.city}, {booking.state} {booking.zipCode}
                    </span>
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
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => window.location.href = "/"}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Return to Home
                  </Button>
                  <Button className="w-full sm:w-auto" onClick={() => window.location.href = "/contact"}>
                    Contact Us
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