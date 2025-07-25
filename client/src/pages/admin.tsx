import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfDay, endOfDay, addDays, isSameDay, differenceInDays, formatDistanceToNow } from "date-fns";
import { useLocation, Link } from "wouter";
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

// Extended booking interface to include email notification flag
interface ExtendedBooking extends Booking {
  sendUpdateEmail?: boolean;
}
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowUpRight,
  BarChart3,
  Calendar as CalendarIcon,
  Check,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Mail,
  Phone,
  Search,
  Settings,
  Tag,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { TimeBlocking } from "@/components/admin/time-blocking";
import { BookingCalendar } from "@/components/admin/booking-calendar";
import { BusinessHours } from "@/components/admin/business-hours";
import { AdminLayout } from "@/components/admin/layout";
import { BookingDetailsDialog } from "@/components/admin/booking-details-dialog";
import { SystemSettings } from "@/components/admin/system-settings";
import BookingArchives from "@/components/admin/booking-archives";
import { PromotionsManager } from "@/components/admin/promotions-manager";
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
  const [selectedBooking, setSelectedBooking] = useState<ExtendedBooking | null>(null);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleTime, setRescheduleTime] = useState<string>("");
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

  // Handle tab changes - both from user clicks and URL changes
  const handleTabChange = (newTab: string) => {
    console.log(`handleTabChange called with tab: ${newTab}`);
    setActiveTab(newTab);
    
    // Create a new URL object to preserve existing parameters
    const url = new URL(window.location.href);
    
    // Update the tab parameter
    if (newTab !== 'dashboard') {
      url.searchParams.set('tab', newTab);
    } else {
      url.searchParams.delete('tab');
    }
    
    // Keep the bookingId parameter if it exists
    const bookingId = url.searchParams.get('bookingId');
    
    // Navigate to the new URL
    window.location.href = url.toString();
  };
  
  // Parse the tab from URL on initial load and when URL changes
  useEffect(() => {
    const updateTabFromUrl = () => {
      console.log("URL change detected, updating active tab");
      const searchParams = new URLSearchParams(window.location.search);
      const tab = searchParams.get('tab');
      console.log(`Tab from URL: ${tab || 'dashboard'}`);
      
      if (tab) {
        setActiveTab(tab);
      } else {
        setActiveTab('dashboard');
      }
    };

    // Initial update
    updateTabFromUrl();

    // Listen for custom tab change events
    const handleTabChange = (event: any) => {
      setActiveTab(event.detail.tab);
    };

    window.addEventListener('adminTabChange', handleTabChange);
    window.addEventListener('popstate', updateTabFromUrl);

    return () => {
      window.removeEventListener('adminTabChange', handleTabChange);
      window.removeEventListener('popstate', updateTabFromUrl);
    };
  }, []);

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

      const matchesDate = !dateFilter || (() => {
        try {
          // Parse booking date parts
          const [bookingYear, bookingMonth, bookingDay] = booking.preferredDate.split('-').map(Number);
          // Create booking date object with components to avoid timezone issues
          const bookingDate = new Date(bookingYear, bookingMonth - 1, bookingDay);
          
          // Create filter date string using components
          const filterYear = dateFilter.getFullYear();
          const filterMonth = dateFilter.getMonth() + 1;
          const filterDay = dateFilter.getDate();
          
          // Compare year, month, and day directly
          return bookingYear === filterYear && 
                 bookingMonth === filterMonth && 
                 bookingDay === filterDay;
        } catch (e) {
          console.error('Error comparing dates:', e);
          return false;
        }
      })();

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
      try {
        // Parse booking date manually to avoid timezone issues
        const [year, month, day] = b.preferredDate.split('-').map(Number);
        // Create date with components (month is 0-indexed in JS Date)
        const bookingDate = new Date(year, month - 1, day);
        return bookingDate >= today;
      } catch (e) {
        console.error("Error parsing date:", e);
        return false;
      }
    });

    const todayBookings = upcomingBookings.filter((b: any) => {
      try {
        // Parse booking date manually to avoid timezone issues
        const [year, month, day] = b.preferredDate.split('-').map(Number);
        // Create date with components (month is 0-indexed in JS Date)
        const bookingDate = new Date(year, month - 1, day);
        return isSameDay(bookingDate, today);
      } catch (e) {
        console.error("Error parsing date:", e);
        return false;
      }
    });

    const weekBookings = upcomingBookings.filter((b: any) => {
      try {
        // Parse booking date manually to avoid timezone issues
        const [year, month, day] = b.preferredDate.split('-').map(Number);
        // Create date with components (month is 0-indexed in JS Date)
        const bookingDate = new Date(year, month - 1, day);
        return bookingDate <= weekEnd;
      } catch (e) {
        console.error("Error parsing date:", e);
        return false;
      }
    });

    // Sort upcoming bookings by date
    const sortedUpcoming = [...upcomingBookings].sort((a: any, b: any) => {
      try {
        // Parse dates manually to avoid timezone issues
        const [aYear, aMonth, aDay] = a.preferredDate.split('-').map(Number);
        const [bYear, bMonth, bDay] = b.preferredDate.split('-').map(Number);
        
        // Create dates with components (month is 0-indexed in JS Date)
        const aDate = new Date(aYear, aMonth - 1, aDay);
        const bDate = new Date(bYear, bMonth - 1, bDay);
        
        return aDate.getTime() - bDate.getTime();
      } catch (e) {
        console.error("Error sorting dates:", e);
        return 0; // Keep original order if there's an error
      }
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
    mutationFn: async ({ id, data }: { id: number; data: Partial<ExtendedBooking> }) => {
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
  
  const handleReschedule = () => {
    if (!selectedBooking || !rescheduleDate || !rescheduleTime) {
      toast({
        title: "Missing information",
        description: "Please select a date and time for rescheduling.",
        variant: "destructive"
      });
      return;
    }
    
    // Format date manually to avoid timezone issues
    const year = rescheduleDate.getFullYear();
    const month = String(rescheduleDate.getMonth() + 1).padStart(2, '0');
    const day = String(rescheduleDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    updateBookingMutation.mutate({
      id: Number(selectedBooking.id),
      data: {
        preferredDate: formattedDate,
        appointmentTime: rescheduleTime,
        sendUpdateEmail: true
      }
    });
    
    setIsRescheduleDialogOpen(false);
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

  // Check for login status and load bookings if needed
  useEffect(() => {
    const storedPassword = localStorage.getItem('adminPassword');
    if (storedPassword) {
      // Verify the stored password
      loginMutation.mutate(storedPassword);
    }
  }, []);
  
  // Separate effect to handle URL parameter changes
  useEffect(() => {
    // Check for booking ID in URL parameters to restore booking details
    const loadBookingFromUrl = () => {
      if (bookings.length > 0) {
        const urlParams = new URLSearchParams(window.location.search);
        const bookingId = urlParams.get('bookingId');
        const action = urlParams.get('action');
        
        if (bookingId) {
          console.log(`Found booking ID in URL: ${bookingId}`);
          const booking = bookings.find((b: any) => String(b.id) === String(bookingId));
          if (booking) {
            console.log('Setting selected booking from URL parameter');
            setSelectedBooking({
              ...booking,
              sendUpdateEmail: true
            });
            
            // Check if we need to open the reschedule dialog
            if (action === 'reschedule') {
              // Set initial values for reschedule form
              try {
                // Parse booking date manually to avoid timezone issues
                const [year, month, day] = booking.preferredDate.split('-').map(Number);
                // Create date with components (month is 0-indexed in JS Date)
                const bookingDate = new Date(year, month - 1, day);
                setRescheduleDate(bookingDate);
                setRescheduleTime(booking.appointmentTime);
                setIsRescheduleDialogOpen(true);
              } catch (e) {
                console.error("Error parsing date for reschedule:", e);
              }
            }
          } else {
            console.log(`Booking with ID ${bookingId} not found`);
          }
        }
      }
    };
    
    loadBookingFromUrl();
    // Listen for both URL changes and when bookings are loaded
  }, [bookings.length, location]);

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
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6 hidden">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="time-blocking">Availability</TabsTrigger>
          <TabsTrigger value="business-hours">Business Hours</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
          <TabsTrigger value="archives">Archives</TabsTrigger>
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
                <Button variant="outline" size="sm" onClick={() => handleTabChange("bookings")}>
                  View All Bookings
                </Button>
                <Button size="sm" onClick={() => handleTabChange("time-blocking")}>
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
                      handleTabChange("bookings");
                    }}
                    className="rounded-md border w-full"
                    modifiers={{
                      booked: (date) => {
                        // Format date manually to avoid timezone issues
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        
                        return bookings.some((booking: any) => {
                          if (booking.status !== 'active') return false;
                          
                          try {
                            // Parse booking date manually
                            const [bookingYear, bookingMonth, bookingDay] = booking.preferredDate.split('-').map(Number);
                            
                            // Compare directly (no timezone issues)
                            return bookingYear === year && 
                                   bookingMonth === Number(month) && 
                                   bookingDay === Number(day);
                          } catch (e) {
                            console.error('Error comparing booking dates:', e);
                            return false;
                          }
                        });
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
                        // Parse date properly to avoid timezone issues
                        const [bookingYear, bookingMonth, bookingDay] = booking.preferredDate.split('-').map(Number);
                        // Create date with exact components (month is 0-indexed in JS Date)
                        const bookingDate = new Date(bookingYear, bookingMonth - 1, bookingDay);
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
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedBooking({
                                  ...booking,
                                  sendUpdateEmail: true
                                });
                                // Store booking ID in URL as a separate parameter
                                const url = new URL(window.location.href);
                                url.searchParams.set('bookingId', String(booking.id));
                                window.history.pushState({}, '', url.toString());
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
                    onClick={() => handleTabChange("bookings")}
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
                    onClick={() => handleTabChange("business-hours")}
                  >
                    <Clock className="h-5 w-5 mb-2" />
                    <span className="font-medium">Update Business Hours</span>
                    <span className="text-xs text-muted-foreground mt-1">Set your working schedule</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center justify-center"
                    onClick={() => handleTabChange("time-blocking")}
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
                                {(() => {
                                  // Parse date properly to avoid timezone issues
                                  try {
                                    const [year, month, day] = booking.preferredDate.split('-').map(Number);
                                    // Create date with exact components (month is 0-indexed in JS Date)
                                    const bookingDate = new Date(year, month - 1, day);
                                    return format(bookingDate, "MMM d, yyyy");
                                  } catch (e) {
                                    console.error("Error formatting date:", e);
                                    return booking.preferredDate; // Fallback to raw date
                                  }
                                })()}
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
                              <div className="flex justify-end space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedBooking({
                                      ...booking,
                                      sendUpdateEmail: true
                                    });
                                    // Store booking ID in URL as a separate parameter
                                    const url = new URL(window.location.href);
                                    url.searchParams.set('bookingId', String(booking.id));
                                    window.history.pushState({}, '', url.toString());
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" /> 
                                  View
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedBooking({
                                      ...booking,
                                      sendUpdateEmail: true
                                    });
                                    // Open calendar reschedule dialog
                                    const url = new URL(window.location.href);
                                    url.searchParams.set('bookingId', String(booking.id));
                                    url.searchParams.set('action', 'reschedule');
                                    window.history.pushState({}, '', url.toString());
                                  }}
                                >
                                  <CalendarIcon className="h-4 w-4 mr-1" />
                                  Reschedule
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
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
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-red-600 hover:bg-red-700"
                                        onClick={() => deleteBookingMutation.mutate(booking.id)}
                                      >
                                        Delete Booking
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
            
            {/* Booking Settings */}
            <SystemSettings />
            
            {/* Email Testing */}
            <Card>
              <CardHeader>
                <CardTitle>Email Testing</CardTitle>
                <CardDescription>Test email notifications to verify your setup</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Use these tools to test your email system and verify that notifications are working correctly.
                  </p>
                  <div className="flex space-x-4">
                    <Link href="/admin/send-test-emails">
                      <Button>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Test Emails
                      </Button>
                    </Link>
                    <Link href="/admin/email-previews">
                      <Button variant="outline">
                        <Eye className="mr-2 h-4 w-4" />
                        View Email Templates
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
              
            {/* Admin Password */}
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
                        Email us at <a href="mailto:PPTVInstall@gmail.com" className="text-primary">PPTVInstall@gmail.com</a>
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-primary" />
                        Phone Support
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Call us at 404-702-4748 during business hours
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
              <p className="text-muted-foreground">Manage your installation photos and showcase your work</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Photo Upload
                  </CardTitle>
                  <CardDescription>
                    Add new installation photos to your gallery
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium mb-2">Upload Installation Photos</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Drag and drop files here, or click to browse
                    </p>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      className="hidden" 
                      id="photo-upload"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          toast({
                            title: "Photos uploaded",
                            description: `${e.target.files.length} photo(s) ready for processing`,
                          });
                        }
                      }}
                    />
                    <label htmlFor="photo-upload">
                      <Button variant="outline" className="cursor-pointer">
                        Choose Files
                      </Button>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Gallery Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Gallery Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Total Photos</span>
                      <span className="font-medium">0</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">TV Installations</span>
                      <span className="font-medium">0</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Smart Home Setups</span>
                      <span className="font-medium">0</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Last Upload</span>
                      <span className="font-medium">Never</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gallery Grid */}
            <Card>
              <CardHeader>
                <CardTitle>Installation Gallery</CardTitle>
                <CardDescription>
                  Your work photos that customers see on the website
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-2">No photos uploaded yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload your first installation photos to get started
                  </p>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload First Photo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="promotions">
          <PromotionsManager />
        </TabsContent>

        <TabsContent value="content">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Site Content Management</h1>
              <p className="text-muted-foreground">Update website content, pricing, and service information</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Service Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Service Information
                  </CardTitle>
                  <CardDescription>
                    Update your service offerings and descriptions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Business Name</label>
                    <Input defaultValue="Picture Perfect TV Install" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tagline</label>
                    <Input defaultValue="Atlanta's Premier TV Mounting & Smart Home Installation Service" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Service Area</label>
                    <Input defaultValue="Metro Atlanta, Georgia" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Contact Phone</label>
                    <Input defaultValue="(404) 555-0123" className="mt-1" />
                  </div>
                  <Button className="w-full">
                    Update Service Info
                  </Button>
                </CardContent>
              </Card>

              {/* Pricing Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Service Pricing
                  </CardTitle>
                  <CardDescription>
                    Manage your service rates and pricing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Basic TV Mount</label>
                    <Input type="number" defaultValue="150" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Premium TV Mount</label>
                    <Input type="number" defaultValue="250" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Smart Home Setup</label>
                    <Input type="number" defaultValue="400" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Service Call Fee</label>
                    <Input type="number" defaultValue="75" className="mt-1" />
                  </div>
                  <Button className="w-full">
                    Update Pricing
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Website Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Website Content
                </CardTitle>
                <CardDescription>
                  Edit the main content sections of your website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium">About Section</label>
                  <Textarea 
                    className="mt-1" 
                    rows={4}
                    defaultValue="At Picture Perfect TV Install, we specialize in professional TV mounting and smart home installations throughout Metro Atlanta. With years of experience and a commitment to excellence, we ensure your entertainment setup is both beautiful and functional."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Service Guarantee</label>
                  <Textarea 
                    className="mt-1" 
                    rows={3}
                    defaultValue="We stand behind our work with a comprehensive warranty. All installations are guaranteed for quality and craftsmanship. Your satisfaction is our priority."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Years of Experience</label>
                    <Input type="number" defaultValue="8" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Installations Completed</label>
                    <Input type="number" defaultValue="1500" className="mt-1" />
                  </div>
                </div>
                <Button className="w-full">
                  Update Website Content
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics">
          <div className="space-y-6">
            <AnalyticsDashboard />
          </div>
        </TabsContent>
        
        <TabsContent value="archives">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Booking Archives</h1>
              <p className="text-muted-foreground">View all deleted or archived bookings</p>
            </div>
            <BookingArchives adminPassword={password} />
          </div>
        </TabsContent>

        <TabsContent value="customers">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Customer Management</h1>
              <p className="text-muted-foreground">View and manage customer information and booking history</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Customer Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Customers</span>
                      <span className="font-medium">{bookings.length > 0 ? new Set(bookings.map((b: any) => b.email)).size : 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Repeat Customers</span>
                      <span className="font-medium">
                        {bookings.length > 0 ? Object.values(
                          bookings.reduce((acc: any, booking: any) => {
                            acc[booking.email] = (acc[booking.email] || 0) + 1;
                            return acc;
                          }, {})
                        ).filter((count: any) => count > 1).length : 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">This Month</span>
                      <span className="font-medium">
                        {bookings.filter((b: any) => {
                          const bookingDate = new Date(b.preferredDate);
                          const now = new Date();
                          return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear();
                        }).length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Search */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Find Customer
                  </CardTitle>
                  <CardDescription>
                    Search by name, email, or phone number
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Search customers..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="outline">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Customer List */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Database</CardTitle>
                <CardDescription>
                  All customers extracted from booking records
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium mb-2">No customers yet</h3>
                    <p className="text-muted-foreground">
                      Customer data will appear here as bookings are created
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(
                      bookings.reduce((customers: any, booking: any) => {
                        const email = booking.email;
                        if (!customers[email]) {
                          customers[email] = {
                            name: booking.name,
                            email: booking.email,
                            phone: booking.phone,
                            address: booking.streetAddress,
                            bookings: []
                          };
                        }
                        customers[email].bookings.push(booking);
                        return customers;
                      }, {})
                    ).filter(([email, customer]: any) => 
                      searchTerm === "" ||
                      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      customer.phone.includes(searchTerm)
                    ).slice(0, 10).map(([email, customer]: any) => (
                      <div key={email} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h3 className="font-medium">{customer.name}</h3>
                            <div className="text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </div>
                              {customer.address && (
                                <div className="text-xs mt-1">
                                  📍 {customer.address}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {customer.bookings.length} booking{customer.bookings.length !== 1 ? 's' : ''}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Last: {format(new Date(customer.bookings[customer.bookings.length - 1].preferredDate), "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            View History
                          </Button>
                          <Button variant="outline" size="sm">
                            <Mail className="h-3 w-3 mr-1" />
                            Contact
                          </Button>
                        </div>
                      </div>
                    ))}
                    {Object.keys(bookings.reduce((customers: any, booking: any) => {
                      customers[booking.email] = true;
                      return customers;
                    }, {})).length > 10 && (
                      <div className="text-center py-4">
                        <Button variant="outline">
                          Load More Customers
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Booking Details Dialog */}
      {selectedBooking && (
        <BookingDetailsDialog
          booking={selectedBooking}
          open={true}
          onClose={() => {
            // Clear the booking from the URL when closing the dialog
            const url = new URL(window.location.href);
            url.searchParams.delete('bookingId');
            window.history.pushState({}, '', url.toString());
            
            // Clear the selected booking state
            setSelectedBooking(null);
          }}
        />
      )}
      
      {/* Reschedule Booking Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reschedule Booking</DialogTitle>
            <DialogDescription>
              Select a new date and time for this appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">New Date</h4>
              <Calendar
                mode="single"
                selected={rescheduleDate}
                onSelect={setRescheduleDate}
                className="rounded-md border mx-auto"
              />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">New Time</h4>
              <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7:30 AM">7:30 AM</SelectItem>
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
                  <SelectItem value="7:30 PM">7:30 PM</SelectItem>
                  <SelectItem value="8:00 PM">8:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRescheduleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleReschedule}
              disabled={!rescheduleDate || !rescheduleTime || updateBookingMutation.isPending}
            >
              {updateBookingMutation.isPending ? "Rescheduling..." : "Reschedule Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}