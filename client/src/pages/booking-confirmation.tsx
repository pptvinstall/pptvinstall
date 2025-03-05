import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/loading-spinner";
import { apiRequest } from "@/lib/queryClient";
import { NotificationPreferences } from "@/components/ui/notification-preferences"; // Added import

export default function BookingConfirmation() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const bookingId = searchParams.get('id');
  const [error, setError] = useState<string | null>(null);

  console.log("Current URL:", window.location.href);
  console.log("Current booking ID:", bookingId);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      if (!bookingId) {
        throw new Error('No booking ID provided');
      }

      try {
        console.log("Fetching booking details for ID:", bookingId);
        const response = await apiRequest("GET", `/api/bookings/${bookingId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Error response:", errorData);
          throw new Error(errorData.error || 'Failed to fetch booking details');
        }

        const data = await response.json();
        console.log("Received booking data:", data);

        // Format the date correctly
        if (data.preferredDate) {
          const date = new Date(data.preferredDate);
          // Check if the date is valid before formatting
          if (!isNaN(date.getTime())) {
            data.formattedDate = date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          } else {
            data.formattedDate = data.preferredDate;
          }
        }
        return data;
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError(err instanceof Error ? err.message : 'Failed to load booking details');
        throw err;
      }
    },
    enabled: !!bookingId,
    retry: 3,
    retryDelay: 1000
  });

  // Format price helper
  const formatPrice = (amount: number | string) => {
    if (!amount) return '$0.00';
    const price = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

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

  // Parse service details - improved error handling
  let parsedServices;
  try {
    parsedServices = Array.isArray(booking.detailedServices) ? booking.detailedServices : JSON.parse(booking.detailedServices || '[]');
  } catch (e) {
    console.error("Error parsing detailed services:", e);
    parsedServices = []; // Default to empty array if parsing fails
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
                      {booking.formattedDate || new Date(booking.preferredDate).toLocaleDateString('en-US', {
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
                      {formatPrice(booking.totalPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Services breakdown - improved rendering */}
              {parsedServices && parsedServices.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-3">Services Breakdown</h3>
                  {parsedServices.map((section: any, i: number) => (
                    <div key={i} className="mb-6 last:mb-0 bg-gray-50 p-4 rounded-md space-y-4">
                        <div className="font-medium text-indigo-700 mb-2">{section.title || "Service Item"}</div>
                        {section.items && section.items.map((item: any, j: number) => (
                          <div key={j} className="flex justify-between py-1 px-2">
                            <span className={item.isDiscount ? "text-green-600" : ""}>
                              {item.label}
                              {item.note && (
                                <span className="ml-1 text-gray-400 text-xs">(Note: {item.note})</span>
                              )}
                            </span>
                            <span className={`font-medium ${item.isDiscount ? "text-green-600" : ""}`}>
                              {item.isDiscount ? "-" : ""}${Math.abs(item.price).toFixed(2)}
                            </span>
                          </div>
                        ))}
                    </div>
                  ))}
                  <div className="mt-4 flex justify-between py-3 bg-indigo-50 px-4 rounded-md font-medium">
                    <span>Total</span>
                    <span className="text-green-600">{formatPrice(booking.totalPrice)}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-3">Services Breakdown</h3>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>{booking.serviceType}</span>
                      <span className="font-medium">{formatPrice(booking.totalPrice)}</span>
                    </div>
                  </div>
                </div>
              )}


              {/* Customer details */}
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

              {/* Notification Preferences Section */}
              <div className="mt-10">
                <h2 className="text-xl font-bold mb-4">Notification Preferences</h2>
                <NotificationPreferences bookingId={parseInt(bookingId)} phone={booking?.phone || ""} email={booking?.email || ""} />
              </div>

            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}