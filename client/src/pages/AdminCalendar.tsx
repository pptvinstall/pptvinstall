import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, User, Phone, MapPin, DollarSign, Filter, Eye } from 'lucide-react';
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

  const handleLogin = () => {
    if (password.trim()) {
      setIsAuthenticated(true);
      refetch();
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
            <Button
              onClick={() => setIsAuthenticated(false)}
              variant="outline"
              size="sm"
            >
              Logout
            </Button>
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
                    <div className="flex flex-col gap-2 lg:w-32">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`tel:${booking.phone}`)}
                      >
                        Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`mailto:${booking.email}`)}
                      >
                        Email
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(booking.address)}`)}
                      >
                        Directions
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
      </div>
    </div>
  );
};

export default AdminCalendar;