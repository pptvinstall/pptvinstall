import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Separator } from './separator';
import { CheckCircle, Calendar, Clock, MapPin, Mail, Phone, User, Settings2 } from 'lucide-react';

interface BookingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  bookingData: {
    name: string;
    email: string;
    phone: string;
    streetAddress: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    preferredDate: string;
    appointmentTime: string;
    pricingTotal: number;
    tvInstallations?: any[];
    smartHomeInstallations?: any[];
    deinstallationServices?: any[];
    services: any[];
  };
}

export function BookingConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  bookingData
}: BookingConfirmationModalProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const [hour, minute] = timeString.split(':');
      const hourNum = parseInt(hour);
      const ampm = hourNum >= 12 ? 'PM' : 'AM';
      const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
      return `${displayHour}:${minute} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const fullAddress = [
    bookingData.streetAddress,
    bookingData.addressLine2,
    `${bookingData.city}, ${bookingData.state} ${bookingData.zipCode}`
  ].filter(Boolean).join(', ');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Review Your Booking
          </DialogTitle>
          <DialogDescription>
            Please review your booking details before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Services Summary */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Selected Services
              </h3>
              <div className="space-y-2">
                {bookingData.services?.map((service, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">{service.name || service.type}</span>
                    <span className="font-semibold text-blue-600">${service.price}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-blue-600">${bookingData.pricingTotal}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appointment Details */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Appointment Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{formatDate(bookingData.preferredDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{formatTime(bookingData.appointmentTime)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                  <span>{fullAddress}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{bookingData.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{bookingData.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{bookingData.phone}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What to Expect */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-blue-800 mb-2">What Happens Next?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• You'll receive a confirmation email within 5 minutes</li>
                <li>• We'll call you 24 hours before your appointment</li>
                <li>• Our technician will arrive on time with all equipment</li>
                <li>• Professional installation with 1-year warranty</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Back to Edit
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isSubmitting}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {isSubmitting ? "Confirming..." : "Confirm Booking"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}