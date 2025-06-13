import React, { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Booking } from "@shared/schema";

// Extended booking interface to include email notification flag
interface ExtendedBooking extends Booking {
  sendUpdateEmail?: boolean;
}

interface BookingDetailsDialogProps {
  booking: Booking;
  onClose: () => void;
  open: boolean;
}

export function BookingDetailsDialog({ booking, onClose, open }: BookingDetailsDialogProps) {
  const [selectedBooking, setSelectedBooking] = useState<ExtendedBooking>(booking as ExtendedBooking);
  const [cancellationReason, setCancellationReason] = useState("");
  const { toast } = useToast();

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ExtendedBooking> }) => {
      const response = await apiRequest("PUT", `/api/bookings/${id}`, data);
      if (!response.ok) {
        throw new Error('Failed to update booking');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      onClose();
      toast({
        title: "Booking updated",
        description: "The booking has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update the booking. Please try again.",
        variant: "destructive"
      });
    }
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await apiRequest("POST", `/api/bookings/${id}/cancel`, { reason });
      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      onClose();
      setCancellationReason("");
      toast({
        title: "Booking cancelled",
        description: "The booking has been cancelled and the customer has been notified.",
      });
    },
    onError: () => {
      toast({
        title: "Cancellation failed",
        description: "Failed to cancel the booking. Please try again.",
        variant: "destructive"
      });
    }
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/bookings/${id}`);
      if (!response.ok) {
        // If the booking is already deleted (404), treat it as success
        if (response.status === 404) {
          return { success: true, message: "Booking was already deleted" };
        }
        throw new Error('Failed to delete booking');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
      onClose();
      toast({
        title: "Booking deleted",
        description: data?.message || "The booking has been permanently deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Deletion failed",
        description: error instanceof Error ? error.message : "Failed to delete the booking. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCloseDialog = () => {
    // When closing the dialog, preserve other URL parameters but remove bookingId
    const url = new URL(window.location.href);
    
    // Get the current tab parameter if present
    const currentTab = url.searchParams.get('tab');
    
    // Clear all existing parameters
    url.search = '';
    
    // Restore the tab parameter if it existed
    if (currentTab) {
      url.searchParams.set('tab', currentTab);
    }
    
    window.history.pushState({}, '', url.toString());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCloseDialog()} modal={true} defaultOpen={true}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
          <DialogDescription>Update customer booking information.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Info Section */}
          <div>
            <h3 className="text-lg font-medium mb-2">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input 
                  className="mt-1"
                  value={selectedBooking.name || "Customer Name"}
                  onChange={(e) => setSelectedBooking({...selectedBooking, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input 
                  className="mt-1"
                  type="email"
                  value={selectedBooking.email || "customer@example.com"}
                  onChange={(e) => setSelectedBooking({...selectedBooking, email: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input 
                  className="mt-1"
                  value={selectedBooking.phone || "555-123-4567"}
                  onChange={(e) => setSelectedBooking({...selectedBooking, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select 
                  value={selectedBooking.status || 'active'}
                  onValueChange={(value: "active" | "cancelled" | "completed") => 
                    setSelectedBooking({...selectedBooking, status: value})}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Appointment Info Section */}
          <div>
            <h3 className="text-lg font-medium mb-2">Appointment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="mt-1 justify-start text-left font-normal w-full"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(new Date(selectedBooking.preferredDate), "MMM d, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={new Date(selectedBooking.preferredDate)}
                      onSelect={(date) => date && setSelectedBooking({...selectedBooking, preferredDate: format(date, 'yyyy-MM-dd')})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium">Time</label>
                <Select 
                  value={selectedBooking.appointmentTime} 
                  onValueChange={(value) => setSelectedBooking({...selectedBooking, appointmentTime: value})}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8:00 AM">8:00 AM</SelectItem>
                    <SelectItem value="8:30 AM">8:30 AM</SelectItem>
                    <SelectItem value="9:00 AM">9:00 AM</SelectItem>
                    <SelectItem value="9:30 AM">9:30 AM</SelectItem>
                    <SelectItem value="10:00 AM">10:00 AM</SelectItem>
                    <SelectItem value="10:30 AM">10:30 AM</SelectItem>
                    <SelectItem value="11:00 AM">11:00 AM</SelectItem>
                    <SelectItem value="11:30 AM">11:30 AM</SelectItem>
                    <SelectItem value="12:00 PM">12:00 PM</SelectItem>
                    <SelectItem value="12:30 PM">12:30 PM</SelectItem>
                    <SelectItem value="1:00 PM">1:00 PM</SelectItem>
                    <SelectItem value="1:30 PM">1:30 PM</SelectItem>
                    <SelectItem value="2:00 PM">2:00 PM</SelectItem>
                    <SelectItem value="2:30 PM">2:30 PM</SelectItem>
                    <SelectItem value="3:00 PM">3:00 PM</SelectItem>
                    <SelectItem value="3:30 PM">3:30 PM</SelectItem>
                    <SelectItem value="4:00 PM">4:00 PM</SelectItem>
                    <SelectItem value="4:30 PM">4:30 PM</SelectItem>
                    <SelectItem value="5:00 PM">5:00 PM</SelectItem>
                    <SelectItem value="5:30 PM">5:30 PM</SelectItem>
                    <SelectItem value="6:00 PM">6:00 PM</SelectItem>
                    <SelectItem value="6:30 PM">6:30 PM</SelectItem>
                    <SelectItem value="7:00 PM">7:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Service Type</label>
                <Select 
                  value={selectedBooking.serviceType}
                  onValueChange={(value) => setSelectedBooking({...selectedBooking, serviceType: value})}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TV Mounting">TV Mounting</SelectItem>
                    <SelectItem value="Smart Home Installation">Smart Home Installation</SelectItem>
                    <SelectItem value="Home Theater Setup">Home Theater Setup</SelectItem>
                    <SelectItem value="Consultation">Consultation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Total Price</label>
                <Input 
                  className="mt-1"
                  type="number"
                  value={selectedBooking.pricingTotal?.toString() || ""}
                  onChange={(e) => setSelectedBooking({...selectedBooking, pricingTotal: parseFloat(e.target.value)})}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div>
            <h3 className="text-lg font-medium mb-2">Address Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Street Address</label>
                <Input 
                  className="mt-1"
                  value={selectedBooking.streetAddress || "123 Main Street"}
                  onChange={(e) => setSelectedBooking({...selectedBooking, streetAddress: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">City</label>
                <Input 
                  className="mt-1"
                  value={selectedBooking.city || "Atlanta"}
                  onChange={(e) => setSelectedBooking({...selectedBooking, city: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">State</label>
                <Input 
                  className="mt-1"
                  value={selectedBooking.state || "GA"}
                  onChange={(e) => setSelectedBooking({...selectedBooking, state: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">ZIP Code</label>
                <Input 
                  className="mt-1"
                  value={selectedBooking.zipCode || "30301"}
                  onChange={(e) => setSelectedBooking({...selectedBooking, zipCode: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Installation Details Section */}
          <div>
            <h3 className="text-lg font-medium mb-2">Installation Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">TV Size</label>
                <Input 
                  className="mt-1"
                  value={selectedBooking.tvSize || "55-inch"}
                  onChange={(e) => setSelectedBooking({...selectedBooking, tvSize: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Mount Type</label>
                <Input 
                  className="mt-1"
                  value={selectedBooking.mountType || "Fixed"}
                  onChange={(e) => setSelectedBooking({...selectedBooking, mountType: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Wall Material</label>
                <Input 
                  className="mt-1"
                  value={selectedBooking.wallMaterial || "Drywall"}
                  onChange={(e) => setSelectedBooking({...selectedBooking, wallMaterial: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div>
            <label className="text-sm font-medium">Special Instructions</label>
            <Textarea 
              className="mt-1"
              value={selectedBooking.specialInstructions || "Additional notes"}
              onChange={(e) => setSelectedBooking({...selectedBooking, specialInstructions: e.target.value})}
              placeholder="Additional notes - Use this area for any customer requests or special installation requirements."
            />
          </div>

          {/* Email notification option */}
          <div className="flex items-center space-x-2">
            <Switch 
              id="send-email" 
              defaultChecked={true}
              onCheckedChange={(checked) => {
                setSelectedBooking({
                  ...selectedBooking, 
                  sendUpdateEmail: checked
                });
              }}
            />
            <label htmlFor="send-email" className="text-sm font-medium cursor-pointer">
              Send email notification to customer
            </label>
          </div>

          {/* Meta info */}
          <div>
            <p className="text-sm text-muted-foreground">
              Booking created: {selectedBooking.createdAt 
                ? `${formatDistanceToNow(new Date(selectedBooking.createdAt))} ago`
                : "Unknown"}
            </p>
          </div>

          {/* Update Button */}
          <Button 
            className="w-full" 
            onClick={() => {
              if (selectedBooking.id) {
                // Make a copy of the booking to prepare for submission
                const bookingToUpdate = { ...selectedBooking };
                
                // Handle pricingBreakdown properly for the API
                if (bookingToUpdate.pricingBreakdown && typeof bookingToUpdate.pricingBreakdown !== 'string') {
                  try {
                    bookingToUpdate.pricingBreakdown = JSON.stringify(bookingToUpdate.pricingBreakdown);
                  } catch (e) {
                    // If it can't be stringified, set to empty object string
                    bookingToUpdate.pricingBreakdown = "{}";
                  }
                }
                
                // Handle pricingTotal as a number
                if (bookingToUpdate.pricingTotal) {
                  bookingToUpdate.pricingTotal = parseFloat(bookingToUpdate.pricingTotal.toString());
                }
                
                updateBookingMutation.mutate({
                  id: Number(selectedBooking.id), 
                  data: bookingToUpdate
                });
              }
            }}
            disabled={updateBookingMutation.isPending}
          >
            {updateBookingMutation.isPending ? "Updating..." : "Update Booking"}
          </Button>

          {/* Cancel booking section */}
          {selectedBooking.status === "active" && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-2">Cancel Booking</h3>
              <div className="space-y-4">
                <Textarea
                  placeholder="Enter the reason for cancellation here - this will be included in the email to the customer"
                  value={cancellationReason || "Customer requested cancellation"}
                  onChange={(e) => setCancellationReason(e.target.value)}
                />
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedBooking.id) {
                      cancelBookingMutation.mutate({
                        id: Number(selectedBooking.id),
                        reason: cancellationReason,
                      });
                    }
                  }}
                  disabled={cancelBookingMutation.isPending}
                  className="w-full"
                >
                  {cancelBookingMutation.isPending
                    ? "Cancelling..."
                    : "Cancel Booking"}
                </Button>
              </div>
            </div>
          )}

          {/* Delete booking section */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-2">Delete Booking</h3>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">Delete Booking</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Booking</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently delete this booking. Are you sure?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      if (selectedBooking.id) {
                        deleteBookingMutation.mutate(Number(selectedBooking.id));
                      }
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button 
            variant="outline" 
            onClick={handleCloseDialog}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}