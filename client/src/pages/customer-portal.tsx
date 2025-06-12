import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { format } from 'date-fns';
import { 
  Calendar, Clock, MapPin, Phone, Mail, 
  Edit, X, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/pricing';

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
  status: 'active' | 'completed' | 'cancelled';
  pricingTotal: number;
  notes?: string;
  createdAt: string;
}

export default function CustomerPortalPage() {
  const [match, params] = useRoute('/customer-portal/:email/:token');
  const { toast } = useToast();
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  
  // Reschedule form state
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  useEffect(() => {
    if (match && params?.email && params?.token) {
      fetchBooking(params.email, params.token);
    }
  }, [match, params]);

  const fetchBooking = async (email: string, token: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customer-portal/${email}/${token}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Booking not found or invalid link');
        } else if (response.status === 403) {
          setError('Invalid or expired access link');
        } else {
          setError('Failed to load booking information');
        }
        return;
      }
      
      const data = await response.json();
      setBooking(data.booking);
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    
    setCancelling(true);
    try {
      const response = await fetch(`/api/customer-portal/${booking.email}/${params?.token}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Customer requested cancellation' })
      });
      
      if (response.ok) {
        setBooking({ ...booking, status: 'cancelled' });
        setShowCancelDialog(false);
        toast({
          title: 'Booking cancelled',
          description: 'Your appointment has been successfully cancelled.'
        });
      } else {
        throw new Error('Failed to cancel booking');
      }
    } catch (err) {
      toast({
        title: 'Cancellation failed',
        description: 'Could not cancel your booking. Please call us directly.',
        variant: 'destructive'
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleReschedule = async () => {
    if (!booking || !newDate || !newTime) return;
    
    setRescheduling(true);
    try {
      const response = await fetch(`/api/customer-portal/${booking.email}/${params?.token}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newDate,
          newTime,
          reason: rescheduleReason
        })
      });
      
      if (response.ok) {
        setBooking({ 
          ...booking, 
          preferredDate: newDate, 
          appointmentTime: newTime 
        });
        setShowRescheduleDialog(false);
        setNewDate('');
        setNewTime('');
        setRescheduleReason('');
        toast({
          title: 'Booking rescheduled',
          description: 'Your appointment has been successfully rescheduled.'
        });
      } else {
        throw new Error('Failed to reschedule booking');
      }
    } catch (err) {
      toast({
        title: 'Reschedule failed',
        description: 'Could not reschedule your booking. Please call us directly.',
        variant: 'destructive'
      });
    } finally {
      setRescheduling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!match) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid customer portal link. Please check your email for the correct link.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No booking found. Please check your email for the correct link.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Your Booking</h1>
        <p className="text-muted-foreground">
          Manage your TV installation appointment
        </p>
      </div>

      {/* Booking Status */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Appointment Details
            </CardTitle>
            {getStatusBadge(booking.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {format(new Date(booking.preferredDate), 'EEEE, MMMM dd, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">Appointment Date</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{booking.appointmentTime}</p>
                <p className="text-sm text-muted-foreground">Time</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <p className="font-medium">{booking.streetAddress}</p>
              <p className="text-sm text-muted-foreground">
                {booking.city}, {booking.state} {booking.zipCode}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-4 w-4 flex items-center justify-center">
              <span className="text-lg font-bold text-green-600">$</span>
            </div>
            <div>
              <p className="font-medium">{formatPrice(booking.pricingTotal)}</p>
              <p className="text-sm text-muted-foreground">Total Amount</p>
            </div>
          </div>

          {booking.notes && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-1">Special Instructions:</p>
              <p className="text-sm text-muted-foreground">{booking.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{booking.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{booking.phone}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {booking.status === 'active' && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Your Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setShowRescheduleDialog(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Reschedule
              </Button>
              
              <Button
                variant="destructive"
                onClick={() => setShowCancelDialog(true)}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel Booking
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-3">
              Need help? Call us at <strong>404-702-4748</strong> or email{' '}
              <strong>PPTVInstall@gmail.com</strong>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to cancel your appointment?</p>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone. You will need to book a new appointment if you change your mind.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Booking
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelBooking}
              disabled={cancelling}
            >
              {cancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-date">New Date</Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div>
              <Label htmlFor="new-time">New Time</Label>
              <Input
                id="new-time"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="reschedule-reason">Reason (optional)</Label>
              <Textarea
                id="reschedule-reason"
                placeholder="Let us know why you need to reschedule..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                rows={3}
              />
            </div>
            
            <p className="text-sm text-muted-foreground">
              We'll confirm your new appointment time within 24 hours.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReschedule}
              disabled={rescheduling || !newDate || !newTime}
            >
              {rescheduling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}