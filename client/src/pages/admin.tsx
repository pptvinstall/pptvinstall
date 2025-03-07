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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { formatPrice } from "@/lib/pricing";
import { Download, Search } from "lucide-react";

// Simplified booking interface
interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  preferredDate: string;
  appointmentTime: string;
  serviceType: string;
  status: string;
  pricingTotal?: string;
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const { toast } = useToast();

  // Simplified query with error handling
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/bookings");
        return response?.bookings || [];
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
        toast({
          title: "Error fetching bookings",
          description: "Please try refreshing the page",
          variant: "destructive"
        });
        return [];
      }
    },
    enabled: isAuthenticated
  });

  // Memoized filtering logic
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const searchFields = [
        booking.name,
        booking.email,
        booking.phone,
        booking.streetAddress
      ].map(field => field.toLowerCase());

      const matchesSearch = !searchTerm || 
        searchFields.some(field => field.includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === "all" || booking.status === statusFilter;

      const matchesDate = !dateFilter || 
        format(new Date(booking.preferredDate), "yyyy-MM-dd") === format(dateFilter, "yyyy-MM-dd");

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [bookings, searchTerm, statusFilter, dateFilter]);

  // Simplified login mutation
  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest("POST", "/api/admin/login", { password });
      if (!response.ok) throw new Error('Invalid password');
      return response;
    },
    onSuccess: () => {
      setIsAuthenticated(true);
      toast({ title: "Login successful" });
    },
    onError: () => {
      toast({
        title: "Login failed",
        description: "Invalid password",
        variant: "destructive"
      });
    }
  });

  // Export functionality
  const exportBookings = () => {
    const headers = ["Date", "Time", "Name", "Email", "Phone", "Address", "Service", "Status", "Total"];
    const rows = filteredBookings.map(booking => [
      format(new Date(booking.preferredDate), "MM/dd/yyyy"),
      booking.appointmentTime,
      booking.name,
      booking.email,
      booking.phone,
      `${booking.streetAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}`,
      booking.serviceType,
      booking.status,
      booking.pricingTotal ? formatPrice(parseFloat(booking.pricingTotal)) : "N/A"
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              loginMutation.mutate(password);
            }} className="space-y-4">
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" size="sm" onClick={exportBookings}>
          <Download className="h-4 w-4 mr-2" />
          Export Bookings
        </Button>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Bookings Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
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
            <Calendar
              mode="single"
              selected={dateFilter}
              onSelect={setDateFilter}
              className="rounded-md border"
            />
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
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        {format(new Date(booking.preferredDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{booking.appointmentTime}</TableCell>
                      <TableCell>{booking.name}</TableCell>
                      <TableCell>{booking.serviceType}</TableCell>
                      <TableCell>
                        <div>
                          <p>{booking.phone}</p>
                          <p className="text-sm text-gray-500">{booking.email}</p>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}