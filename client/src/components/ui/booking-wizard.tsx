import * as React from "react"
import { useState } from "react";
import { motion } from "framer-motion"
import { Calendar } from "./calendar"
import { TimeSlot } from "./time-slot"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import { ServiceWizard, type TVInstallation, type SmartHomeInstallation } from "./service-wizard"
import { PriceCalculator } from "./price-calculator"
import { Input } from "./input"
import { Textarea } from "./textarea"
import { format } from "date-fns"

const steps = [
  "Choose Services",
  "Select Date & Time",
  "Your Details",
  "Review & Book"
] as const;

interface BookingWizardProps {
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  existingBookings?: any[];
  isLoadingBookings?: boolean;
}

export function BookingWizard({ 
  onSubmit, 
  isSubmitting,
  existingBookings = [],
  isLoadingBookings = false
}: BookingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tvInstallations, setTvInstallations] = useState<TVInstallation[]>([]);
  const [smartHomeInstallations, setSmartHomeInstallations] = useState<SmartHomeInstallation[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState({
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

  // Generate time slots based on day of week
  const getTimeSlots = (date: Date | undefined) => {
    if (!date) return [];

    const isWeekend = date.getDay() === 0 || date.getDay() === 6; // 0 is Sunday, 6 is Saturday

    if (isWeekend) {
      // Weekend slots: 11 AM to 7 PM
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
      // Weekday slots: 6:30 PM to 10:30 PM
      return [
        "6:30 PM",
        "7:30 PM",
        "8:30 PM",
        "9:30 PM"
      ];
    }
  };

  const timeSlots = getTimeSlots(selectedDate);

  const isTimeSlotAvailable = (time: string) => {
    if (!selectedDate) return false;
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    return !existingBookings.some(booking =>
      booking.preferredDate === dateString && booking.preferredTime === time
    );
  };

  const handleServiceSelect = (services: { tvs: TVInstallation[], smartHome: SmartHomeInstallation[] }) => {
    setTvInstallations(services.tvs);
    setSmartHomeInstallations(services.smartHome);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return tvInstallations.length > 0 || smartHomeInstallations.length > 0;
      case 1:
        return selectedDate && selectedTime;
      case 2:
        return formData.name && formData.email && formData.phone && 
               formData.streetAddress && formData.city && formData.state && formData.zipCode;
      default:
        return true;
    }
  };

  const handleSubmit = () => {
    const preferredDate = selectedDate ? new Date(selectedDate) : new Date();

    // Set the time based on the selected time slot
    if (selectedTime) {
      const [hourStr, minuteStr, period] = selectedTime.match(/(\d+):(\d+)\s+([AP]M)/)?.slice(1) || [];

      if (hourStr && minuteStr && period) {
        let hour = parseInt(hourStr);
        const minute = parseInt(minuteStr);

        // Convert to 24-hour format
        if (period === "PM" && hour < 12) hour += 12;
        if (period === "AM" && hour === 12) hour = 0;

        preferredDate.setHours(hour, minute, 0, 0);
      }
    }

    // Create the service type string
    let serviceDescription = "";

    if (tvInstallations.length > 0) {
      tvInstallations.forEach((tv, index) => {
        if (index > 0) serviceDescription += " + ";

        const sizeDesc = tv.size === 'large' ? '56" or larger' : '32"-55"';
        serviceDescription += `${index + 1} TV ${sizeDesc}`;

        if (tv.mountType !== 'none') {
          serviceDescription += ` with ${tv.mountType} mount`;
        }

        if (tv.location === 'fireplace') {
          serviceDescription += ` (fireplace)`;
        }

        if (tv.needsOutlet) {
          serviceDescription += ` with outlet relocation`;
        }
      });
    }

    if (smartHomeInstallations.length > 0) {
      if (serviceDescription) serviceDescription += " + ";

      smartHomeInstallations.forEach((device, index) => {
        if (index > 0) serviceDescription += " + ";

        if (device.type === 'doorbell') {
          serviceDescription += `Smart Doorbell`;
          if (device.brickInstallation) {
            serviceDescription += ` (brick)`;
          }
        } else if (device.type === 'floodlight') {
          serviceDescription += `Smart Floodlight`;
        } else if (device.type === 'camera') {
          serviceDescription += `Smart Camera`;
          if (device.mountHeight && device.mountHeight > 8) {
            serviceDescription += ` height-${device.mountHeight}`;
          }
        }

        if (device.quantity > 1) {
          serviceDescription += ` (${device.quantity} units)`;
        }
      });
    }

    // Submit booking data
    onSubmit({
      ...formData,
      serviceType: serviceDescription,
      preferredDate: preferredDate.toISOString(), // Send ISO string with correct time
    });
  };

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      <div className="flex justify-between">
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

      {/* Step Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          {currentStep === 0 && (
            <ServiceWizard
              onServiceSelect={handleServiceSelect}
              onClose={() => {}}
            />
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(undefined); // Reset time when date changes
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
                    <div className="text-center py-4">Loading availability...</div>
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

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Your email"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Your phone number"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Street Address</label>
                <Input
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                  placeholder="Street address"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Address Line 2 (optional)</label>
                <Input
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Apartment, suite, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">State</label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Zip Code</label>
                <Input
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="Zip code"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any additional notes"
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Selected Services</h3>
                <ul className="space-y-1 text-sm">
                  {tvInstallations.map((tv, index) => (
                    <li key={`tv-${index}`}>
                      TV {index + 1}: {tv.size === 'large' ? '56"+' : '32"-55"'} - {tv.location} Mount
                      {tv.mountType !== 'none' && ` (${tv.mountType})`}
                    </li>
                  ))}
                  {smartHomeInstallations.map((device, index) => (
                    <li key={`smart-${index}`}>
                      {device.type === 'doorbell' ? 'Smart Doorbell' :
                       device.type === 'floodlight' ? 'Floodlight' : 
                       'Smart Camera'} {device.quantity > 1 && `(${device.quantity})`}
                      {device.type === 'camera' && device.mountHeight && device.mountHeight > 8 && 
                        ` at ${device.mountHeight}ft`}
                      {device.type === 'doorbell' && device.brickInstallation && ' (Brick)'}
                    </li>
                  ))}
                </ul>
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
          <PriceCalculator
            tvs={tvInstallations}
            smartHome={smartHomeInstallations}
            distance={0}
          />

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
            >
              Previous
            </Button>

            {/* Merged the "Confirm Selection" and "Next" buttons into a single button */}
            <Button
              onClick={() => {
                if (currentStep < steps.length - 1) {
                  setCurrentStep((prev) => prev + 1);
                } else {
                  handleSubmit();
                }
              }}
              disabled={isSubmitting || !canProceed()}
            >
              {isSubmitting 
                ? "Booking..." 
                : currentStep === steps.length - 1 
                  ? "Confirm Booking" 
                  : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}