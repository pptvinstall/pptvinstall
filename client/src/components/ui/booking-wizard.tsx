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

  // Time slots available (9 AM to 4 PM)
  const timeSlots = [
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "01:00 PM",
    "02:00 PM",
    "03:00 PM",
    "04:00 PM",
  ];

  const isTimeSlotAvailable = (time: string) => {
    if (!selectedDate) return false;
    return !existingBookings.some(booking =>
      booking?.preferredDate?.includes(time)
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
    // Create a condensed service description that fits within 50 characters
    const numTVs = tvInstallations.length;
    const numSmartDevices = smartHomeInstallations.length;

    let serviceDescription = "";
    if (numTVs > 0) {
      serviceDescription += `${numTVs} TV${numTVs > 1 ? 's' : ''}`;
    }
    if (numSmartDevices > 0) {
      if (serviceDescription) serviceDescription += " + ";
      serviceDescription += `${numSmartDevices} Smart Device${numSmartDevices > 1 ? 's' : ''}`;
    }

    onSubmit({
      ...formData,
      serviceType: serviceDescription,
      preferredDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      preferredTime: selectedTime
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
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return (
                    date < today ||
                    date.getDay() === 0 ||
                    date.getDay() === 6
                  );
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
                {isSubmitting ? "Booking..." : "Confirm Booking"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}