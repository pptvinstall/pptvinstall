import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Booking {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  selectedDate: string;
  selectedTime: string;
  services: Array<{
    type: string;
    details: any;
  }>;
  totalPrice: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  address?: string;
  notes?: string;
  createdAt: string;
}

export default function AdminCalendar() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication
  const handleAuth = async () => {
    try {
      const response = await fetch('/api/admin/bookings', {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });

      if (response.ok) {
        setIsAuthenticated(true);
        fetchBookings();
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('Authentication failed');
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/bookings', {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setBookings(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
    }
  }, [isAuthenticated]);

  // Filter bookings by selected date
  const filteredBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.selectedDate).toISOString().split('T')[0];
    return bookingDate === selectedDate;
  });

  // Get upcoming bookings (next 7 days)
  const upcomingBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.selectedDate);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return bookingDate >= today && bookingDate <= nextWeek;
  }).sort((a, b) => new Date(a.selectedDate).getTime() - new Date(b.selectedDate).getTime());

  const updateBookingStatus = async (bookingId: string, newStatus: 'confirmed' | 'cancelled') => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchBookings(); // Refresh the list
      } else {
        setError('Failed to update booking status');
      }
    } catch (err) {
      setError('Failed to update booking');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
            />
            <Button onClick={handleAuth} className="w-full">
              Access Calendar
            </Button>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Calendar</h1>
          <p className="text-gray-600">Manage bookings and schedule</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <Button onClick={fetchBookings} className="mt-2" size="sm">
              Retry
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Date Selector */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Bookings:</span>
                    <Badge>{bookings.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Today's Bookings:</span>
                    <Badge>{filteredBookings.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Upcoming (7 days):</span>
                    <Badge>{upcomingBookings.length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Selected Date Bookings */}
            <Card>
              <CardHeader>
                <CardTitle>Bookings for {selectedDate}</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredBookings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No bookings for this date</p>
                ) : (
                  <div className="space-y-4">
                    {filteredBookings.map((booking) => (
                      <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{booking.customerName}</h3>
                            <p className="text-sm text-gray-600">{booking.selectedTime}</p>
                          </div>
                          <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                            {booking.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Phone:</strong> {booking.phone}</p>
                            <p><strong>Email:</strong> {booking.email}</p>
                            <p><strong>Price:</strong> ${booking.totalPrice}</p>
                          </div>
                          <div>
                            <p><strong>Services:</strong></p>
                            <ul className="list-disc list-inside ml-2">
                              {booking.services.map((service, idx) => (
                                <li key={idx}>{service.type}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {booking.address && (
                          <p className="mt-2 text-sm"><strong>Address:</strong> {booking.address}</p>
                        )}

                        {booking.notes && (
                          <p className="mt-2 text-sm"><strong>Notes:</strong> {booking.notes}</p>
                        )}

                        <div className="flex gap-2 mt-4">
                          {booking.status !== 'confirmed' && (
                            <Button
                              size="sm"
                              onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                            >
                              Confirm
                            </Button>
                          )}
                          {booking.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Bookings */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Bookings (Next 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingBookings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No upcoming bookings</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingBookings.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{booking.customerName}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(booking.selectedDate).toLocaleDateString()} at {booking.selectedTime}
                          </p>
                        </div>
                        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                          {booking.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}