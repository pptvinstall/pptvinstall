import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Booking } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const { toast } = useToast();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bookings");
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      return response.json() as Promise<Booking[]>;
    },
    enabled: isAuthenticated
  });

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest("POST", "/api/admin/login", { password });
      if (!response.ok) {
        throw new Error('Invalid password');
      }
      return response.json();
    },
    onSuccess: () => {
      setIsAuthenticated(true);
      toast({
        title: "Login successful",
        description: "Welcome to the admin dashboard",
      });
    },
    onError: () => {
      toast({
        title: "Login failed",
        description: "Invalid password",
        variant: "destructive"
      });
    }
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Booking> }) => {
      const response = await apiRequest("PUT", `/api/bookings/${id}`, data);
      if (!response.ok) {
        throw new Error('Failed to update booking');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setSelectedBooking(null);
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
      setSelectedBooking(null);
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
        throw new Error('Failed to delete booking');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking deleted",
        description: "The booking has been permanently deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Deletion failed",
        description: "Failed to delete the booking. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(password);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button 
                type="submit" 
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading bookings...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      {format(new Date(booking.preferredDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{format(new Date(booking.preferredDate), "h:mm a")}</TableCell>
                    <TableCell>{booking.name}</TableCell>
                    <TableCell>{booking.serviceType}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{booking.phone}</p>
                        <p className="text-sm text-gray-500">{booking.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{booking.streetAddress}</p>
                        {booking.addressLine2 && (
                          <p>{booking.addressLine2}</p>
                        )}
                        <p className="text-sm text-gray-500">
                          {booking.city}, {booking.state} {booking.zipCode}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        booking.status === 'cancelled' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {booking.status || 'active'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBooking(booking)}
                        >
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-red-50 text-red-600 hover:bg-red-100"
                            >
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel this booking? This will send a cancellation email to the customer.
                                <div className="mt-4">
                                  <Textarea
                                    placeholder="Enter cancellation reason (optional)"
                                    value={cancellationReason}
                                    onChange={(e) => setCancellationReason(e.target.value)}
                                    className="mt-2"
                                  />
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>No, keep booking</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => {
                                  cancelBookingMutation.mutate({
                                    id: booking.id,
                                    reason: cancellationReason
                                  });
                                }}
                              >
                                Yes, cancel booking
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-red-100 text-red-800 hover:bg-red-200"
                            >
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Booking</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this booking? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>No, keep booking</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => deleteBookingMutation.mutate(booking.id)}
                              >
                                Yes, delete booking
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Drawer open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Booking</DrawerTitle>
            <DrawerDescription>
              Update the booking details below
            </DrawerDescription>
          </DrawerHeader>
          {selectedBooking && (
            <div className="px-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Customer Name</label>
                  <Input
                    value={selectedBooking.name}
                    onChange={(e) =>
                      setSelectedBooking({
                        ...selectedBooking,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={selectedBooking.email}
                    onChange={(e) =>
                      setSelectedBooking({
                        ...selectedBooking,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={selectedBooking.phone}
                    onChange={(e) =>
                      setSelectedBooking({
                        ...selectedBooking,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Service Type</label>
                  <Input
                    value={selectedBooking.serviceType}
                    onChange={(e) =>
                      setSelectedBooking({
                        ...selectedBooking,
                        serviceType: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Preferred Date</label>
                  <Input
                    type="datetime-local"
                    value={format(new Date(selectedBooking.preferredDate), "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) =>
                      setSelectedBooking({
                        ...selectedBooking,
                        preferredDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DrawerFooter>
            <Button
              disabled={updateBookingMutation.isPending}
              onClick={() => {
                if (selectedBooking) {
                  updateBookingMutation.mutate({
                    id: selectedBooking.id,
                    data: selectedBooking,
                  });
                }
              }}
            >
              {updateBookingMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}