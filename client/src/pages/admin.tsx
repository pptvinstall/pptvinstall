import { useEffect, useState, useMemo } from "react";
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { formatPrice } from "@/lib/pricing";
import { Download, Search, Filter, SlidersHorizontal } from "lucide-react";
import { TimeBlocking } from "@/components/admin/time-blocking";
import { BookingCalendar } from "@/components/admin/booking-calendar";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activeTab, setActiveTab] = useState("bookings");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const { toast } = useToast();

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bookings");
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      const data = await response.json();
      return data.bookings || [];
    },
    enabled: isAuthenticated
  });

  // Filtered bookings with search and status filter
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const matchesSearch = searchTerm === "" ||
        booking.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.phone.includes(searchTerm) ||
        booking.streetAddress.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || booking.status === statusFilter;

      const matchesDate = !dateFilter ||
        format(new Date(booking.preferredDate), "yyyy-MM-dd") === format(dateFilter, "yyyy-MM-dd");

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [bookings, searchTerm, statusFilter, dateFilter]);

  // Export functionality
  const exportBookings = () => {
    const csvContent = [
      ["Date", "Time", "Name", "Email", "Phone", "Address", "Service", "Status", "Total"],
      ...filteredBookings.map(booking => [
        format(new Date(booking.preferredDate), "MM/dd/yyyy"),
        booking.appointmentTime,
        booking.name,
        booking.email,
        booking.phone,
        `${booking.streetAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}`,
        booking.serviceType,
        booking.status,
        booking.pricingTotal ? formatPrice(parseFloat(booking.pricingTotal)) : "N/A"
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest("POST", "/api/admin/login", { password });
      if (!response.ok) {
        throw new Error('Invalid password');
      }
      return response.json();
    },
    onSuccess: () => {
      // Store the password in localStorage for subsequent API calls
      localStorage.setItem('adminPassword', password);
      setIsAuthenticated(true);
      toast({
        title: "Login successful",
        description: "Welcome to the admin dashboard",
      });
    },
    onError: () => {
      // Clear any existing stored password on login failure
      localStorage.removeItem('adminPassword');
      toast({
        title: "Login failed",
        description: "Invalid password. Please try again.",
        variant: "destructive"
      });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/admin/reset-password", { currentPassword, newPassword });
      if (!response.ok) {
        throw new Error('Failed to reset password');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset successful",
        description: "Your admin password has been updated.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: () => {
      toast({
        title: "Password reset failed",
        description: "Failed to reset password. Please check your current password.",
        variant: "destructive"
      });
    }
  });

  const clearBookingsMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest("POST", "/api/admin/clear-bookings", { password });
      if (!response.ok) {
        throw new Error('Failed to clear bookings');
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Bookings cleared",
        description: "All bookings have been successfully cleared.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to clear bookings",
        description: "Could not clear bookings. Please verify your password.",
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation password must match.",
        variant: "destructive"
      });
      return;
    }

    resetPasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleClearBookings = async () => {
    clearBookingsMutation.mutate(password);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminPassword');
    setIsAuthenticated(false);
    queryClient.clear(); // Clear any cached data
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
  };


  useEffect(() => {
    const storedPassword = localStorage.getItem('adminPassword');
    if (storedPassword) {
      // Verify the stored password
      loginMutation.mutate(storedPassword);
    }
  }, []);

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
      <Button onClick={handleLogout}>Logout</Button> {/* Added Logout Button */}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="bookings">List View</TabsTrigger>
          <TabsTrigger value="scheduling">Time Blocking</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <BookingCalendar />
        </TabsContent>
        <TabsContent value="bookings">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Bookings Management</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportBookings}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">Clear All</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear All Bookings</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will permanently delete all bookings. Are you sure?
                          <div className="mt-4">
                            <Input
                              type="password"
                              placeholder="Confirm with admin password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="mt-2"
                            />
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={handleClearBookings}
                        >
                          Clear All Bookings
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search bookings..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    className="rounded-md border"
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-8">Loading bookings...</div>
              ) : filteredBookings.length === 0 ? (
                <div className="text-center py-8">No bookings found.</div>
              ) : (
                <div className="overflow-x-auto">
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
                        <TableHead>Price</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>
                            {booking.preferredDate ? format(new Date(booking.preferredDate), "MMM d, yyyy") : "N/A"}
                          </TableCell>
                          <TableCell>{booking.appointmentTime}</TableCell>
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
                            {booking.pricingTotal ? formatPrice(parseFloat(booking.pricingTotal)) : "N/A"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
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
                                      Are you sure you want to cancel this booking?
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
                                          id: parseInt(booking.id as string),
                                          reason: cancellationReason
                                        });
                                      }}
                                    >
                                      Yes, cancel booking
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduling">
          <TimeBlocking password={password} />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Admin Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Change Admin Password</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Current Password</label>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">New Password</label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Confirm New Password</label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={resetPasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {resetPasswordMutation.isPending ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                  <label className="text-sm font-medium">Address</label>
                  <Input
                    value={selectedBooking.streetAddress}
                    onChange={(e) =>
                      setSelectedBooking({
                        ...selectedBooking,
                        streetAddress: e.target.value,
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
                  <label className="text-sm font-medium">Appointment Time</label>
                  <Input
                    value={selectedBooking.appointmentTime}
                    onChange={(e) =>
                      setSelectedBooking({
                        ...selectedBooking,
                        appointmentTime: e.target.value,
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
                    id: parseInt(selectedBooking.id as string),
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