import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function BookingConfirmation() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location?.split('?')[1] || "");
  const bookingId = searchParams.get('id');

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      const response = await fetch(`/api/bookings/${bookingId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch booking details');
      }
      return response.json();
    },
    enabled: !!bookingId
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-24 px-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto py-24 px-4 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Booking Not Found</h1>
        <p className="text-lg mb-8">Sorry, we couldn't find your booking. Please check your booking ID and try again.</p>
        <Link to="/booking" className="inline-block bg-brand-blue-500 text-white py-3 px-6 rounded-lg font-medium">
          Book a New Appointment
        </Link>
      </div>
    );
  }

  // Create service breakdown from the booking data
  const serviceDetails = booking.detailedServices ? JSON.parse(booking.detailedServices) : null;

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <Card className="border-2 border-primary/10 shadow-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl">Booking Confirmed!</CardTitle>
          <CardDescription className="text-lg">
            Thank you for booking with us, {booking.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Selected Services:</h3>
                {serviceDetails?.services.map((service: string, index: number) => (
                  <div key={index} className="text-sm text-gray-600 mb-1">• {service}</div>
                ))}
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Appointment Details:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-600">Date:</div>
                  <div>{booking.preferredDate}</div>
                  <div className="text-gray-600">Time:</div>
                  <div>{booking.appointmentTime || "To be confirmed"}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Installation Address:</h3>
                <div className="text-sm text-gray-600">
                  <div>{booking.streetAddress}</div>
                  {booking.addressLine2 && <div>{booking.addressLine2}</div>}
                  <div>{booking.city}, {booking.state} {booking.zipCode}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Contact Information:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-600">Name:</div>
                  <div>{booking.name}</div>
                  <div className="text-gray-600">Email:</div>
                  <div>{booking.email}</div>
                  <div className="text-gray-600">Phone:</div>
                  <div>{booking.phone}</div>
                </div>
              </div>

              {serviceDetails && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Price Breakdown:</h3>
                  <div className="space-y-4">
                    {serviceDetails.serviceBreakdown.map((section: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="font-medium text-primary mb-2">{section.title}</div>
                        {section.items.map((item: any, itemIndex: number) => (
                          <div key={itemIndex} className="flex justify-between text-sm">
                            <span>{item.label}</span>
                            <span className={item.isDiscount ? "text-green-600" : ""}>
                              ${item.price.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold text-lg pt-4 border-t">
                      <span>Total:</span>
                      <span>${Number(booking.totalPrice || 0).toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-gray-600 italic mt-2">
                      Note: Full payment is due at the time of installation.
                    </div>
                  </div>
                </div>
              )}

              {booking.notes && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Additional Notes:</h3>
                  <div className="text-sm text-gray-600">{booking.notes}</div>
                </div>
              )}

              <div className="pt-6">
                <h3 className="font-semibold text-lg mb-2">What happens next?</h3>
                <p className="text-sm text-gray-600">
                  We've sent a confirmation email to {booking.email} with all the details of your booking. 
                  Our team will contact you within 24 hours to confirm your appointment time.
                </p>
              </div>
            </div>

            <div className="flex justify-center pt-6">
              <Link to="/">
                <Button>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Return to Homepage
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}