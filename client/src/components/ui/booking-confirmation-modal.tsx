import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Calendar, Clock, MapPin, Phone, Mail, DollarSign, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/pricing';
// Define BookingData interface locally since it's not exported from types
interface BookingData {
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
  pricingTotal?: number;
  tvInstallations?: Array<{
    size: string;
    mountType: string;
    masonryWall?: boolean;
    highRise?: boolean;
    outletNeeded?: boolean;
  }>;
  smartHomeInstallations?: Array<{
    deviceType: string;
    location: string;
  }>;
}

interface BookingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingData;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function BookingConfirmationModal({
  isOpen,
  onClose,
  bookingData,
  onConfirm,
  isSubmitting = false
}: BookingConfirmationModalProps) {
  const [step, setStep] = useState<'review' | 'submitting' | 'success' | 'error'>('review');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleConfirm = async () => {
    setStep('submitting');
    setErrorMessage('');
    try {
      await onConfirm();
      setStep('success');
    } catch (error) {
      console.error('Booking submission failed:', error);
      const message = error instanceof Error ? error.message : 'An unexpected error occurred while submitting your booking.';
      setErrorMessage(message);
      setStep('error');
    }
  };

  const formatAddress = () => {
    const parts = [
      bookingData.streetAddress,
      bookingData.addressLine2,
      bookingData.city,
      bookingData.state,
      bookingData.zipCode
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'success' ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                Booking Confirmed!
              </>
            ) : (
              <>
                <Calendar className="h-6 w-6 text-blue-500" />
                Review Your Booking
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Customer Information */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{bookingData.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{bookingData.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{bookingData.phone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Appointment Details */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Appointment Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{new Date(bookingData.preferredDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-medium">{bookingData.appointmentTime}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Service Location</p>
                      <p className="font-medium flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        {formatAddress()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Services Summary */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Services & Pricing
                  </h3>
                  
                  {bookingData.tvInstallations && bookingData.tvInstallations.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-2">TV Installations</p>
                      <div className="space-y-2">
                        {bookingData.tvInstallations.map((tv: any, index: number) => (
                          <div key={index} className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">TV {index + 1}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline">{tv.size === 'large' ? '56"+' : '32"-55"'}</Badge>
                                {tv.mountType !== 'customer' && (
                                  <Badge variant="outline">{tv.mountType}</Badge>
                                )}
                                {tv.masonryWall && <Badge variant="secondary">Masonry</Badge>}
                                {tv.highRise && <Badge variant="secondary">High-Rise</Badge>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {bookingData.smartHomeInstallations && bookingData.smartHomeInstallations.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-2">Smart Home Devices</p>
                      <div className="space-y-2">
                        {bookingData.smartHomeInstallations.map((device: any, index: number) => (
                          <div key={index} className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{device.deviceType}</p>
                              <Badge variant="outline">{device.location}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-semibold">Total</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatPrice(bookingData.pricingTotal || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Back to Edit
                </Button>
                <Button 
                  onClick={handleConfirm} 
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="mr-2"
                      >
                        ⏳
                      </motion.div>
                      Confirming...
                    </>
                  ) : (
                    'Confirm Booking'
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'submitting' && (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mb-4 text-6xl"
              >
                ⚡
              </motion.div>
              <h3 className="text-xl font-semibold mb-2">Creating Your Booking...</h3>
              <p className="text-muted-foreground">Please wait while we process your request</p>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center py-8">
                <div className="mb-4 text-6xl">⚠️</div>
                <h3 className="text-xl font-semibold mb-4 text-red-600">Booking Submission Failed</h3>
                <p className="text-muted-foreground mb-6">
                  {errorMessage || 'There was an error processing your booking. Please try again.'}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={() => setStep('review')} className="bg-blue-600 hover:bg-blue-700">
                    Try Again
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                className="mb-6"
              >
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              </motion.div>
              <h3 className="text-2xl font-bold text-green-600 mb-4">Booking Confirmed!</h3>
              <p className="text-muted-foreground mb-6">
                We've sent a confirmation email to {bookingData.email}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Our team will contact you within 24 hours to confirm your appointment details.
              </p>
              <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}