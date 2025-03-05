import * as React from "react";
import { useState } from "react";
import { Button } from "./button";
import { Card, CardContent } from "./card";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { format } from "date-fns";
import { Calendar } from "./calendar";
import { LoadingSpinner } from "@/components/loading-spinner";

interface BookingFormData {
  name: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
  serviceType?: string;
  preferredDate?: string;
  preferredTime?: string;
}

interface BookingWizardProps {
  onSubmit: (data: BookingFormData) => void;
  isSubmitting: boolean;
}

const SERVICES = [
  { id: 'tv-mounting', name: 'TV Mounting', price: 99.99 },
  { id: 'security-camera', name: 'Security Camera', price: 79.99 }
];

const TIME_SLOTS = [
  "9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", 
  "2:00 PM", "3:00 PM", "4:00 PM"
];

export function BookingWizard({ onSubmit, isSubmitting }: BookingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState<BookingFormData>({
    name: "",
    email: "",
    phone: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    notes: ""
  });

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      serviceType: SERVICES.find(s => s.id === selectedService)?.name || '',
      preferredDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      preferredTime: selectedTime
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedService !== "";
      case 1: return selectedDate && selectedTime;
      case 2:
        return formData.name && formData.email && formData.phone && 
               formData.streetAddress && formData.city && formData.state && formData.zipCode;
      default: return true;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card className="p-6">
        {currentStep === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Select a Service</h2>
            <div className="grid gap-4">
              {SERVICES.map(service => (
                <div
                  key={service.id}
                  className={`p-4 border rounded cursor-pointer ${
                    selectedService === service.id ? 'border-primary bg-primary/10' : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedService(service.id)}
                >
                  <div className="flex justify-between items-center">
                    <span>{service.name}</span>
                    <span>${service.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Select Date & Time</h2>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              disabled={(date) => date < new Date()}
            />
            {selectedDate && (
              <div className="space-y-2">
                <h3 className="font-medium">Available Time Slots</h3>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_SLOTS.map((time) => (
                    <button
                      key={time}
                      className={`p-2 text-center border rounded ${
                        selectedTime === time ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                      }`}
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Your Details</h2>
            <div className="space-y-4">
              <Input
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                placeholder="Street Address"
                value={formData.streetAddress}
                onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
                <Input
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
                <Input
                  placeholder="ZIP"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                />
              </div>
              <Textarea
                placeholder="Additional Notes (Optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => prev - 1)}
            disabled={currentStep === 0}
          >
            Back
          </Button>
          <Button
            onClick={currentStep === 2 ? handleSubmit : () => setCurrentStep((prev) => prev + 1)}
            disabled={!canProceed() || (currentStep === 2 && isSubmitting)}
          >
            {currentStep === 2 ? (
              isSubmitting ? (
                <div className="flex items-center">
                  <LoadingSpinner />
                  <span className="ml-2">Booking...</span>
                </div>
              ) : (
                "Complete Booking"
              )
            ) : (
              "Next"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}