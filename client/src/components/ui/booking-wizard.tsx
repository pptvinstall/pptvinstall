import * as React from "react"
import { useState, useEffect, useMemo, useCallback } from "react";
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
import { bookingSchema } from "@shared/schema";

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

// Step 1 component - Choose Services
const ServiceSelectionStep = React.memo(({ onServiceSelect, onContinue }: {
  onServiceSelect: (services: { tvs: TVInstallation[], smartHome: SmartHomeInstallation[] }) => void;
  onContinue: () => void;
}) => (
  <ServiceWizard
    onServiceSelect={onServiceSelect}
    onClose={onContinue}
  />
));

// Step 2 component - Date & Time Selection
const DateTimeSelectionStep = React.memo(({
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  isBookingsLoading,
  timeSlots,
  isTimeSlotAvailable
}: {
  selectedDate: Date | undefined;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | undefined>>;
  selectedTime: string | undefined;
  setSelectedTime: React.Dispatch<React.SetStateAction<string | undefined>>;
  isBookingsLoading: boolean;
  timeSlots: string[];
  isTimeSlotAvailable: (time: string) => boolean | undefined;
}) => (
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
            {timeSlots.map((time) => {
              // Get availability status (true, false, or undefined if checking)
              const availability = isTimeSlotAvailable(time);

              return (
                <TimeSlot
                  key={time}
                  time={time}
                  available={availability !== false} // Show as available while checking
                  selected={selectedTime === time}
                  loading={availability === undefined} // Show loading state if undefined
                  onClick={() => {
                    if (availability !== false) { // Allow selection if not definitely unavailable
                      setSelectedTime(time);
                      console.log("Time selected (raw string):", time);
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </motion.div>
    )}
  </div>
));

// Step 3 component - Customer Details
const CustomerDetailsStep = React.memo(({ 
  formData, 
  setFormData, 
  validationErrors 
}: {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  validationErrors: Record<string, string[]>;
}) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <label className="text-sm font-medium">Name</label>
      <Input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Your name"
        className={validationErrors.name ? "border-red-500" : ""}
      />
      {validationErrors.name && (
        <p className="text-sm text-red-500">{validationErrors.name[0]}</p>
      )}
    </div>

    <div className="space-y-2">
      <label className="text-sm font-medium">Email</label>
      <Input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Your email"
        className={validationErrors.email ? "border-red-500" : ""}
      />
      {validationErrors.email && (
        <p className="text-sm text-red-500">{validationErrors.email[0]}</p>
      )}
    </div>

    <div className="space-y-2">
      <label className="text-sm font-medium">Phone</label>
      <Input
        type="tel"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        placeholder="Your phone number"
        className={validationErrors.phone ? "border-red-500" : ""}
      />
      {validationErrors.phone && (
        <p className="text-sm text-red-500">{validationErrors.phone[0]}</p>
      )}
    </div>

    <div className="space-y-2">
      <label className="text-sm font-medium">Street Address</label>
      <Input
        value={formData.streetAddress}
        onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
        placeholder="Street address"
        className={validationErrors.streetAddress ? "border-red-500" : ""}
      />
      {validationErrors.streetAddress && (
        <p className="text-sm text-red-500">{validationErrors.streetAddress[0]}</p>
      )}
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
          className={validationErrors.city ? "border-red-500" : ""}
        />
        {validationErrors.city && (
          <p className="text-sm text-red-500">{validationErrors.city[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">State</label>
        <Input
          value={formData.state}
          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          placeholder="State"
          className={validationErrors.state ? "border-red-500" : ""}
        />
        {validationErrors.state && (
          <p className="text-sm text-red-500">{validationErrors.state[0]}</p>
        )}
      </div>
    </div>

    <div className="space-y-2">
      <label className="text-sm font-medium">Zip Code</label>
      <Input
        value={formData.zipCode}
        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
        placeholder="Zip code"
        className={validationErrors.zipCode ? "border-red-500" : ""}
      />
      {validationErrors.zipCode && (
        <p className="text-sm text-red-500">{validationErrors.zipCode[0]}</p>
      )}
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
));

// Step 4 component - Review & Book
const ReviewBookingStep = React.memo(({ 
  tvInstallations, 
  smartHomeInstallations, 
  selectedDate, 
  selectedTime, 
  formData 
}: {
  tvInstallations: TVInstallation[];
  smartHomeInstallations: SmartHomeInstallation[];
  selectedDate: Date | undefined;
  selectedTime: string | undefined;
  formData: any;
}) => (
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
));

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
  // New state to track time slot availability
  const [timeSlotAvailability, setTimeSlotAvailability] = useState<Record<string, boolean>>({});
  // New state for validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  // Get calendar availability data
  const { isTimeSlotAvailable: checkCalendarSlotAvailable, isLoading: isCalendarLoading } = useCalendarAvailability();

  // Effect to update availabilities when date changes
  useEffect(() => {
    if (selectedDate) {
      // Reset availability when date changes
      setTimeSlotAvailability({});
    }
  }, [selectedDate]);

  // Generate time slots based on day of week - memoized to avoid recalculation
  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];

    const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6; // 0 is Sunday, 6 is Saturday

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
  }, [selectedDate]);

  // Memoized function to check if time is already booked
  const isTimeBooked = useCallback((dateString: string, time: string) => {
    // Make sure allBookings is defined and is an array before using .some()
    if (!existingBookings || !Array.isArray(existingBookings)) {
      return false; // Return false if no bookings exist yet
    }
    return existingBookings.some(
      (booking) => booking.preferredDate === dateString && booking.appointmentTime === time
    );
  }, [existingBookings]);

  // Check time slot availability and update state - now handles async Google Calendar checking
  const checkTimeSlotAvailability = useCallback(async (dateString: string, time: string) => {
    // First check our existing bookings (synchronous)
    if (isTimeBooked(dateString, time)) {
      setTimeSlotAvailability(prev => ({
        ...prev,
        [`${dateString}-${time}`]: false
      }));
      return false;
    }

    try {
      // Then check Google Calendar availability (async)
      const isAvailable = await checkCalendarSlotAvailable(dateString, time);

      // Update the state with the result
      setTimeSlotAvailability(prev => ({
        ...prev,
        [`${dateString}-${time}`]: isAvailable
      }));

      return isAvailable;
    } catch (error) {
      console.error("Error checking time slot availability:", error);
      // Default to available if there's an error
      setTimeSlotAvailability(prev => ({
        ...prev,
        [`${dateString}-${time}`]: true
      }));
      return true;
    }
  }, [isTimeBooked, checkCalendarSlotAvailable]);

  // Check if a time slot is available - now consults the local state for up-to-date availability
  const isTimeSlotAvailable = useCallback((time: string) => {
    if (!selectedDate) return true; // Always available if no date is selected

    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const key = `${dateString}-${time}`;

    // If we haven't checked this slot yet, trigger a check and default to unknown (showing loading state)
    if (timeSlotAvailability[key] === undefined) {
      // Trigger an async check that will update the state
      checkTimeSlotAvailability(dateString, time);
      return undefined; // Return undefined to indicate "checking"
    }

    // Return the known availability
    return timeSlotAvailability[key];
  }, [selectedDate, timeSlotAvailability, checkTimeSlotAvailability]);

  const handleServiceSelect = useCallback((services: { tvs: TVInstallation[], smartHome: SmartHomeInstallation[] }) => {
    setTvInstallations(services.tvs);
    setSmartHomeInstallations(services.smartHome);
  }, []);

  // Validate the customer details form data
  const validateCustomerDetails = useCallback(() => {
    // Create a subset of the bookingSchema with only the customer fields
    const customerSchema = bookingSchema.pick({
      name: true,
      email: true,
      phone: true,
      streetAddress: true,
      city: true,
      state: true,
      zipCode: true
    });

    // Validate the form data
    const result = customerSchema.safeParse(formData);

    if (!result.success) {
      // Extract error messages
      const fieldErrors = result.error.flatten().fieldErrors;
      setValidationErrors(fieldErrors);
      return false;
    }

    // Clear validation errors if validation succeeds
    setValidationErrors({});
    return true;
  }, [formData]);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0:
        return tvInstallations.length > 0 || smartHomeInstallations.length > 0;
      case 1:
        return selectedDate && selectedTime;
      case 2:
        // Now validation is handled by validateCustomerDetails
        return validateCustomerDetails();
      default:
        return true;
    }
  }, [currentStep, tvInstallations, smartHomeInstallations, selectedDate, selectedTime, validateCustomerDetails]);

  const handleSubmit = useCallback(() => {
    // Get selected services
    let serviceDescription = "";

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
  }, [tvInstallations, smartHomeInstallations, selectedDate, selectedTime, formData, onSubmit]);

  // Use passed bookings or fetched bookings as fallback
  const allBookings = existingBookings.length > 0 ? existingBookings : [];
  const isBookingsLoading = isLoadingBookings || isCalendarLoading;

  // Handle next button click with validation
  const handleNextClick = useCallback(() => {
    if (currentStep === 2) {
      // For customer details step, run validation explicitly
      if (validateCustomerDetails()) {
        setCurrentStep(3);
      }
      // If validation fails, the error state will be updated and errors displayed
    } else if (currentStep < steps.length - 1) {
      // For other steps, proceed normally
      setCurrentStep((prev) => prev + 1);
    } else {
      // For final step, submit the form
      handleSubmit();
    }
  }, [currentStep, handleSubmit, validateCustomerDetails]);

  return (
    <div className="space-y-8">
      {/* Progress Steps - Simplified */}
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`flex items-center ${
              index < steps.length - 1 ? "flex-1" : ""
            }`}
          >
            <div
              className={`w-6 h-6 rounded border flex items-center justify-center ${
                index <= currentStep
                  ? "border-primary bg-primary text-white"
                  : "border-gray-300 text-gray-300"
              }`}
            >
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-[1px] mx-2 ${
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
            <ServiceSelectionStep
              onServiceSelect={handleServiceSelect}
              onContinue={() => {
                // Move to next step after service selection is confirmed
                if (canProceed()) {
                  setCurrentStep(1);
                }
              }}
            />
          )}

          {currentStep === 1 && (
            <DateTimeSelectionStep
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              isBookingsLoading={isBookingsLoading}
              timeSlots={timeSlots}
              isTimeSlotAvailable={isTimeSlotAvailable}
            />
          )}

          {currentStep === 2 && (
            <CustomerDetailsStep
              formData={formData}
              setFormData={setFormData}
              validationErrors={validationErrors}
            />
          )}

          {currentStep === 3 && (
            <ReviewBookingStep
              tvInstallations={tvInstallations}
              smartHomeInstallations={smartHomeInstallations}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              formData={formData}
            />
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
              onClick={handleNextClick}
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