import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfDay, endOfDay, addDays, isSameDay, differenceInDays, formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  ArrowUpRight,
  Calendar as CalendarIcon,
  Check,
  Clock,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Mail,
  Phone,
  Search,
  Settings,
  Tag,
  User,
  X,
} from "lucide-react";
import { TimeBlocking } from "@/components/admin/time-blocking";
import { BookingCalendar } from "@/components/admin/booking-calendar";
import { BusinessHours } from "@/components/admin/business-hours";
import { AdminLayout } from "@/components/admin/layout";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Parse the tab from URL if present
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    } else {
      setActiveTab('dashboard');
    }
  }, [location]);

  // Update URL when tab changes (but don't create a circular dependency)
  useEffect(() => {
    // Only update the URL if the tab change wasn't triggered by the URL itself
    const searchParams = new URLSearchParams(window.location.search);
    const urlTab = searchParams.get('tab') || 'dashboard';
    
    if (activeTab !== urlTab) {
      if (activeTab !== 'dashboard') {
        setLocation(`/admin?tab=${activeTab}`, { replace: true });
      } else {
        setLocation('/admin', { replace: true });
      }
    }
  }, [activeTab, setLocation, location]);

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
    return bookings.filter((booking: any) => {
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

  // Dashboard statistics
  const dashboardStats = useMemo(() => {
    if (!bookings.length) return {
      totalBookings: 0,
      activeBookings: 0,
      cancelledBookings: 0,
      upcomingBookings: 0,
      todayBookings: 0,
      weekBookings: 0,
      recentBookings: []
    };

    const now = new Date();
    const today = startOfDay(now);
    const weekEnd = endOfDay(addDays(today, 7));

    const activeBookings = bookings.filter((b: any) => b.status === 'active');
    const cancelledBookings = bookings.filter((b: any) => b.status === 'cancelled');
    
    const upcomingBookings = activeBookings.filter((b: any) => {
      const bookingDate = new Date(b.preferredDate);
      return bookingDate >= today;
    });
    
    const todayBookings = upcomingBookings.filter((b: any) => {
      const bookingDate = new Date(b.preferredDate);
      return isSameDay(bookingDate, today);
    });
    
    const weekBookings = upcomingBookings.filter((b: any) => {
      const bookingDate = new Date(b.preferredDate);
      return bookingDate <= weekEnd;
    });

    // Sort upcoming bookings by date
    const sortedUpcoming = [...upcomingBookings].sort((a: any, b: any) => {
      return new Date(a.preferredDate).getTime() - new Date(b.preferredDate).getTime();
    });

    return {
      totalBookings: bookings.length,
      activeBookings: activeBookings.length,
      cancelledBookings: cancelledBookings.length,
      upcomingBookings: upcomingBookings.length,
      todayBookings: todayBookings.length,
      weekBookings: weekBookings.length,
      recentBookings: sortedUpcoming.slice(0, 5)
    };
  }, [bookings]);

  // Export functionality
  const exportBookings = () => {
    const csvContent = [
      ["Date", "Time", "Name", "Email", "Phone", "Address", "Service", "Status", "Total"],
      ...filteredBookings.map((booking: any) => [
        format(new Date(booking.preferredDate), "MM/dd/yyyy"),
        booking.appointmentTime,
        booking.name,
        booking.email,
        booking.phone,
        `${booking.streetAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}`,
        booking.serviceType,
        booking.status,
        booking.pricingTotal ? formatPrice(typeof booking.pricingTotal === 'string' ? parseFloat(booking.pricingTotal) : booking.pricingTotal) : "N/A"
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
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Card className="w-[400px] shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Admin Login</CardTitle>
            <CardDescription className="text-center">
              Enter your administrator password to access the dashboard
            </CardDescription>
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
          <CardFooter className="flex justify-center text-sm text-muted-foreground">
            Picture Perfect TV Install - Admin Portal
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <AdminLayout onLogout={handleLogout}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 hidden">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="time-blocking">Availability</TabsTrigger>
          <TabsTrigger value="business-hours">Business Hours</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>

        {/* Dashboard Overview */}
        <TabsContent value="dashboard">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">Welcome to your admin dashboard</p>
              </div>
              <div className="flex space-x-2 mt-4 md:mt-0">
                <Button variant="outline" size="sm" onClick={() => setActiveTab("bookings")}>
                  View All Bookings
                </Button>
                <Button size="sm" onClick={() => setActiveTab("time-blocking")}>
                  Manage Availability
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dashboardStats.totalBookings}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Upcoming Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dashboardStats.upcomingBookings}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Today's Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dashboardStats.todayBookings}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dashboardStats.weekBookings}</div>
                </CardContent>
              </Card>
            </div>

            {/* Calendar and Recent Bookings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Upcoming Schedule</CardTitle>
                  <CardDescription>
                    Click on a date to view or manage bookings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={(date) => {
                      setDateFilter(date);
                      setActiveTab("bookings");
                    }}
                    className="rounded-md border w-full"
                    modifiers={{
                      booked: (date) => {
                        const dateStr = format(date, "yyyy-MM-dd");
                        return bookings.some((booking: any) => 
                          booking.status === 'active' && 
                          format(new Date(booking.preferredDate), "yyyy-MM-dd") === dateStr
                        );
                      }
                    }}
                    modifiersStyles={{
                      booked: { backgroundColor: "var(--primary-50)", color: "var(--primary-900)" }
                    }}
                  />
                </CardContent>
                <CardFooter>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 rounded-sm bg-primary/20"></div>
                    <span>Dates with bookings</span>
                  </div>
                </CardFooter>
              </Card>

              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Recent Bookings</CardTitle>
                  <CardDescription>
                    Your most recent booking requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardStats.recentBookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No upcoming bookings
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dashboardStats.recentBookings.map((booking: any) => {
                        const bookingDate = new Date(booking.preferredDate);
                        const daysUntil = differenceInDays(bookingDate, new Date());
                        
                        return (
                          <div 
                            key={booking.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div>
                              <div className="font-medium">
                                {booking.name} 
                                {daysUntil === 0 && (
                                  <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 hover:bg-amber-100">
                                    Today
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center">
                                <CalendarIcon className="h-3 w-3 mr-1" /> 
                                {format(bookingDate, "MMM d, yyyy")} at {booking.appointmentTime}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center">
                                <Tag className="h-3 w-3 mr-1" /> 
                                {booking.serviceType}
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setSelectedBooking(booking);
                                // Force drawer to show
                                document.body.style.pointerEvents = "none";
                                setTimeout(() => {
                                  document.body.style.pointerEvents = "";
                                }, 0);
                              }}
                            >
                              View
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setActiveTab("bookings")}
                  >
                    View All Bookings
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks you may want to perform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center justify-center"
                    onClick={() => setActiveTab("business-hours")}
                  >
                    <Clock className="h-5 w-5 mb-2" />
                    <span className="font-medium">Update Business Hours</span>
                    <span className="text-xs text-muted-foreground mt-1">Set your working schedule</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center justify-center"
                    onClick={() => setActiveTab("time-blocking")}
                  >
                    <CalendarIcon className="h-5 w-5 mb-2" />
                    <span className="font-medium">Block Time Slots</span>
                    <span className="text-xs text-muted-foreground mt-1">Manage your availability</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center justify-center"
                    onClick={exportBookings}
                  >
                    <Download className="h-5 w-5 mb-2" />
                    <span className="font-medium">Export Data</span>
                    <span className="text-xs text-muted-foreground mt-1">Download booking records</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bookings Management */}
        <TabsContent value="bookings">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-3xl font-bold">Bookings</h1>
                <p className="text-muted-foreground">Manage all your customer bookings</p>
              </div>
              <div className="flex space-x-2 mt-4 md:mt-0">
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
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="mb-6 flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
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

                    {dateFilter && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setDateFilter(undefined)}
                        className="h-10"
                      >
                        {format(dateFilter, "MMM d, yyyy")}
                        <X className="ml-2 h-4 w-4" />
                      </Button>
                    )}

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-10 w-10">
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <Calendar
                            mode="single"
                            selected={dateFilter}
                            onSelect={setDateFilter}
                            initialFocus
                          />
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-center py-8">Loading bookings...</div>
                ) : filteredBookings.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-1">No bookings found</h3>
                    <p className="text-muted-foreground">
                      {dateFilter 
                        ? `No bookings for ${format(dateFilter, "MMMM d, yyyy")}` 
                        : statusFilter !== 'all'
                          ? `No ${statusFilter} bookings found`
                          : searchTerm
                            ? `No results for "${searchTerm}"`
                            : "You don't have any bookings yet"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBookings.map((booking: any) => (
                          <TableRow key={booking.id}>
                            <TableCell>
                              <div className="font-medium">
                                {format(new Date(booking.preferredDate), "MMM d, yyyy")}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {booking.appointmentTime}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{booking.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {booking.email}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {booking.phone}
                              </div>
                            </TableCell>
                            <TableCell>{booking.serviceType}</TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                booking.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : booking.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}>
                                {booking.status}
                              </div>
                            </TableCell>
                            <TableCell>
                              {booking.pricingTotal
                                ? formatPrice(typeof booking.pricingTotal === 'string' 
                                    ? parseFloat(booking.pricingTotal) 
                                    : booking.pricingTotal)
                                : "N/A"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedBooking(booking)}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Calendar View</h1>
              <p className="text-muted-foreground">Visual calendar of all your bookings</p>
            </div>
            <BookingCalendar />
            <Card>
              <CardHeader>
                <CardTitle>Calendar Help</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center">
                      <HelpCircle className="h-5 w-5 mr-2 text-primary" />
                      <span className="font-medium">How to use the calendar view</span>
                    </div>
                    <p className="text-muted-foreground ml-7">
                      The calendar provides a visual overview of all your bookings. Select a date to see bookings for that day. Dates with bookings are highlighted.
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center">
                      <Info className="h-5 w-5 mr-2 text-primary" />
                      <span className="font-medium">Managing bookings from the calendar</span>
                    </div>
                    <p className="text-muted-foreground ml-7">
                      You can approve, decline, or edit bookings directly from the calendar view. Click on a booking card to see options.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="time-blocking">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Availability Management</h1>
              <p className="text-muted-foreground">Block times when you're unavailable for bookings</p>
            </div>
            <TimeBlocking />
            <Card>
              <CardHeader>
                <CardTitle>Availability Help</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center">
                      <HelpCircle className="h-5 w-5 mr-2 text-primary" />
                      <span className="font-medium">Blocking Individual Time Slots</span>
                    </div>
                    <p className="text-muted-foreground ml-7">
                      Select a date and then click on the time slots you want to block. After selecting all desired time slots, click the "Block Selected Times" button. Blocked time slots will not be available for customers to book.
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-primary" />
                      <span className="font-medium">Setting Recurring Blocks</span>
                    </div>
                    <p className="text-muted-foreground ml-7">
                      Toggle "Recurring Schedule" to block the same time slots for a specific day of the week. Great for setting regular unavailable periods.
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center">
                      <CalendarIcon className="h-5 w-5 mr-2 text-primary" />
                      <span className="font-medium">Blocking Full Days</span>
                    </div>
                    <p className="text-muted-foreground ml-7">
                      Switch to the "Block Full Day" tab to mark entire days as unavailable. Useful for holidays, vacations, or days when you're fully booked with other commitments.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="business-hours">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Business Hours</h1>
              <p className="text-muted-foreground">Set your regular working hours</p>
            </div>
            <BusinessHours />
            <Card>
              <CardHeader>
                <CardTitle>Business Hours Help</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center">
                      <HelpCircle className="h-5 w-5 mr-2 text-primary" />
                      <span className="font-medium">Setting Business Hours</span>
                    </div>
                    <p className="text-muted-foreground ml-7">
                      Choose a day of the week, then set your start and end times. These hours determine when customers can book appointments on each day. Toggle "Available for bookings" on/off to enable or disable bookings for the entire day.
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center">
                      <Info className="h-5 w-5 mr-2 text-primary" />
                      <span className="font-medium">Default Business Hours</span>
                    </div>
                    <p className="text-muted-foreground ml-7">
                      The system defaults to Monday-Friday 6:30-10:30 PM, and Saturday-Sunday 11:00 AM-7:00 PM. You can customize these hours for your specific needs.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your admin password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Current Password
                    </label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      New Password
                    </label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Confirm New Password
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending
                      ? "Resetting..."
                      : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>Export and manage your business data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Export Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download your booking data for record keeping or analysis
                  </p>
                  <Button variant="outline" onClick={exportBookings}>
                    <Download className="h-4 w-4 mr-2" />
                    Export All Bookings (CSV)
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium mb-2 text-destructive">
                    Danger Zone
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    These actions cannot be undone. Please be certain.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Clear All Bookings</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear All Bookings</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will permanently delete all bookings. Are you sure you want to proceed?
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
                          I understand, clear all bookings
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="help">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Help & Documentation</h1>
              <p className="text-muted-foreground">Learn how to use the admin dashboard</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Admin Dashboard Guide</CardTitle>
                <CardDescription>
                  Overview of the main features and how to use them
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Dashboard Overview</h3>
                  <p>
                    The dashboard shows an overview of your bookings, including statistics, upcoming appointments, and quick access to common tasks.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-2 text-primary" />
                        Booking Statistics
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        View total, upcoming, today's, and weekly booking counts at a glance.
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-primary" />
                        Upcoming Schedule
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Calendar view showing which dates have bookings. Click any date to see details.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Managing Bookings</h3>
                  <p>
                    The bookings section allows you to view, filter, and manage all your customer appointments.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium flex items-center">
                        <Search className="h-4 w-4 mr-2 text-primary" />
                        Finding Bookings
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Use the search bar to find bookings by customer name, email, or phone number. Use filters to narrow results by date or status.
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium flex items-center">
                        <ArrowUpRight className="h-4 w-4 mr-2 text-primary" />
                        Viewing Details
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click "View" on any booking to see full details, including customer information, service type, and appointment time.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Availability Management</h3>
                  <p>
                    Control when customers can book appointments with you.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-primary" />
                        Business Hours
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Set your regular working hours for each day of the week. These define when customers can book appointments.
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-2 text-primary" />
                        Time Blocking
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Block specific time slots or entire days when you're unavailable, even during your regular business hours.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Tips & Best Practices</h3>
                  <ul className="space-y-2 ml-6 list-disc">
                    <li>Regularly check your dashboard for new booking requests</li>
                    <li>Block time slots as soon as you know you'll be unavailable</li>
                    <li>Export your booking data regularly for backup purposes</li>
                    <li>Use the calendar view to spot busy periods and plan accordingly</li>
                    <li>Update your business hours if your availability changes seasonally</li>
                  </ul>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Need Help?</h3>
                  <p>
                    If you need additional assistance or have questions about using the admin dashboard, please contact your website administrator.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-primary" />
                        Email Support
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Email us at <a href="mailto:support@pictureperfecttvinstall.com" className="text-primary">support@pictureperfecttvinstall.com</a>
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-primary" />
                        Phone Support
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Call us at (555) 123-4567 during business hours
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gallery">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Gallery Management</h1>
              <p className="text-muted-foreground">Coming soon - Manage your installation photos</p>
            </div>
            <Card className="p-8 text-center">
              <div className="mb-4">
                <div className="bg-primary/10 h-16 w-16 rounded-full flex items-center justify-center mx-auto">
                  <ImageIcon className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Gallery Management Coming Soon</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                This feature is currently under development. Soon you'll be able to upload and manage your installation photos directly from the admin panel.
              </p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Site Content</h1>
              <p className="text-muted-foreground">Coming soon - Manage your website content</p>
            </div>
            <Card className="p-8 text-center">
              <div className="mb-4">
                <div className="bg-primary/10 h-16 w-16 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Content Management Coming Soon</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                This feature is currently under development. Soon you'll be able to edit website text, pricing, and other content directly from the admin panel.
              </p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Customer Data</h1>
              <p className="text-muted-foreground">Coming soon - View and manage customer information</p>
            </div>
            <Card className="p-8 text-center">
              <div className="mb-4">
                <div className="bg-primary/10 h-16 w-16 rounded-full flex items-center justify-center mx-auto">
                  <User className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Customer Management Coming Soon</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                This feature is currently under development. Soon you'll be able to view customer histories, contact information, and booking patterns.
              </p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Booking Details Drawer */}
      {selectedBooking && (
        <Drawer open={true} onOpenChange={(open) => !open && setSelectedBooking(null)}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Booking Details</DrawerTitle>
              <DrawerDescription>Viewing booking information.</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 py-2">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Customer</h3>
                  <p className="text-lg font-medium">{selectedBooking.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Date & Time</h3>
                  <p className="text-lg font-medium">
                    {format(new Date(selectedBooking.preferredDate), "MMM d, yyyy")} at {selectedBooking.appointmentTime}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                  <p>{selectedBooking.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
                  <p>{selectedBooking.phone}</p>
                </div>
                <div className="col-span-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
                  <p>
                    {selectedBooking.streetAddress}, {selectedBooking.city}, {selectedBooking.state} {selectedBooking.zipCode}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Service Type</h3>
                  <p>{selectedBooking.serviceType}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedBooking.status === "active"
                      ? "bg-green-100 text-green-800"
                      : selectedBooking.status === "cancelled"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {selectedBooking.status}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">TV Size</h3>
                  <p>{selectedBooking.tvSize || "N/A"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Mount Type</h3>
                  <p>{selectedBooking.mountType || "N/A"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Wall Material</h3>
                  <p>{selectedBooking.wallMaterial || "N/A"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Total</h3>
                  <p className="text-lg font-medium">
                    {selectedBooking.pricingTotal
                      ? formatPrice(typeof selectedBooking.pricingTotal === 'string' 
                          ? parseFloat(selectedBooking.pricingTotal) 
                          : selectedBooking.pricingTotal)
                      : "N/A"}
                  </p>
                </div>
                {selectedBooking.specialInstructions && (
                  <div className="col-span-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Special Instructions</h3>
                    <p>{selectedBooking.specialInstructions}</p>
                  </div>
                )}

                <div className="col-span-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Booking Created</h3>
                  <p>
                    {selectedBooking.createdAt 
                      ? `${formatDistanceToNow(new Date(selectedBooking.createdAt))} ago`
                      : "Unknown"}
                  </p>
                </div>
              </div>

              {selectedBooking.status === "active" && (
                <div className="border-t pt-4 mb-4">
                  <h3 className="text-sm font-medium mb-2">Cancel Booking</h3>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Reason for cancellation"
                      value={cancellationReason}
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

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-2">Delete Booking</h3>
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
                            setSelectedBooking(null);
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
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </AdminLayout>
  );
}