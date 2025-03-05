import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/loading-spinner";
import { apiRequest } from "@/lib/queryClient";
import { NotificationPreferences } from "@/components/ui/notification-preferences";

interface BookingData {
  id: number;
  name: string;
  email: string;
  phone: string;
  streetAddress: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  notes?: string;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  status: string;
  totalPrice: string;
  detailedServices: string;
  formattedDate?: string;
}

export default function BookingConfirmation() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const bookingId = searchParams.get('id');
  const [error, setError] = useState<string | null>(null);

  const { data: booking, isLoading } = useQuery<BookingData>({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      if (!bookingId) {
        throw new Error('No booking ID provided');
      }

      const response = await apiRequest("GET", `/api/bookings/${bookingId}`);
      const data = await response.json();

      if (data.preferredDate) {
        const date = new Date(data.preferredDate);
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
    },
    enabled: !!bookingId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1
  });

  // Memoized price formatter
  const formatPrice = useMemo(() => (amount: number | string) => {
    if (!amount) return '$0.00';
    const price = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }, []);

  // Memoized service details parsing
  const parsedServices = useMemo(() => {
    if (!booking?.detailedServices) return [];
    try {
      return Array.isArray(booking.detailedServices) 
        ? booking.detailedServices 
        : JSON.parse(booking.detailedServices);
    } catch (e) {
      return [];
    }
  }, [booking?.detailedServices]);

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
                  {[
                    { label: 'Booking ID', value: booking.id },
                    { label: 'Status', value: booking.status, className: 'capitalize' },
                    { label: 'Service Type', value: booking.serviceType },
                    { label: 'Appointment Date', value: booking.formattedDate },
                    { label: 'Appointment Time', value: booking.preferredTime },
                    { label: 'Total Price', value: formatPrice(booking.totalPrice), className: 'text-green-600' }
                  ].map(({ label, value, className = '' }) => (
                    <div key={label} className="flex justify-between border-b pb-2">
                      <span className="text-gray-500">{label}:</span>
                      <span className={`font-medium ${className}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Services breakdown */}
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-3">Services Breakdown</h3>
                {parsedServices.length > 0 ? (
                  <>
                    {parsedServices.map((section: any, i: number) => (
                      <div key={i} className="mb-6 last:mb-0 bg-gray-50 p-4 rounded-md space-y-4">
                        <div className="font-medium text-indigo-700 mb-2">{section.title || "Service Item"}</div>
                        {section.items?.map((item: any, j: number) => (
                          <div key={j} className="flex justify-between py-1 px-2">
                            <span className={item.isDiscount ? "text-green-600" : ""}>
                              {item.label}
                              {item.note && (
                                <span className="ml-1 text-gray-400 text-xs">(Note: {item.note})</span>
                              )}
                            </span>
                            <span className={`font-medium ${item.isDiscount ? "text-green-600" : ""}`}>
                              {item.isDiscount ? "-" : ""}{formatPrice(Math.abs(item.price))}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="mt-4 flex justify-between py-3 bg-indigo-50 px-4 rounded-md font-medium">
                      <span>Total</span>
                      <span className="text-green-600">{formatPrice(booking.totalPrice)}</span>
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>{booking.serviceType}</span>
                      <span className="font-medium">{formatPrice(booking.totalPrice)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer details and address */}
              {[
                {
                  title: "Customer Details",
                  fields: [
                    { label: "Name", value: booking.name },
                    { label: "Email", value: booking.email },
                    { label: "Phone", value: booking.phone }
                  ]
                },
                {
                  title: "Installation Address",
                  content: (
                    <>
                      <div><span className="font-medium">{booking.streetAddress}</span></div>
                      {booking.addressLine2 && (
                        <div><span className="font-medium">{booking.addressLine2}</span></div>
                      )}
                      <div>
                        <span className="font-medium">
                          {booking.city}, {booking.state} {booking.zipCode}
                        </span>
                      </div>
                    </>
                  )
                }
              ].map(section => (
                <div key={section.title}>
                  <h3 className="text-lg font-semibold mb-3">{section.title}</h3>
                  <div className="grid gap-2">
                    {section.fields ? (
                      section.fields.map(field => (
                        <div key={field.label} className="flex justify-between">
                          <span className="text-gray-500">{field.label}:</span>
                          <span className="font-medium">{field.value}</span>
                        </div>
                      ))
                    ) : (
                      section.content
                    )}
                  </div>
                </div>
              ))}

              {/* Notes */}
              {booking.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Additional Notes</h3>
                  <p className="text-gray-700">{booking.notes}</p>
                </div>
              )}

              {/* Navigation buttons */}
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

              {/* Notification Preferences */}
              {bookingId && (
                <div className="mt-10">
                  <h2 className="text-xl font-bold mb-4">Notification Preferences</h2>
                  <NotificationPreferences 
                    bookingId={parseInt(bookingId)} 
                    phone={booking?.phone || ""} 
                    email={booking?.email || ""} 
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}