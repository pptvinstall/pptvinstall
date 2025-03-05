import * as React from "react"
import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion"
import { AnimatePresence } from "framer-motion"
import { Calendar } from "./calendar"
import { TimeSlot } from "./time-slot"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { ServiceWizard } from "./service-wizard"
import { PriceCalculator } from "./price-calculator"
import { Input } from "./input"
import { Textarea } from "./textarea"
import { format } from "date-fns"
import { ServiceBundles } from "./service-bundles";
import { ServiceCustomizationWizard } from "./service-customization-wizard";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useToast } from "@/hooks/use-toast";

const steps = [
  "Select Service",
  "Customize Installation",
  "Choose Date & Time",
  "Your Details",
  "Review & Book"
] as const;

interface BookingFormData {
  name: string;
  email: string;
  phone: string;
  streetAddress: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
  serviceType?: string;
  preferredDate?: string;
  preferredTime?: string;
}

interface ExistingBooking {
  preferredDate: string;
  preferredTime: string;
  id: number;
}

interface BookingWizardProps {
  onSubmit: (data: BookingFormData) => void;
  isSubmitting: boolean;
  existingBookings?: ExistingBooking[];
  isLoadingBookings?: boolean;
}

export function BookingWizard({ 
  onSubmit, 
  isSubmitting,
  existingBookings = [],
  isLoadingBookings = false
}: BookingWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedService, setSelectedService] = useState<string>("");
  const [serviceCustomizations, setServiceCustomizations] = useState<Record<string, any>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState<BookingFormData>({
    name: "",
    email: "",
    phone: "",
    streetAddress: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    notes: ""
  });

  const getTimeSlots = useCallback((date: Date | undefined) => {
    if (!date) return [];

    const isWeekend = date.getDay() === 0 || date.getDay() === 6; 

    if (isWeekend) {
      return [
        "11:00 AM",
        "12:00 PM",
        "1:00 PM",
        "2:00 PM",
        "3:00 PM",
        "4:00 PM",
        "5:00 PM",
        "6:00 PM"
      ];
    } else {
      return [
        "6:30 PM",
        "7:30 PM",
        "8:30 PM",
        "9:30 PM"
      ];
    }
  }, []);

  const timeSlots = useMemo(() => getTimeSlots(selectedDate), [selectedDate, getTimeSlots]);

  const isTimeSlotAvailable = useCallback((time: string) => {
    if (!selectedDate) return false;
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    return !existingBookings?.some(booking =>
      booking.preferredDate === dateString && booking.preferredTime === time
    );
  }, [selectedDate, existingBookings]);

  const handleServiceComplete = (serviceId: string, customizations: Record<string, any>) => {
    setSelectedService(serviceId);
    setServiceCustomizations(customizations);
    setCurrentStep(currentStep + 1);

    toast({
      title: "Service Selected",
      description: "Your service preferences have been saved.",
    });
  };

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0:
        return true;
      case 1:
        return selectedService !== "";
      case 2:
        return selectedDate && selectedTime;
      case 3:
        return formData.name && formData.email && formData.phone && 
               formData.streetAddress && formData.city && formData.state && formData.zipCode;
      default:
        return true;
    }
  }, [currentStep, selectedService, selectedDate, selectedTime, formData]);

  const handleSubmit = () => {
    const serviceDescription = `${selectedService} - Custom Installation`;

    onSubmit({
      ...formData,
      serviceType: serviceDescription,
      preferredDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      preferredTime: selectedTime
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between mb-8">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`flex items-center ${
              index < steps.length - 1 ? "flex-1" : ""
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                index <= currentStep
                  ? "border-primary bg-primary text-white"
                  : "border-gray-300 text-gray-300"
              }`}
            >
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-[2px] mx-2 ${
                  index < currentStep ? "bg-primary" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <Card className="p-6">
            {currentStep === 0 && (
              <ServiceCustomizationWizard onComplete={handleServiceComplete} />
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedTime(undefined); 
                  }}
                  className="rounded-md border"
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                />

                {selectedDate && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <h3 className="font-medium">Available Time Slots</h3>
                    {isLoadingBookings ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {timeSlots.map((time) => (
                          <TimeSlot
                            key={time}
                            time={time}
                            available={isTimeSlotAvailable(time)}
                            selected={selectedTime === time}
                            onClick={() => isTimeSlotAvailable(time) && setSelectedTime(time)}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Your email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone *</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Your phone number"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Street Address *</label>
                  <Input
                    value={formData.streetAddress}
                    onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                    placeholder="Street address"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Address Line 2</label>
                  <Input
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    placeholder="Apartment, suite, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City *</label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">State *</label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="State"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Zip Code *</label>
                  <Input
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="Zip code"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any additional notes about your installation requirements"
                  />
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Selected Service</h3>
                  <p className="text-sm">{selectedService}</p>
                  <div className="mt-2">
                    {Object.entries(serviceCustomizations).map(([key, value]) => (
                      <div key={key} className="text-sm text-gray-600">
                        {key}: {value}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Appointment</h3>
                  <p className="text-sm">
                    {selectedDate && format(selectedDate, "MMMM d, yyyy")} at {selectedTime}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Contact Information</h3>
                  <div className="space-y-1 text-sm">
                    <p>{formData.name}</p>
                    <p>{formData.email}</p>
                    <p>{formData.phone}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Installation Address</h3>
                  <div className="space-y-1 text-sm">
                    <p>{formData.streetAddress}</p>
                    {formData.addressLine2 && <p>{formData.addressLine2}</p>}
                    <p>{formData.city}, {formData.state} {formData.zipCode}</p>
                  </div>
                </div>

                {formData.notes && (
                  <div>
                    <h3 className="font-medium mb-2">Additional Notes</h3>
                    <p className="text-sm">{formData.notes}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="space-y-6">
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
              >
                Previous
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  disabled={!canProceed()}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !canProceed()}
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner className="mr-2 h-4 w-4" />
                      Booking...
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}