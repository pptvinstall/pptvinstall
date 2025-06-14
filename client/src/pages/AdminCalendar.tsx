import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, User, Phone, MapPin, DollarSign, Filter, Eye, Plus, Edit, X, CheckCircle, Download, LogOut, Moon, Sun } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface AdminBooking {
  id: number;
  title: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  serviceType: string;
  date: string;
  time: string;
  notes: string;
  pricingTotal: string;
  createdAt: string;
}

const AdminCalendar = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'today', 'week'
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showBlockTimeModal, setShowBlockTimeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [blockTimeData, setBlockTimeData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    reason: ''
  });

  const queryClient = useQueryClient();

  const { data: calendarData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/admin/calendar', password],
    enabled: isAuthenticated && password.length > 0,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: dailyData, isLoading: isDailyLoading } = useQuery({
    queryKey: ['/api/admin/calendar', selectedDate, password],
    enabled: isAuthenticated && selectedDate.length > 0,
    refetchInterval: 30000,
  });

  // Check for existing session on load
  useEffect(() => {
    const savedAuth = localStorage.getItem('jwoodAdminAuth');
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      if (authData.expires > Date.now()) {
        setIsAuthenticated(true);
        setPassword(authData.password);
      } else {
        localStorage.removeItem('jwoodAdminAuth');
      }
    }
  }, []);

  const handleLogin = () => {
    if (password.trim()) {
      setIsAuthenticated(true);
      // Save session for 24 hours
      const authData = {
        password: password,
        expires: Date.now() + (24 * 60 * 60 * 1000)
      };
      localStorage.setItem('jwoodAdminAuth', JSON.stringify(authData));
      refetch();
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    localStorage.removeItem('jwoodAdminAuth');
  };

  // Block time slot mutation
  const blockTimeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/admin/block-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, password })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/calendar'] });
      setShowBlockTimeModal(false);
      setBlockTimeData({ date: '', startTime: '', endTime: '', reason: '' });
    }
  });

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/admin/bookings/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, password })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/calendar'] });
      setShowEditModal(false);
      setSelectedBooking(null);
    }
  });

  // Export to PDF function
  const exportToPDF = () => {
    const printContent = document.getElementById('calendar-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      printWindow?.document.write(`
        <html>
          <head>
            <title>JWood Installation Calendar</title>
            <style>
              body { font-family: Inter, sans-serif; margin: 20px; }
              .booking-card { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px; }
              .service-badge { background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
              .date-header { font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            <h1>JWood Installation Calendar - ${new Date().toLocaleDateString()}</h1>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow?.document.close();
      printWindow?.print();
    }
  };

  const getServiceTypeColor = (serviceType: string) => {
    if (serviceType.toLowerCase().includes('tv mount')) return 'bg-blue-100 text-blue-800';
    if (serviceType.toLowerCase().includes('smart home')) return 'bg-green-100 text-green-800';
    if (serviceType.toLowerCase().includes('outlet')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr;
  };

  const getTodaysBookings = () => {
    if (!calendarData?.bookings) return [];
    const today = new Date().toISOString().split('T')[0];
    return calendarData.bookings.filter((booking: AdminBooking) => booking.date === today);
  };

  const getThisWeeksBookings = () => {
    if (!calendarData?.bookings) return [];
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return calendarData.bookings.filter((booking: AdminBooking) => {
      const bookingDate = new Date(booking.date);
      return bookingDate >= today && bookingDate <= weekFromNow;
    });
  };

  const getFilteredBookings = () => {
    if (!calendarData?.bookings) return [];
    
    switch (filter) {
      case 'today':
        return getTodaysBookings();
      case 'week':
        return getThisWeeksBookings();
      default:
        return calendarData.bookings;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Calendar className="h-6 w-6" />
              Admin Calendar Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <Button onClick={handleLogin} className="w-full">
              Access Calendar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p>Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-red-600 mb-4">Failed to load calendar</p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bookings = getFilteredBookings();
  const todayCount = getTodaysBookings().length;
  const weekCount = getThisWeeksBookings().length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-8 w-8" />
              JWood's Installation Calendar
            </h1>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsDarkMode(!isDarkMode)}
                variant="outline"
                size="sm"
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                onClick={exportToPDF}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                onClick={() => setShowBlockTimeModal(true)}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Block Time
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{todayCount}</div>
                <div className="text-sm text-gray-600">Today's Jobs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{weekCount}</div>
                <div className="text-sm text-gray-600">This Week</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{calendarData?.totalBookings || 0}</div>
                <div className="text-sm text-gray-600">Total Upcoming</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              size="sm"
            >
              All Bookings
            </Button>
            <Button
              variant={filter === 'today' ? 'default' : 'outline'}
              onClick={() => setFilter('today')}
              size="sm"
            >
              Today ({todayCount})
            </Button>
            <Button
              variant={filter === 'week' ? 'default' : 'outline'}
              onClick={() => setFilter('week')}
              size="sm"
            >
              This Week ({weekCount})
            </Button>
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No bookings found for the selected filter</p>
              </CardContent>
            </Card>
          ) : (
            bookings.map((booking: AdminBooking) => (
              <Card key={booking.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Left Column - Main Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {booking.customerName}
                        </h3>
                        <Badge className={getServiceTypeColor(booking.serviceType)}>
                          {booking.serviceType}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {formatDate(booking.date)}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="h-4 w-4" />
                          {formatTime(booking.time)}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-4 w-4" />
                          {booking.phone}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-4 w-4" />
                          {booking.email}
                        </div>
                        <div className="flex items-start gap-2 text-gray-600 md:col-span-2">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          {booking.address}
                        </div>
                        {booking.pricingTotal && (
                          <div className="flex items-center gap-2 text-green-600 font-medium">
                            <DollarSign className="h-4 w-4" />
                            {booking.pricingTotal}
                          </div>
                        )}
                      </div>
                      
                      {booking.notes && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Notes:</strong> {booking.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right Column - Actions */}
                    <div className="flex flex-col gap-2 lg:w-40">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`tel:${booking.phone}`)}
                        className="w-full"
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`mailto:${booking.email}`)}
                        className="w-full"
                      >
                        <User className="h-3 w-3 mr-1" />
                        Email
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(booking.address)}`)}
                        className="w-full"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        Directions
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowEditModal(true);
                        }}
                        className="w-full"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateBookingMutation.mutate({
                          id: booking.id,
                          status: 'completed'
                        })}
                        className="w-full bg-green-50 text-green-700 hover:bg-green-100"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Complete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Calendar refreshes automatically every 30 seconds
        </div>

        {/* Block Time Modal */}
        {showBlockTimeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md m-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Block Time Slot</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBlockTimeModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <Input
                    type="date"
                    value={blockTimeData.date}
                    onChange={(e) => setBlockTimeData(prev => ({...prev, date: e.target.value}))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <Input
                    type="time"
                    value={blockTimeData.startTime}
                    onChange={(e) => setBlockTimeData(prev => ({...prev, startTime: e.target.value}))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <Input
                    type="time"
                    value={blockTimeData.endTime}
                    onChange={(e) => setBlockTimeData(prev => ({...prev, endTime: e.target.value}))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reason</label>
                  <Input
                    placeholder="e.g., Personal appointment, Maintenance"
                    value={blockTimeData.reason}
                    onChange={(e) => setBlockTimeData(prev => ({...prev, reason: e.target.value}))}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => blockTimeMutation.mutate(blockTimeData)}
                    disabled={!blockTimeData.date || !blockTimeData.startTime || !blockTimeData.endTime}
                    className="flex-1"
                  >
                    Block Time
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowBlockTimeModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Booking Modal */}
        {showEditModal && selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Edit Booking</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedBooking(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Customer Name</label>
                    <Input value={selectedBooking.customerName} readOnly />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <Input value={selectedBooking.phone} readOnly />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input value={selectedBooking.email} readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Service Type</label>
                  <Input value={selectedBooking.serviceType} readOnly />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <Input value={selectedBooking.date} readOnly />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Time</label>
                    <Input value={selectedBooking.time} readOnly />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <Input value={selectedBooking.address} readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    className="w-full p-2 border border-gray-300 rounded-md"
                    rows={3}
                    value={selectedBooking.notes}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Total Amount</label>
                  <Input value={selectedBooking.pricingTotal} readOnly />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => updateBookingMutation.mutate({
                      id: selectedBooking.id,
                      status: 'completed'
                    })}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Mark Complete
                  </Button>
                  <Button
                    onClick={() => updateBookingMutation.mutate({
                      id: selectedBooking.id,
                      status: 'cancelled'
                    })}
                    variant="destructive"
                  >
                    Cancel Booking
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedBooking(null);
                    }}
                    className="ml-auto"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCalendar;