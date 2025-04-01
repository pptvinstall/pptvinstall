import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Check, X, Edit } from "lucide-react";
import type { Booking } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface DayBookings {
  [date: string]: Booking[];
}

export function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // Query to fetch bookings
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bookings");
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      const data = await response.json();
      return data.bookings || [];
    }
  });

  // Group bookings by date
  const bookingsByDate: DayBookings = bookings.reduce((acc: DayBookings, booking: Booking) => {
    const date = booking.preferredDate.split('T')[0]; // Ensure we only use the date part
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(booking);
    return acc;
  }, {});

  // Mutation for approving bookings
  const approveMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiRequest("POST", `/api/bookings/${bookingId}/approve`);
      if (!response.ok) {
        throw new Error('Failed to approve booking');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Approved",
        description: "The booking has been approved and the time slot has been locked.",
      });
    }
  });

  // Mutation for declining bookings
  const declineMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiRequest("POST", `/api/bookings/${bookingId}/decline`);
      if (!response.ok) {
        throw new Error('Failed to decline booking');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Declined",
        description: "The booking has been declined and the customer will be notified.",
      });
    }
  });

  // Mutation for updating bookings
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<Booking> }) => {
      const response = await apiRequest("PUT", `/api/bookings/${id}`, data);
      if (!response.ok) {
        throw new Error('Failed to update booking');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Booking Updated",
        description: "The booking details have been successfully updated.",
      });
    }
  });

  // Function to get bookings for the selected date
  const getSelectedDateBookings = () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return bookingsByDate[dateStr] || [];
  };

  // Helper function to format time for display
  const formatTime = (time: string) => {
    return time;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
              modifiers={{
                booked: (date) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  return !!bookingsByDate[dateStr]?.length;
                }
              }}
              modifiersStyles={{
                booked: { backgroundColor: "var(--primary-50)", color: "var(--primary-900)" }
              }}
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-medium">
              Bookings for {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </h3>
            {isLoading ? (
              <div>Loading bookings...</div>
            ) : (
              <div className="space-y-4">
                {getSelectedDateBookings().map((booking) => (
                  <Card key={booking.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{booking.name}</h4>
                        <p className="text-sm text-muted-foreground">{formatTime(booking.appointmentTime)}</p>
                        <p className="text-sm">{booking.serviceType}</p>
                        <p className="text-sm text-muted-foreground">
                          Status: <span className={`font-medium ${
                            booking.status === 'active' ? 'text-green-600' : 
                            booking.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'
                          }`}>{booking.status}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => approveMutation.mutate(booking.id as string)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => declineMutation.mutate(booking.id as string)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {getSelectedDateBookings().length === 0 && (
                  <p className="text-muted-foreground">No bookings for this date.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Quick Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Edit Booking</DialogTitle>
            <DialogDescription>
              Make quick adjustments to the booking details.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Time</label>
                <Input
                  value={selectedBooking.appointmentTime}
                  onChange={(e) => setSelectedBooking({
                    ...selectedBooking,
                    appointmentTime: e.target.value
                  })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Service Type</label>
                <Input
                  value={selectedBooking.serviceType}
                  onChange={(e) => setSelectedBooking({
                    ...selectedBooking,
                    serviceType: e.target.value
                  })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedBooking) {
                  updateMutation.mutate({
                    id: selectedBooking.id as string,
                    data: {
                      appointmentTime: selectedBooking.appointmentTime,
                      serviceType: selectedBooking.serviceType
                    }
                  });
                }
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}