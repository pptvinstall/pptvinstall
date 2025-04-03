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
import { MobileEditDialog } from '@/components/customer/mobile-edit-dialog';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks/use-media-query';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  CalendarClock, 
  Clock, 
  MapPin, 
  FileEdit, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar
} from 'lucide-react';

import type { Booking } from '@shared/schema';

// Extended booking type to handle both old and new property names
interface ExtendedBooking extends Booking {
  date?: string;
  time?: string;
  updatedAt?: string;
}

export default function CustomerPortalPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [customerToken, setCustomerToken] = useState<{ id: string, email: string, name: string } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<ExtendedBooking | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  
  // State for cancel dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<ExtendedBooking | null>(null);
  
  // State for success dialog
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDialogType, setSuccessDialogType] = useState<'reschedule' | 'cancel'>('reschedule');
  const [successMessage, setSuccessMessage] = useState('');
  
  // State for active tab
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

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
      const response = await fetch(`/api/customers/${customerToken.id}/bookings`);
      const data = await response.json();
      
      // Make sure the data is always in a consistent format
      if (data.success && Array.isArray(data.bookings)) {
        // Ensure all date fields are properly formatted
        data.bookings = data.bookings.map((booking: any) => ({
          ...booking,
          // Ensure date field consistency
          preferredDate: booking.preferredDate || booking.date,
          appointmentTime: booking.appointmentTime || booking.time
        }));
      }
      
      return data;
    },
    enabled: !!customerToken?.id,
  });

  // Mutation for updating a booking
  const updateBookingMutation = useMutation({
    mutationFn: async (data: { id: number, updates: Partial<ExtendedBooking> }) => {
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
    onSuccess: (updatedBooking) => {
      // Close the dialog
      setIsBookingDialogOpen(false);
      setSelectedBooking(null);
      
      // Prepare success message for rescheduling
      if (updatedBooking.preferredDate && updatedBooking.appointmentTime) {
        const formattedDate = format(new Date(updatedBooking.preferredDate), 'EEEE, MMMM d, yyyy');
        const message = `Your appointment has been rescheduled for ${formattedDate} at ${updatedBooking.appointmentTime}.`;
        
        // Show success dialog instead of toast
        setSuccessMessage(message);
        setSuccessDialogType('reschedule');
        setShowSuccessDialog(true);
      } else {
        // Fallback to toast if no date/time
        toast({
          title: 'Booking updated',
          description: 'Your booking has been updated successfully.',
          variant: 'default',
        });
      }
      
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
  
  // Mutation for cancelling a booking
  const cancelBookingMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/customers/bookings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to cancel booking');
      }
      
      return result.booking;
    },
    onSuccess: (cancelledBooking) => {
      // Close the cancel dialog
      setShowCancelDialog(false);
      setBookingToCancel(null);
      
      // Show success dialog
      const message = 'Your appointment has been cancelled successfully. Thank you for letting us know.';
      setSuccessMessage(message);
      setSuccessDialogType('cancel');
      setShowSuccessDialog(true);
      
      // Refresh the bookings list
      queryClient.invalidateQueries({ queryKey: ['/api/customers/bookings', customerToken?.id] });
    },
    onError: (error: Error) => {
      setShowCancelDialog(false);
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while cancelling your booking.',
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
  const openEditDialog = (booking: ExtendedBooking) => {
    try {
      // Deep-clone the booking to avoid reference issues
      const formattedBooking = JSON.parse(JSON.stringify(booking));
      
      // Set the dialog data in a specific order to prevent race conditions
      setSelectedBooking(formattedBooking);
      
      // Give a small delay before opening the dialog to ensure state is updated
      setTimeout(() => {
        setIsBookingDialogOpen(true);
      }, 50);
      
      console.log("Opening edit dialog with booking:", formattedBooking);
    } catch (error) {
      console.error("Error opening edit dialog:", error);
      toast({
        title: "Error",
        description: "There was a problem opening the edit dialog. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle booking update
  const handleBookingUpdate = (data: Partial<ExtendedBooking>) => {
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

  // Check if we should use mobile version
  const isMobile = useMediaQuery("(max-width: 640px)");

  if (!customerToken) {
    return null; // Will redirect to login via the useEffect
  }

  const closeDialog = () => {
    setIsBookingDialogOpen(false);
    // Clear selected booking after dialog closes
    setTimeout(() => setSelectedBooking(null), 300);
  };
  
  // Function to confirm cancellation
  const confirmCancelBooking = (booking: ExtendedBooking) => {
    setBookingToCancel(booking);
    setShowCancelDialog(true);
  };
  
  // Function to actually cancel the booking
  const handleCancelBooking = () => {
    if (bookingToCancel?.id) {
      cancelBookingMutation.mutate(Number(bookingToCancel.id));
    }
  };
  
  // Close the success dialog
  const closeSuccessDialog = () => {
    setShowSuccessDialog(false);
  };

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
          
          {/* Tab Navigation */}
          <div className="flex border-b mt-4">
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'active'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground transition-colors'
              }`}
              onClick={() => setActiveTab('active')}
            >
              Active Bookings
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'history'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground transition-colors'
              }`}
              onClick={() => setActiveTab('history')}
            >
              Booking History
            </button>
          </div>
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
          ) : activeTab === 'active' ? (
            // Active Bookings Table
            <div className="relative overflow-x-auto sm:rounded-md border">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Service</TableHead>
                    <TableHead className="whitespace-nowrap">Date & Time</TableHead>
                    <TableHead className="whitespace-nowrap hidden md:table-cell">Location</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookingsData.bookings
                    .filter((booking: ExtendedBooking) => booking.status !== 'cancelled')
                    .map((booking: ExtendedBooking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.serviceType}
                        {booking.tvSize && <span className="text-sm text-muted-foreground block">{booking.tvSize} TV</span>}
                        {booking.mountType && <span className="text-sm text-muted-foreground block">{booking.mountType} Mount</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col sm:flex-row sm:items-center">
                          <div className="flex items-center">
                            <CalendarClock className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
                            <span className="font-medium whitespace-nowrap">
                              {booking.preferredDate ? format(new Date(booking.preferredDate), 'EEE, MMM d, yyyy') : 
                               booking.date ? format(new Date(booking.date), 'EEE, MMM d, yyyy') : '-'}
                            </span>
                          </div>
                          <div className="flex items-center mt-1 sm:mt-0 sm:ml-4">
                            <Clock className="w-3 h-3 mr-1 text-primary flex-shrink-0" />
                            <span className="whitespace-nowrap font-medium">
                              {booking.appointmentTime || booking.time || '-'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
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
                          <div className="flex flex-col sm:flex-row gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(booking)}
                              className="flex items-center bg-primary/10 hover:bg-primary/20 border-primary/20"
                            >
                              <FileEdit className="w-4 h-4 mr-1 text-primary" />
                              <span className="text-primary font-medium">Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => confirmCancelBooking(booking)}
                              className="flex items-center bg-red-50 hover:bg-red-100 border-red-200 text-red-500"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              <span className="font-medium">Cancel</span>
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            // Booking History Table (Cancelled Bookings)
            <div>
              <div className="bg-muted/30 rounded-md p-4 mb-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 text-muted-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    This section shows your cancelled bookings. These time slots are now available for others to book.
                  </p>
                </div>
              </div>
              
              {bookingsData.bookings.filter((booking: ExtendedBooking) => booking.status === 'cancelled').length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">You don't have any cancelled bookings.</p>
                </div>
              ) : (
                <div className="relative overflow-x-auto sm:rounded-md border">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Service</TableHead>
                        <TableHead className="whitespace-nowrap">Date & Time</TableHead>
                        <TableHead className="whitespace-nowrap hidden md:table-cell">Location</TableHead>
                        <TableHead className="whitespace-nowrap">Status</TableHead>
                        <TableHead className="whitespace-nowrap">Cancelled On</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookingsData.bookings
                        .filter((booking: ExtendedBooking) => booking.status === 'cancelled')
                        .map((booking: ExtendedBooking) => (
                        <TableRow key={booking.id} className="opacity-75">
                          <TableCell className="font-medium">
                            {booking.serviceType}
                            {booking.tvSize && <span className="text-sm text-muted-foreground block">{booking.tvSize} TV</span>}
                            {booking.mountType && <span className="text-sm text-muted-foreground block">{booking.mountType} Mount</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <div className="flex items-center">
                                <CalendarClock className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
                                <span className="font-medium line-through whitespace-nowrap">
                                  {booking.preferredDate ? format(new Date(booking.preferredDate), 'EEE, MMM d, yyyy') : 
                                   booking.date ? format(new Date(booking.date as unknown as string), 'EEE, MMM d, yyyy') : '-'}
                                </span>
                              </div>
                              <div className="flex items-center mt-1">
                                <Clock className="w-3 h-3 mr-1 text-primary flex-shrink-0" />
                                <span className="line-through whitespace-nowrap">
                                  {booking.appointmentTime || booking.time as unknown as string || '-'}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
                              <span>
                                {booking.city}, {booking.state} {booking.zipCode}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(booking.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {booking.updatedAt ? format(new Date(booking.updatedAt), 'MMM d, yyyy') : 'Unknown'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Render the appropriate dialog based on screen size */}
      {selectedBooking && isMobile ? (
        // Mobile version
        <MobileEditDialog
          booking={selectedBooking}
          isOpen={isBookingDialogOpen}
          onClose={closeDialog}
          onUpdate={handleBookingUpdate}
          isUpdating={updateBookingMutation.isPending}
        />
      ) : selectedBooking && (
        // Desktop version
        <CustomerBookingDialog
          booking={selectedBooking}
          isOpen={isBookingDialogOpen}
          onClose={closeDialog}
          onUpdate={handleBookingUpdate}
          isUpdating={updateBookingMutation.isPending}
        />
      )}
      
      {/* Booking cancellation confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
              {bookingToCancel && (
                <div className="mt-4 border rounded-md p-3 bg-muted/50">
                  <div className="flex items-center mb-2">
                    <CalendarClock className="w-4 h-4 mr-2 text-primary" />
                    <span className="font-medium">
                      {bookingToCancel.preferredDate 
                        ? format(new Date(bookingToCancel.preferredDate), 'EEEE, MMMM d, yyyy')
                        : bookingToCancel.date 
                          ? format(new Date(bookingToCancel.date), 'EEEE, MMMM d, yyyy')
                          : 'Unknown date'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-primary" />
                    <span className="font-medium">
                      {bookingToCancel.appointmentTime || bookingToCancel.time || 'Unknown time'}
                    </span>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              disabled={cancelBookingMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {cancelBookingMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Appointment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Success dialog for rescheduling and cancellation */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {successDialogType === 'reschedule' ? 'Appointment Rescheduled' : 'Appointment Cancelled'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex flex-col gap-4">
                <div className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 mr-2 text-green-500 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
                
                {successDialogType === 'reschedule' && (
                  <div className="flex items-start">
                    <Calendar className="w-5 h-5 mr-2 text-primary mt-0.5" />
                    <span>We look forward to seeing you then!</span>
                  </div>
                )}
                
                {successDialogType === 'cancel' && (
                  <div className="flex items-start">
                    <Calendar className="w-5 h-5 mr-2 text-primary mt-0.5" />
                    <span>Your timeslot is now available for someone else to book.</span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}