import * as React from "react"
import { useState, useEffect } from "react";
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
import { useQuery } from '@tanstack/react-query';
import { useCalendarAvailability } from "@/hooks/use-calendar-availability";

// Add environment variables
const GOOGLE_CALENDAR_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const GOOGLE_CALENDAR_ID = import.meta.env.VITE_GOOGLE_CALENDAR_ID;


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

  // Get calendar availability data
  const { isTimeSlotAvailable: isCalendarSlotAvailable, isLoading: isCalendarLoading } = useCalendarAvailability();

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

  // Check if the time slot is already booked
  const isTimeBooked = (dateString: string, time: string) => {
    // Make sure allBookings is defined and is an array before using .some()
    if (!allBookings || !Array.isArray(allBookings)) {
      return false; // Return false if no bookings exist yet
    }
    return allBookings.some(
      (booking) => booking.preferredDate === dateString && booking.appointmentTime === time
    );
  };

  // Check if a time slot is available - now also checks Google Calendar
  const isTimeSlotAvailable = (time: string) => {
    if (!selectedDate) return true; // Always available if no date is selected

    const dateString = format(selectedDate, 'yyyy-MM-dd');

    // First check our existing bookings
    if (isTimeBooked(dateString, time)) {
      return false;
    }

    // Then check Google Calendar availability
    return isCalendarSlotAvailable(dateString, time);
  };

  const handleServiceSelect = (services: { tvs: TVInstallation[], smartHome: SmartHomeInstallation[] }) => {
    console.log("Services selected:", services);
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
    // Get selected services
    let serviceDescription = "";

    console.log("Services selected:", {
      tvs: tvInstallations,
      smartHome: smartHomeInstallations
    });

    // TV installations
    if (tvInstallations.length > 0) {
      tvInstallations.forEach((tv, index) => {
        serviceDescription += `TV Mount ${index + 1}: ${tv.size === 'large' ? '56"+' : '32"-55"'} - ${tv.location}`;

        if (tv.mountType !== 'none') {
          serviceDescription += ` (${tv.mountType})`;
        }

        if (tv.masonryWall) {
          serviceDescription += ` (masonry)`;
        }

        if (tv.outletRelocation) {
          serviceDescription += ` with outlet relocation`;
        }

        serviceDescription += ", ";
      });
    }

    // Smart home installations
    if (smartHomeInstallations.length > 0) {
      smartHomeInstallations.forEach(device => {
        const deviceName = device.type === 'doorbell' ? 'Smart Doorbell' : 
                          device.type === 'floodlight' ? 'Floodlight Camera' : 'Smart Camera';

        serviceDescription += `${deviceName} (${device.quantity})`;

        if (device.type === 'doorbell' && device.brickInstallation) {
          serviceDescription += " (brick)";
        }

        if (device.type === 'camera' && device.mountHeight && device.mountHeight > 8) {
          serviceDescription += ` at ${device.mountHeight}ft`;
        }

        serviceDescription += ", ";
      });
    }

    // Remove trailing comma and space
    serviceDescription = serviceDescription.replace(/, $/, "");

    // Log the exact time being submitted to verify it's correct
    console.log("Submitting with selected time:", selectedTime);
    console.log("Selected date:", selectedDate);
    console.log("Selected time (raw string):", selectedTime);

    // CRITICAL: Store the raw date value without any modification
    // We use yyyy-MM-dd format to ensure the date is preserved exactly as selected
    const rawDateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

    // Store the smartHomeItems list for later use in the price calculation
    const smartHomeItems = smartHomeInstallations.map(item => item.type);

    // Submit booking data with the raw time and date strings
    onSubmit({
      ...formData,
      serviceType: serviceDescription,
      preferredDate: rawDateString,
      appointmentTime: selectedTime, // Store raw time string directly
      smartHomeItems: smartHomeItems // Add this for better tracking of selected services
    });
  };

  // Use passed bookings or fetched bookings as fallback
  const allBookings = existingBookings.length > 0 ? existingBookings : [];
  const isBookingsLoading = isLoadingBookings || isCalendarLoading;

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
              onClose={() => {
                // Move to next step after service selection is confirmed
                if (canProceed()) {
                  setCurrentStep(1);
                }
              }}
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
                  {isBookingsLoading ? (
                    <div className="text-center py-4">Loading availability...</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((time) => (
                        <TimeSlot
                          key={time}
                          time={time}
                          available={isTimeSlotAvailable(time)}
                          selected={selectedTime === time}
                          onClick={() => {
                            if (isTimeSlotAvailable(time)) {
                              setSelectedTime(time);
                              console.log("Time selected (raw string):", time);
                            }
                          }}
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
                  {selectedDate && format(selectedDate, "MMMM d, yyyy")} at <span className="font-bold">{selectedTime}</span>
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