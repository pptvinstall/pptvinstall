import * as React from "react"
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion"
import { Calendar } from "./calendar"
import { TimeSlot } from "./time-slot"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./card"
import { ServiceWizard, type TVInstallation, type SmartHomeInstallation } from "./service-wizard"
import { PriceCalculator } from "./price-calculator"
import { Input } from "./input"
import { Textarea } from "./textarea"
import { Checkbox } from "./checkbox"
import { Label } from "./label"
import { format } from "date-fns"
import { useQuery } from '@tanstack/react-query';
import { useCalendarAvailability } from "@/hooks/use-calendar-availability";
import { createServiceDescription } from "@/lib/use-pricing"; // Added import for the new function
import { bookingSchema } from "@shared/schema";

// Environment variables
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
    <div className="space-y-2">
      <h3 className="text-lg font-medium">Select a Date</h3>
      <p className="text-sm text-muted-foreground">
        Choose a preferred date for your installation.
      </p>
    </div>

    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={(date) => {
        setSelectedDate(date);
        setSelectedTime(undefined); // Reset time when date changes
      }}
      className="rounded-md border mx-auto"
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
        className="space-y-4"
      >
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Select a Time Slot</h3>
          <p className="text-sm text-muted-foreground">
            Available time slots for {format(selectedDate, "EEEE, MMMM d, yyyy")}.
          </p>
        </div>

        {isBookingsLoading ? (
          <div className="text-center py-4 animate-pulse">
            <p className="text-muted-foreground">Loading available time slots...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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
  <div className="space-y-6">
    <div className="space-y-2">
      <h3 className="text-lg font-medium">Contact Information</h3>
      <p className="text-sm text-muted-foreground">
        Please provide your contact details so we can confirm your booking.
      </p>
    </div>

    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Your full name"
          className={validationErrors.name ? "border-red-500" : ""}
        />
        {validationErrors.name && (
          <p className="text-sm text-red-500">{validationErrors.name[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="your.email@example.com"
            className={validationErrors.email ? "border-red-500" : ""}
          />
          {validationErrors.email && (
            <p className="text-sm text-red-500">{validationErrors.email[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(123) 456-7890"
            className={validationErrors.phone ? "border-red-500" : ""}
          />
          {validationErrors.phone && (
            <p className="text-sm text-red-500">{validationErrors.phone[0]}</p>
          )}
        </div>
      </div>
    </div>

    <div className="space-y-2">
      <h3 className="text-lg font-medium">Installation Address</h3>
      <p className="text-sm text-muted-foreground">
        Where will we be performing the installation service?
      </p>
    </div>

    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="streetAddress">Street Address</Label>
        <Input
          id="streetAddress"
          value={formData.streetAddress}
          onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
          placeholder="123 Main Street"
          className={validationErrors.streetAddress ? "border-red-500" : ""}
        />
        {validationErrors.streetAddress && (
          <p className="text-sm text-red-500">{validationErrors.streetAddress[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
        <Input
          id="addressLine2"
          value={formData.addressLine2}
          onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
          placeholder="Apt, Suite, Unit, etc."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Atlanta"
            className={validationErrors.city ? "border-red-500" : ""}
          />
          {validationErrors.city && (
            <p className="text-sm text-red-500">{validationErrors.city[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            placeholder="GA"
            className={validationErrors.state ? "border-red-500" : ""}
          />
          {validationErrors.state && (
            <p className="text-sm text-red-500">{validationErrors.state[0]}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="zipCode">ZIP Code</Label>
        <Input
          id="zipCode"
          value={formData.zipCode}
          onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
          placeholder="30303"
          className={validationErrors.zipCode ? "border-red-500" : ""}
        />
        {validationErrors.zipCode && (
          <p className="text-sm text-red-500">{validationErrors.zipCode[0]}</p>
        )}
      </div>
    </div>

    <div className="space-y-2">
      <Label htmlFor="notes">Special Instructions (Optional)</Label>
      <Textarea
        id="notes"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        placeholder="Any specific instructions or details about the installation location"
        className="min-h-[100px]"
      />
    </div>

    <div className="flex items-start space-x-2">
      <Checkbox 
        id="consent" 
        checked={formData.consentToContact}
        onCheckedChange={(checked) => 
          setFormData({ ...formData, consentToContact: checked === true })
        }
      />
      <Label 
        htmlFor="consent" 
        className="text-sm leading-tight"
      >
        I consent to receive text messages about my appointment details, promotions, and service updates.
      </Label>
    </div>
  </div>
));

// Step 4 component - Review & Book
const ReviewBookingStep = React.memo(({
  tvInstallations,
  smartHomeInstallations,
  selectedDate,
  selectedTime,
  formData,
  pricingTotal
}: {
  tvInstallations: TVInstallation[];
  smartHomeInstallations: SmartHomeInstallation[];
  selectedDate: Date | undefined;
  selectedTime: string | undefined;
  formData: any;
  pricingTotal: number;
}) => (
  <div className="space-y-6">
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Installation Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <h4 className="text-sm font-medium">Date & Time</h4>
            <p className="text-sm mt-1">
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")} at <span className="font-medium">{selectedTime}</span>
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Total Price</h4>
            <p className="text-sm mt-1">
              <span className="font-medium">${pricingTotal}</span>
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium">Services</h4>
          <ul className="text-sm mt-1 space-y-1">
            {tvInstallations.map((tv, index) => (
              <li key={`tv-${index}`} className="pl-4 relative before:content-['•'] before:absolute before:left-0">
                TV {index + 1}: {tv.size === 'large' ? '56" or larger' : '32"-55"'} - {tv.location} 
                {tv.mountType !== 'none' && ` (${tv.mountType})`}
                {tv.masonryWall && ' on non-drywall surface'}
                {tv.outletRelocation && ' with outlet installation'}
              </li>
            ))}
            {smartHomeInstallations.map((device, index) => (
              <li key={`smart-${index}`} className="pl-4 relative before:content-['•'] before:absolute before:left-0">
                {device.type === 'doorbell' ? 'Smart Doorbell' :
                  device.type === 'floodlight' ? 'Smart Floodlight' :
                    'Smart Camera'} {device.quantity > 1 && `(${device.quantity})`}
                {device.type === 'camera' && device.mountHeight && device.mountHeight > 8 &&
                  ` at ${device.mountHeight}ft`}
                {device.type === 'doorbell' && device.brickInstallation && ' (on Brick)'}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <h4 className="text-sm font-medium">Name</h4>
            <p className="text-sm mt-1">{formData.name}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Phone</h4>
            <p className="text-sm mt-1">{formData.phone}</p>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium">Email</h4>
          <p className="text-sm mt-1">{formData.email}</p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Installation Address</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          {formData.streetAddress}<br />
          {formData.addressLine2 && <>{formData.addressLine2}<br /></>}
          {formData.city}, {formData.state} {formData.zipCode}
        </p>
      </CardContent>
    </Card>

    {formData.notes && (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Special Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{formData.notes}</p>
        </CardContent>
      </Card>
    )}

    <div className="text-sm space-y-2">
      <p>
        By clicking "Confirm Booking", you agree to our <a href="/terms" className="text-primary underline">Terms of Service</a> and acknowledge our <a href="/privacy" className="text-primary underline">Privacy Policy</a>.
      </p>
    </div>
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
  const [pricingTotal, setPricingTotal] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    streetAddress: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    notes: "",
    consentToContact: false
  });
  // State to track time slot availability
  const [timeSlotAvailability, setTimeSlotAvailability] = useState<Record<string, boolean>>({});
  // State for validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  // Auto-scroll to top when changing steps
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

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
        "10:00 AM",
        "11:00 AM",
        "12:00 PM",
        "1:00 PM",
        "2:00 PM",
        "3:00 PM",
        "4:00 PM",
        "5:00 PM",
        "6:00 PM",
        "7:00 PM"
      ];
    } else {
      // Weekday slots: 6:30 PM to 10:30 PM
      return [
        "5:30 PM",
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

  // Check time slot availability and update state - handles async Google Calendar checking
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

  // Check if a time slot is available - consults the local state for up-to-date availability
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

  // Update pricing totals
  const handlePricingUpdate = useCallback((total: number) => {
    setPricingTotal(total);
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

  // Check if user can proceed to next step
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0:
        return tvInstallations.length > 0 || smartHomeInstallations.length > 0;
      case 1:
        return selectedDate && selectedTime;
      case 2:
        // Don't call validateCustomerDetails directly here as it can cause infinite renders
        // Instead just check if the required fields have values
        return !!formData.name && !!formData.email && !!formData.phone &&
          !!formData.streetAddress && !!formData.city && !!formData.state && !!formData.zipCode;
      default:
        return true;
    }
  }, [currentStep, tvInstallations, smartHomeInstallations, selectedDate, selectedTime, formData]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    // Create service description using the utility function
    const serviceDescription = createServiceDescription(tvInstallations, smartHomeInstallations);

    // CRITICAL: Store the raw date value without any modification
    // We use yyyy-MM-dd format to ensure the date is preserved exactly as selected
    const rawDateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

    // Create lists of smart home items by type
    const smartHomeItems = smartHomeInstallations.flatMap(item => 
      Array(item.quantity).fill(item.type === 'doorbell' ? 'doorbell' : 
        item.type === 'floodlight' ? 'floodlight' : 'camera')
    );

    // Submit booking data with the raw time and date strings
    onSubmit({
      ...formData,
      serviceType: serviceDescription,
      preferredDate: rawDateString,
      appointmentTime: selectedTime, // Store raw time string directly
      smartHomeItems: smartHomeItems, // Add this for better tracking of selected services
      pricingTotal: pricingTotal,
      pricingBreakdown: tvInstallations.map(tv => ({
        type: 'tv',
        size: tv.size,
        location: tv.location,
        mountType: tv.mountType,
        masonryWall: tv.masonryWall,
        outletRelocation: tv.outletRelocation
      })).concat(
        smartHomeInstallations.map(item => ({
          type: item.type,
          quantity: item.quantity,
          mountHeight: item.mountHeight,
          brickInstallation: item.brickInstallation
        }))
      )
    });
  }, [tvInstallations, smartHomeInstallations, selectedDate, selectedTime, formData, onSubmit, pricingTotal]);

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
      {/* Progress Steps */}
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`flex items-center ${
              index < steps.length - 1 ? "flex-1" : ""
            }`}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ 
                scale: index <= currentStep ? 1 : 0.9,
                opacity: index <= currentStep ? 1 : 0.5
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                index <= currentStep
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {index + 1}
            </motion.div>
            <div className="ml-2 hidden sm:block">
              <p className={`text-sm font-medium ${
                index <= currentStep ? "text-foreground" : "text-muted-foreground"
              }`}>
                {step}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-[2px] mx-2 ${
                  index < currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="md:col-span-3 p-6">
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
              pricingTotal={pricingTotal}
            />
          )}
        </Card>

        <div className="md:col-span-2 space-y-6">
          <PriceCalculator
            tvs={tvInstallations}
            smartHome={smartHomeInstallations}
            distance={0} // Default distance, could be calculated based on zip code
            onUpdate={handlePricingUpdate}
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
                ? "Processing..."
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