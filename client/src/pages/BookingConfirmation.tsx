import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { CheckCircle, Calendar, Phone, Mail, ArrowLeft, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BookingDetails {
  confirmationNumber: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  selectedDate: string;
  selectedTime: string;
  services: Array<{
    displayName: string;
    price: number;
  }>;
  totalAmount: number;
}

export default function BookingConfirmation() {
  const [location] = useLocation();
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);

  useEffect(() => {
    // Parse booking details from URL parameters or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const confirmationNumber = urlParams.get('confirmation');
    
    if (confirmationNumber) {
      const savedBooking = localStorage.getItem(`booking-${confirmationNumber}`);
      if (savedBooking) {
        setBookingDetails(JSON.parse(savedBooking));
        // Clean up localStorage after retrieving
        localStorage.removeItem(`booking-${confirmationNumber}`);
      }
    }
  }, []);

  if (!bookingDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-gray-500 mb-4">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h2 className="text-xl font-semibold mb-2">Looking for your booking?</h2>
              <p className="text-sm">Please check your email for confirmation details.</p>
            </div>
            <Link href="/">
              <Button className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Thank you for booking!
          </h1>
          <p className="text-gray-600 text-lg">
            Your appointment has been confirmed and details sent to your email.
          </p>
        </div>

        {/* Confirmation Details */}
        <Card className="mb-6">
          <CardHeader className="bg-blue-600 text-white">
            <CardTitle className="text-center">
              Confirmation #{bookingDetails.confirmationNumber}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            
            {/* Customer & Appointment Info */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Appointment Details</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                    <span>{bookingDetails.selectedDate} • {bookingDetails.selectedTime}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-4 h-4 mr-2 mt-0.5 text-blue-500">📍</span>
                    <span>{bookingDetails.address}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-blue-500" />
                    <span>{bookingDetails.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-blue-500" />
                    <span>{bookingDetails.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Services Booked */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Services Booked</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {bookingDetails.services.map((service, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                    <span className="text-sm text-gray-700">{service.displayName}</span>
                    <span className="font-semibold text-gray-900">${service.price.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-blue-600">
                  <span className="font-bold text-lg text-gray-900">Total</span>
                  <span className="font-bold text-xl text-blue-600">${bookingDetails.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Email Calendar Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Calendar className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Add to Your Calendar</h4>
                  <p className="text-sm text-blue-700">
                    A calendar file is attached to your confirmation email. Click "Add to Calendar" 
                    to save this appointment to your phone or computer calendar.
                  </p>
                </div>
              </div>
            </div>

            {/* Payment & Contact Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">What's Next?</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Our technician will call 15-30 minutes before arrival</li>
                <li>• Payment accepted: Cash, Zelle, or Apple Pay</li>
                <li>• All equipment and mounting hardware included</li>
                <li>• If providing your own mount/equipment, just let us know</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700">
                  Questions? Need to reschedule? 
                  <span className="block text-blue-600 font-semibold">(404) 702-4748</span>
                </p>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Business Hours */}
        <Card className="mb-6">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Business Hours:</span> Mon–Fri 5:30 PM–10:30 PM, Sat–Sun 12 PM–8 PM
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              <span className="mr-2">🔧</span>
              Book Another Service
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Picture Perfect TV Install - Serving Metro Atlanta</p>
        </div>

      </div>
    </div>
  );
}