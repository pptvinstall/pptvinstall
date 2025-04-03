import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { format } from 'date-fns';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomerBookingDialog } from '@/components/customer/customer-booking-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { 
  CalendarClock, 
  Clock, 
  MapPin, 
  FileEdit, 
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';

import type { Booking } from '@shared/schema';

export default function CustomerPortalPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [customerToken, setCustomerToken] = useState<{ id: string, email: string, name: string } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);

  // Get customer token from localStorage
  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    if (token) {
      try {
        const parsedToken = JSON.parse(token);
        setCustomerToken(parsedToken);
      } catch (error) {
        // Invalid token format, redirect to login
        navigate('/customer-login');
      }
    } else {
      // No token found, redirect to login
      navigate('/customer-login');
    }
  }, [navigate]);

  // Fetch customer bookings
  const { data: bookingsData, isLoading: isLoadingBookings, error: bookingsError } = useQuery({
    queryKey: ['/api/customers/bookings', customerToken?.id],
    queryFn: async () => {
      if (!customerToken?.id) {
        return { success: false, bookings: [] };
      }
      return await fetch(`/api/customers/${customerToken.id}/bookings`).then(res => res.json());
    },
    enabled: !!customerToken?.id,
  });

  // Mutation for updating a booking
  const updateBookingMutation = useMutation({
    mutationFn: async (data: { id: number, updates: Partial<Booking> }) => {
      const response = await fetch(`/api/customers/bookings/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data.updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update booking');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update booking');
      }
      
      return result.booking;
    },
    onSuccess: () => {
      // Close the dialog
      setIsBookingDialogOpen(false);
      setSelectedBooking(null);
      
      // Show success message
      toast({
        title: 'Booking updated',
        description: 'Your booking has been updated successfully.',
        variant: 'default',
      });
      
      // Refresh the bookings list
      queryClient.invalidateQueries({ queryKey: ['/api/customers/bookings', customerToken?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while updating your booking.',
        variant: 'destructive',
      });
    }
  });

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    navigate('/');
  };

  // Open the edit dialog for a booking
  const openEditDialog = (booking: Booking) => {
    // Ensure we have a valid booking object with proper date format
    const formattedBooking = {
      ...booking,
      // Ensure preferredDate is in proper format (YYYY-MM-DD)
      preferredDate: booking.preferredDate ? 
        (typeof booking.preferredDate === 'string' ? booking.preferredDate : format(new Date(booking.preferredDate), 'yyyy-MM-dd')) 
        : format(new Date(), 'yyyy-MM-dd')
    };
    
    console.log("Opening edit dialog with booking:", formattedBooking);
    setSelectedBooking(formattedBooking);
    setIsBookingDialogOpen(true);
  };

  // Handle booking update
  const handleBookingUpdate = (data: Partial<Booking>) => {
    if (selectedBooking?.id) {
      updateBookingMutation.mutate({
        id: Number(selectedBooking.id),
        updates: data
      });
    }
  };

  // Get status badge component
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <div className="flex items-center text-green-600 font-medium">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Active
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex items-center text-red-600 font-medium">
            <XCircle className="w-4 h-4 mr-1" />
            Cancelled
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center text-blue-600 font-medium">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Completed
          </div>
        );
      default:
        return (
          <div className="flex items-center text-gray-600 font-medium">
            {status}
          </div>
        );
    }
  };

  if (!customerToken) {
    return null; // Will redirect to login via the useEffect
  }

  return (
    <div className="container py-10 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Customer Portal</h1>
          <p className="text-muted-foreground">Welcome back, {customerToken.name}</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>Logout</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Bookings</CardTitle>
          <CardDescription>
            View and manage your bookings with Picture Perfect TV Installation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingBookings ? (
            <div className="py-8 text-center">Loading your bookings...</div>
          ) : bookingsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load your bookings. Please try again later.
              </AlertDescription>
            </Alert>
          ) : (bookingsData?.bookings?.length === 0) ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">You don't have any bookings yet.</p>
              <Button className="mt-4" onClick={() => navigate('/booking')}>Book a Service</Button>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookingsData.bookings.map((booking: Booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.serviceType}
                        {booking.tvSize && <span className="text-sm text-muted-foreground block">{booking.tvSize} TV</span>}
                        {booking.mountType && <span className="text-sm text-muted-foreground block">{booking.mountType} Mount</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CalendarClock className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span>
                            {booking.preferredDate && format(new Date(booking.preferredDate), 'MMM d, yyyy')}
                            <div className="text-sm text-muted-foreground flex items-center mt-1">
                              <Clock className="w-3 h-3 mr-1" />
                              {booking.appointmentTime}
                            </div>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span>
                            {booking.city}, {booking.state} {booking.zipCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(booking.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        {booking.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(booking)}
                            className="flex items-center"
                          >
                            <FileEdit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedBooking && (
        <CustomerBookingDialog
          booking={selectedBooking}
          isOpen={isBookingDialogOpen}
          onClose={() => setIsBookingDialogOpen(false)}
          onUpdate={handleBookingUpdate}
          isUpdating={updateBookingMutation.isPending}
        />
      )}
    </div>
  );
}