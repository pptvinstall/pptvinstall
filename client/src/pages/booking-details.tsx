
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import LoadingSpinner from "@/components/loading-spinner";
import { 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function BookingDetailsPage() {
  const [_, params] = useParams();
  const bookingId = params.id;
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch booking details');
      }
      return response.json();
    }
  });

  useEffect(() => {
    // Verify that the logged-in user owns this booking
    const customerEmail = localStorage.getItem("customerEmail");
    if (booking && customerEmail && booking.email !== customerEmail) {
      toast({
        title: "Access denied",
        description: "You don't have permission to view this booking",
        variant: "destructive",
      });
      navigate("/account");
    }
  }, [booking]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return format(date, "PPP");
  };

  // Format service breakdown
  const formatServiceBreakdown = (detailedServices) => {
    if (!detailedServices) return { services: [], serviceBreakdown: [] };
    
    try {
      return JSON.parse(detailedServices);
    } catch {
      return { services: [], serviceBreakdown: [] };
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>Confirmed</span>
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span>Cancelled</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-2 text-blue-600">
            <CheckCircle className="h-5 w-5" />
            <span>Completed</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-gray-600">
            <AlertCircle className="h-5 w-5" />
            <span>Pending</span>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-16 px-4 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto py-16 px-4">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Booking Not Found</h2>
            <p className="text-gray-600 mb-6">
              The booking you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate("/account")}>
              Back to Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { services, serviceBreakdown } = formatServiceBreakdown(booking.detailedServices);

  return (
    <div className="container mx-auto py-8 px-4">
      <Button 
        variant="outline" 
        className="mb-6"
        onClick={() => navigate("/account")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Account
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Booking Details</CardTitle>
                {getStatusBadge(booking.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-brand-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">Appointment Date</p>
                    <p className="font-medium">{formatDate(booking.preferredDate)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-brand-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">Appointment Time</p>
                    <p className="font-medium">{booking.preferredTime}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-brand-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">Installation Address</p>
                    <p className="font-medium">
                      {booking.streetAddress}
                      {booking.addressLine2 && `, ${booking.addressLine2}`}
                    </p>
                    <p className="font-medium">
                      {booking.city}, {booking.state} {booking.zipCode}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Contact Information</p>
                  
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-brand-blue-500" />
                    <p>{booking.name}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-brand-blue-500" />
                    <p>{booking.email}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-brand-blue-500" />
                    <p>{booking.phone}</p>
                  </div>
                </div>

                {booking.notes && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-brand-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Additional Notes</p>
                        <p className="whitespace-pre-line">{booking.notes}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            {booking.status === 'active' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/booking/modify/${booking.id}`)}
                >
                  Modify Booking
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to cancel this booking?")) {
                      fetch(`/api/bookings/${booking.id}/cancel`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ reason: 'Cancelled by customer' }),
                      })
                        .then(response => {
                          if (response.ok) {
                            toast({
                              title: "Booking cancelled",
                              description: "Your booking has been cancelled successfully",
                            });
                            navigate("/account");
                          } else {
                            throw new Error("Failed to cancel booking");
                          }
                        })
                        .catch(error => {
                          toast({
                            title: "Error",
                            description: "Failed to cancel booking. Please try again.",
                            variant: "destructive",
                          });
                        });
                    }
                  }}
                >
                  Cancel Booking
                </Button>
              </>
            )}

            {booking.status !== 'active' && (
              <Button
                onClick={() => navigate(`/booking?rebook=${booking.id}`)}
              >
                Book Again
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Price Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {serviceBreakdown && serviceBreakdown.length > 0 ? (
                <div className="space-y-6">
                  {serviceBreakdown.map((section, index) => (
                    <div key={index} className="space-y-2">
                      <h3 className="font-semibold text-brand-blue-700">{section.title}</h3>
                      <div className="space-y-1">
                        {section.items.map((item, i) => (
                          <div key={i} className="flex justify-between">
                            <span className={item.isDiscount ? "text-green-600" : ""}>
                              {item.label}
                            </span>
                            <span className={item.isDiscount ? "text-green-600" : ""}>
                              ${item.price.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${parseFloat(booking.totalPrice).toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No price details available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                If you need to make changes to your booking or have any questions, 
                please contact our customer service.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-brand-blue-500" />
                  <span>404-702-4748</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-brand-blue-500" />
                  <span>contact@pictureperfecttvinstall.com</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
