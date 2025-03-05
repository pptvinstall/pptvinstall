
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Calendar, CalendarIcon } from "@/components/ui/calendar";
import LoadingSpinner from "@/components/loading-spinner";
import { 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Clock3, 
  CalendarDays,
  History,
  Star
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Function to fetch customer bookings by email
  const fetchBookingsByEmail = async (email) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/bookings/customer/${email}`);
      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }
      const data = await response.json();
      setBookings(data);
      setIsLoggedIn(true);
      localStorage.setItem("customerEmail", email);
      toast({
        title: "Logged in successfully",
        description: `Found ${data.length} booking(s) for ${email}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch bookings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user is logged in on page load
  useEffect(() => {
    const storedEmail = localStorage.getItem("customerEmail");
    if (storedEmail) {
      setEmail(storedEmail);
      fetchBookingsByEmail(storedEmail);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    fetchBookingsByEmail(email);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setBookings([]);
    localStorage.removeItem("customerEmail");
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, "PPP");
  };

  // Format service breakdown for display
  const formatServiceBreakdown = (detailedServices) => {
    if (!detailedServices) return [];
    
    try {
      const parsed = JSON.parse(detailedServices);
      return parsed.serviceBreakdown || [];
    } catch {
      return [];
    }
  };

  // Calculate total price from service breakdown
  const calculateTotal = (serviceBreakdown) => {
    return serviceBreakdown.reduce((total, section) => {
      const sectionTotal = section.items.reduce((sum, item) => sum + item.price, 0);
      return total + sectionTotal;
    }, 0);
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Customer Account</h1>

      {!isLoggedIn ? (
        <Card>
          <CardHeader>
            <CardTitle>Login to Your Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block mb-2">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Enter the email address you used for your bookings
                </p>
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <LoadingSpinner /> : "View My Bookings"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Welcome, {email}</h2>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>

          <Tabs defaultValue="upcoming">
            <TabsList className="mb-4">
              <TabsTrigger value="upcoming">Upcoming Appointments</TabsTrigger>
              <TabsTrigger value="past">Past Appointments</TabsTrigger>
              <TabsTrigger value="all">All Bookings</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : bookings.filter(booking => 
                  new Date(booking.preferredDate) >= new Date() && 
                  booking.status !== 'cancelled'
                ).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">You have no upcoming appointments</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings
                    .filter(booking => 
                      new Date(booking.preferredDate) >= new Date() && 
                      booking.status !== 'cancelled'
                    )
                    .sort((a, b) => new Date(a.preferredDate) - new Date(b.preferredDate))
                    .map((booking) => {
                      const serviceBreakdown = formatServiceBreakdown(booking.detailedServices);
                      return (
                        <Card key={booking.id} className="overflow-hidden">
                          <div className="p-1 bg-brand-blue-500 text-white">
                            <p className="text-center text-sm">
                              Appointment: {formatDate(booking.preferredDate)} at {booking.preferredTime}
                            </p>
                          </div>
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:justify-between">
                              <div className="space-y-4 mb-4 md:mb-0">
                                <h3 className="font-bold text-lg">{booking.serviceType}</h3>
                                <div className="flex items-center text-sm text-gray-600">
                                  <MapPin className="w-4 h-4 mr-2" />
                                  <span>
                                    {booking.streetAddress}, 
                                    {booking.addressLine2 ? ` ${booking.addressLine2}, ` : ' '}
                                    {booking.city}, {booking.state} {booking.zipCode}
                                  </span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                  <Phone className="w-4 h-4 mr-2" />
                                  <span>{booking.phone}</span>
                                </div>
                              </div>
                              <div className="flex flex-col justify-between">
                                <span className={`text-sm px-3 py-1 rounded-full ${getStatusBadgeClass(booking.status)}`}>
                                  {booking.status}
                                </span>
                                <div className="mt-4">
                                  <div className="bg-gray-50 p-3 rounded-lg text-right">
                                    <p className="text-sm text-gray-600">Total</p>
                                    <p className="text-2xl font-bold text-brand-blue-600">
                                      ${parseFloat(booking.totalPrice).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <Separator className="my-4" />
                            
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.location.href = `/booking-details/${booking.id}`}
                              >
                                View Details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="past">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : bookings.filter(booking => 
                  new Date(booking.preferredDate) < new Date() || 
                  booking.status === 'completed'
                ).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">You have no past appointments</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings
                    .filter(booking => 
                      new Date(booking.preferredDate) < new Date() || 
                      booking.status === 'completed'
                    )
                    .sort((a, b) => new Date(b.preferredDate) - new Date(a.preferredDate))
                    .map((booking) => (
                      <Card key={booking.id} className="overflow-hidden">
                        <div className={`p-1 ${booking.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'} text-white`}>
                          <p className="text-center text-sm">
                            {booking.status === 'cancelled' ? 'Cancelled' : 'Completed'}: {formatDate(booking.preferredDate)}
                          </p>
                        </div>
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:justify-between">
                            <div className="space-y-2 mb-4 md:mb-0">
                              <h3 className="font-bold text-lg">{booking.serviceType}</h3>
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="w-4 h-4 mr-2" />
                                <span>
                                  {booking.streetAddress},
                                  {booking.city}, {booking.state}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col justify-between">
                              <span className={`text-sm px-3 py-1 rounded-full ${getStatusBadgeClass(booking.status)}`}>
                                {booking.status}
                              </span>
                              <div className="mt-4">
                                <div className="bg-gray-50 p-3 rounded-lg text-right">
                                  <p className="text-sm text-gray-600">Total</p>
                                  <p className="text-2xl font-bold text-brand-blue-600">
                                    ${parseFloat(booking.totalPrice).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <Separator className="my-4" />
                          
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.location.href = `/booking-details/${booking.id}`}
                            >
                              View Details
                            </Button>
                            {booking.status !== 'cancelled' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => window.location.href = `/booking?rebook=${booking.id}`}
                              >
                                Book Again
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">You have no bookings</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings
                    .sort((a, b) => new Date(b.preferredDate) - new Date(a.preferredDate))
                    .map((booking) => (
                      <Card key={booking.id} className="overflow-hidden">
                        <div className={`p-1 ${
                          booking.status === 'cancelled' 
                            ? 'bg-red-500' 
                            : new Date(booking.preferredDate) < new Date() 
                              ? 'bg-gray-500' 
                              : 'bg-brand-blue-500'
                        } text-white`}>
                          <p className="text-center text-sm">
                            {formatDate(booking.preferredDate)} at {booking.preferredTime}
                          </p>
                        </div>
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:justify-between">
                            <div className="space-y-2 mb-4 md:mb-0">
                              <h3 className="font-bold text-lg">{booking.serviceType}</h3>
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="w-4 h-4 mr-2" />
                                <span>
                                  {booking.streetAddress},
                                  {booking.city}, {booking.state}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col justify-between">
                              <span className={`text-sm px-3 py-1 rounded-full ${getStatusBadgeClass(booking.status)}`}>
                                {booking.status}
                              </span>
                              <div className="mt-4">
                                <div className="bg-gray-50 p-3 rounded-lg text-right">
                                  <p className="text-sm text-gray-600">Total</p>
                                  <p className="text-2xl font-bold text-brand-blue-600">
                                    ${parseFloat(booking.totalPrice).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <Separator className="my-4" />
                          
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.location.href = `/booking-details/${booking.id}`}
                            >
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
