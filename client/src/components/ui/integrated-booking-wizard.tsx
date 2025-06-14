import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { 
  CalendarIcon, Clock, MinusCircle, User, Home, Mail, Phone, 
  ChevronRight, ChevronLeft, CheckCircle, Settings2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useBusinessHours } from "@/hooks/use-business-hours";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { Checkbox } from "./checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { BookingConfirmationModal } from "./booking-confirmation-modal";
import { StickyBookingSummary } from './sticky-summary-bar';

// Type definitions
interface TVServiceOption {
  id: string;
  size: 'small' | 'large';
  location: 'standard' | 'fireplace';
  mountType: 'fixed' | 'tilting' | 'full_motion' | 'customer';
  masonryWall: boolean;
  highRise: boolean;
  outletNeeded: boolean;
  outletImage?: string;
}

interface SmartHomeDeviceOption {
  id: string;
  type: 'camera' | 'doorbell' | 'floodlight' | 'other';
  count: number;
  hasExistingWiring?: boolean;
}

interface TVDeinstallationOption {
  id: string;
  count: number;
  includesRemount: boolean;
  notes: string;
}

// Fixed pricing calculation - consistent across all screens
const calculateServicePrice = (service: TVServiceOption | SmartHomeDeviceOption | TVDeinstallationOption): number => {
  if ('size' in service) {
    // TV Installation
    let basePrice = 150;
    if (service.masonryWall) basePrice += 50;
    if (service.highRise) basePrice += 25;
    if (service.outletNeeded) basePrice += 75;
    return basePrice;
  } else if ('type' in service && service.type) {
    // Smart Home Device
    return 50 * (service.count || 1);
  } else if ('count' in service) {
    // TV Removal - FIXED at $50 flat rate consistently
    return 50 * service.count;
  }
  return 0;
};

const calculateTotalPrice = (tvServices: TVServiceOption[], smartHomeServices: SmartHomeDeviceOption[], deinstallationServices: TVDeinstallationOption[]): number => {
  let total = 0;
  
  tvServices.forEach(service => {
    total += calculateServicePrice(service);
  });
  
  smartHomeServices.forEach(service => {
    total += calculateServicePrice(service);
  });
  
  deinstallationServices.forEach(service => {
    total += calculateServicePrice(service);
  });
  
  return total;
};

// Time formatting function for consistent 12-hour format (Atlanta timezone)
const formatTime12Hour = (timeString: string): string => {
  try {
    const [hours, minutes] = timeString.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  } catch {
    return timeString;
  }
};

// Generate time slots in 12-hour format
const generateTimeSlots = (startTime: string, endTime: string): string[] => {
  const slots = [];
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  
  const current = new Date(start);
  while (current <= end) {
    const timeStr = current.toTimeString().slice(0, 5);
    slots.push(formatTime12Hour(timeStr));
    current.setMinutes(current.getMinutes() + 30);
  }
  
  return slots;
};

export function IntegratedBookingWizard() {
  const { toast } = useToast();
  const { businessHours = [], isLoading: businessHoursLoading } = useBusinessHours();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(0);
  
  // Service selections
  const [tvServices, setTvServices] = useState<TVServiceOption[]>([]);
  const [smartHomeServices, setSmartHomeServices] = useState<SmartHomeDeviceOption[]>([]);
  const [deinstallationServices, setDeinstallationServices] = useState<TVDeinstallationOption[]>([]);
  
  // Date and time selection
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  
  // Form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    streetAddress: "",
    addressLine2: "",
    city: "",
    state: "GA",
    zipCode: "",
    notes: "",
    consentToContact: false,
  });
  
  // Modal states
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate total price - consistent pricing across all screens
  const totalPrice = useMemo(() => {
    return calculateTotalPrice(tvServices, smartHomeServices, deinstallationServices);
  }, [tvServices, smartHomeServices, deinstallationServices]);

  // Service handlers
  const handleServiceRemoval = (type: "tv" | "smartHome" | "deinstallation", id: string) => {
    if (type === "tv") {
      setTvServices(prev => prev.filter(service => service.id !== id));
    } else if (type === "smartHome") {
      setSmartHomeServices(prev => prev.filter(service => service.id !== id));
    } else if (type === "deinstallation") {
      setDeinstallationServices(prev => prev.filter(service => service.id !== id));
    }
  };

  // Generate time slots based on selected date
  useEffect(() => {
    if (selectedDate && businessHours.length > 0) {
      const dayOfWeek = selectedDate.getDay();
      const businessHour = businessHours.find((bh: any) => bh.dayOfWeek === dayOfWeek);

      if (businessHour && businessHour.isAvailable) {
        const slots = generateTimeSlots(
          businessHour.startTime || "09:00",
          businessHour.endTime || "17:00"
        );
        setTimeSlots(slots);

        // Auto-select first available time if none selected
        if (slots.length > 0 && !selectedTime) {
          setSelectedTime(slots[0]);
        }
      } else {
        setTimeSlots([]);
      }
    }
  }, [selectedDate, businessHours, selectedTime]);

  const formatPrice = (price: number) => {
    return `$${price.toFixed(0)}`;
  };

  // Navigation handlers
  const canProceedToNext = () => {
    switch (currentStep) {
      case 0:
        return tvServices.length > 0 || smartHomeServices.length > 0 || deinstallationServices.length > 0;
      case 1:
        return selectedDate && selectedTime;
      case 2:
        return formData.name && formData.email && formData.phone && 
               formData.streetAddress && formData.city && formData.state && 
               formData.zipCode && formData.consentToContact;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowConfirmationModal(true);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Quick service selection handlers
  const addTVRemovalService = () => {
    const newService: TVDeinstallationOption = {
      id: `removal-${Date.now()}`,
      count: 1,
      includesRemount: false,
      notes: "TV Removal Service"
    };
    setDeinstallationServices(prev => [...prev, newService]);
  };

  const addTVInstallService = () => {
    const newService: TVServiceOption = {
      id: `tv-${Date.now()}`,
      size: 'small',
      location: 'standard',
      mountType: 'fixed',
      masonryWall: false,
      highRise: false,
      outletNeeded: false
    };
    setTvServices(prev => [...prev, newService]);
  };

  const addSmartHomeService = () => {
    const newService: SmartHomeDeviceOption = {
      id: `smart-${Date.now()}`,
      type: 'camera',
      count: 1,
      hasExistingWiring: true
    };
    setSmartHomeServices(prev => [...prev, newService]);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4 pb-32">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="shadow-xl border-0 overflow-visible">
                <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-6">
                  <CardTitle className="text-2xl font-bold">
                    Book Your Service
                  </CardTitle>
                  <CardDescription className="text-blue-100">
                    Step {currentStep + 1} of 4
                  </CardDescription>

                  {/* Progress bar */}
                  <div className="w-full bg-blue-400/30 rounded-full h-2 mt-4">
                    <div 
                      className="bg-white h-2 rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${((currentStep + 1) / 4) * 100}%` }}
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {/* Step 1: Service Selection - NO SCROLL BOXES */}
                  {currentStep === 0 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium">Select Your Services</h3>
                        <p className="text-sm text-muted-foreground">
                          Choose the services you need - prices shown are final
                        </p>
                      </div>

                      {/* Quick Service Selection - Full Height, No Scroll */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={addTVInstallService}>
                          <CardContent className="p-4 text-center">
                            <Settings2 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                            <h4 className="font-medium">TV Installation</h4>
                            <p className="text-sm text-muted-foreground">Starting at $150</p>
                          </CardContent>
                        </Card>

                        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={addSmartHomeService}>
                          <CardContent className="p-4 text-center">
                            <Home className="h-8 w-8 mx-auto mb-2 text-green-600" />
                            <h4 className="font-medium">Smart Home Setup</h4>
                            <p className="text-sm text-muted-foreground">$50 per device</p>
                          </CardContent>
                        </Card>

                        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={addTVRemovalService}>
                          <CardContent className="p-4 text-center">
                            <MinusCircle className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                            <h4 className="font-medium">TV Removal</h4>
                            <p className="text-sm text-muted-foreground">$50 flat rate</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Selected Services Display - Full Page Height */}
                      {(tvServices.length > 0 || smartHomeServices.length > 0 || deinstallationServices.length > 0) && (
                        <div className="space-y-4">
                          <Separator />
                          <h4 className="text-sm font-medium">Selected Services:</h4>

                          {/* TV Installations */}
                          {tvServices.map((tv) => (
                            <div key={tv.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                              <div>
                                <div className="font-medium">TV Installation - {tv.size} ({tv.location})</div>
                                <div className="text-sm text-gray-600">
                                  {tv.masonryWall && "Masonry wall, "}
                                  {tv.highRise && "High-rise, "}
                                  {tv.outletNeeded && "Outlet needed, "}
                                  Mount: {tv.mountType}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-blue-600">{formatPrice(calculateServicePrice(tv))}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleServiceRemoval("tv", tv.id)}
                                >
                                  <MinusCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          {/* Smart Home Devices */}
                          {smartHomeServices.map((device) => (
                            <div key={device.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                              <div>
                                <div className="font-medium">Smart Home - {device.type}</div>
                                <div className="text-sm text-gray-600">Quantity: {device.count}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-green-600">{formatPrice(calculateServicePrice(device))}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleServiceRemoval("smartHome", device.id)}
                                >
                                  <MinusCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          {/* TV Removals */}
                          {deinstallationServices.map((removal) => (
                            <div key={removal.id} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                              <div>
                                <div className="font-medium">TV Removal Service</div>
                                <div className="text-sm text-gray-600">Quantity: {removal.count}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-orange-600">{formatPrice(calculateServicePrice(removal))}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleServiceRemoval("deinstallation", removal.id)}
                                >
                                  <MinusCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          <Separator />

                          {/* Total - Consistent Pricing */}
                          <div className="bg-muted p-3 rounded-md flex justify-between items-center">
                            <span className="font-medium">Total:</span>
                            <span className="text-xl font-bold text-blue-600">{formatPrice(totalPrice)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Date & Time Selection - NO SCROLL BOXES */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium">Select Date & Time</h3>
                        <p className="text-sm text-muted-foreground">
                          Choose your preferred appointment date and time (Atlanta timezone)
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Date Selection */}
                        <div>
                          <Label>Preferred Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal mt-1",
                                  !selectedDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Time Selection - 12-hour format */}
                        <div>
                          <Label>Preferred Time (Atlanta time)</Label>
                          <Select value={selectedTime} onValueChange={setSelectedTime}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select a time" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {timeSlots.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {selectedDate && selectedTime && (
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="font-medium">Appointment Scheduled</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {format(selectedDate, "EEEE, MMMM do, yyyy")} at {selectedTime}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3: Contact Information - NO SCROLL BOXES */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium">Contact Information</h3>
                        <p className="text-sm text-muted-foreground">
                          Please provide your contact details
                        </p>
                      </div>

                      {/* Personal Information */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="John Doe"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="phone">Phone Number *</Label>
                            <Input
                              id="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="(555) 123-4567"
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="email">Email Address *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="john@example.com"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Address Information */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="streetAddress">Street Address *</Label>
                          <Input
                            id="streetAddress"
                            value={formData.streetAddress}
                            onChange={(e) => setFormData(prev => ({ ...prev, streetAddress: e.target.value }))}
                            placeholder="123 Main St"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="addressLine2">Apartment/Unit (Optional)</Label>
                          <Input
                            id="addressLine2"
                            value={formData.addressLine2}
                            onChange={(e) => setFormData(prev => ({ ...prev, addressLine2: e.target.value }))}
                            placeholder="Apt 4B"
                            className="mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="city">City *</Label>
                            <Input
                              id="city"
                              value={formData.city}
                              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                              placeholder="Atlanta"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="state">State *</Label>
                            <Select
                              value={formData.state}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="GA" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectItem value="GA">Georgia</SelectItem>
                                  <SelectItem value="AL">Alabama</SelectItem>
                                  <SelectItem value="FL">Florida</SelectItem>
                                  <SelectItem value="SC">South Carolina</SelectItem>
                                  <SelectItem value="NC">North Carolina</SelectItem>
                                  <SelectItem value="TN">Tennessee</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="zipCode">ZIP Code *</Label>
                          <Input
                            id="zipCode"
                            value={formData.zipCode}
                            onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                            placeholder="30309"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Additional Notes */}
                      <div>
                        <Label htmlFor="notes">Additional Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Any special instructions or details..."
                          className="mt-1"
                          rows={3}
                        />
                      </div>

                      {/* Consent */}
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="consent"
                          checked={formData.consentToContact}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, consentToContact: !!checked }))}
                        />
                        <Label htmlFor="consent" className="text-sm leading-relaxed">
                          I consent to be contacted about this service request and agree to the terms of service. *
                        </Label>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Review & Confirm - NO SCROLL BOXES */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium">Review Your Booking</h3>
                        <p className="text-sm text-muted-foreground">
                          Please review all details before confirming
                        </p>
                      </div>

                      {/* Services Summary */}
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Settings2 className="h-4 w-4" />
                            Selected Services
                          </h4>
                          <div className="space-y-2">
                            {tvServices.map((service) => (
                              <div key={service.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                <div>
                                  <div className="font-medium">TV Installation - {service.size} ({service.location})</div>
                                  <div className="text-sm text-gray-600">
                                    {service.masonryWall && "Masonry wall, "}
                                    {service.highRise && "High-rise, "}
                                    {service.outletNeeded && "Outlet needed, "}
                                    Mount: {service.mountType}
                                  </div>
                                </div>
                                <span className="font-semibold text-blue-600">{formatPrice(calculateServicePrice(service))}</span>
                              </div>
                            ))}

                            {smartHomeServices.map((service) => (
                              <div key={service.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                <div>
                                  <div className="font-medium">Smart Home - {service.type}</div>
                                  <div className="text-sm text-gray-600">Quantity: {service.count}</div>
                                </div>
                                <span className="font-semibold text-green-600">{formatPrice(calculateServicePrice(service))}</span>
                              </div>
                            ))}

                            {deinstallationServices.map((service) => (
                              <div key={service.id} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                                <div>
                                  <div className="font-medium">TV Removal Service</div>
                                  <div className="text-sm text-gray-600">Quantity: {service.count}</div>
                                </div>
                                <span className="font-semibold text-orange-600">{formatPrice(calculateServicePrice(service))}</span>
                              </div>
                            ))}

                            <Separator />
                            <div className="flex justify-between items-center font-bold text-lg bg-blue-50 p-3 rounded-lg">
                              <span>Total:</span>
                              <span className="text-blue-600">{formatPrice(totalPrice)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Appointment Details */}
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            Appointment Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-gray-500" />
                              <span>{selectedDate ? format(selectedDate, "EEEE, MMMM do, yyyy") : "No date selected"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <span>{selectedTime || "No time selected"} (Atlanta time)</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <Home className="h-4 w-4 text-gray-500 mt-0.5" />
                              <span>
                                {formData.streetAddress}
                                {formData.addressLine2 && `, ${formData.addressLine2}`}
                                <br />
                                {formData.city}, {formData.state} {formData.zipCode}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Customer Information */}
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Customer Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span>{formData.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-500" />
                              <span>{formData.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <span>{formData.phone}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>

                {/* Navigation */}
                <CardFooter className="flex justify-between p-6 bg-gray-50">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Step {currentStep + 1} of 4
                    </span>
                  </div>

                  <Button
                    onClick={handleNext}
                    disabled={!canProceedToNext()}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {currentStep === 3 ? "Review Booking" : "Next"}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky Summary Bar */}
      <StickyBookingSummary
        selectedServices={[
          ...tvServices.map(tv => ({
            id: tv.id,
            name: `TV Installation - ${tv.size} (${tv.location})`,
            price: calculateServicePrice(tv),
            type: 'TV Installation'
          })),
          ...smartHomeServices.map(device => ({
            id: device.id,
            name: `Smart Home Device - ${device.type}`,
            price: calculateServicePrice(device),
            type: 'Smart Home'
          })),
          ...deinstallationServices.map(removal => ({
            id: removal.id,
            name: `TV Removal Service`,
            price: calculateServicePrice(removal),
            type: 'Removal'
          }))
        ]}
        totalPrice={totalPrice}
        onProceed={() => setCurrentStep(1)}
        isVisible={currentStep === 0 && (tvServices.length > 0 || smartHomeServices.length > 0 || deinstallationServices.length > 0)}
      />

      {/* Booking Confirmation Modal */}
      {showConfirmationModal && (
        <BookingConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
          bookingData={{
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            streetAddress: formData.streetAddress,
            addressLine2: formData.addressLine2,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
            preferredDate: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
            appointmentTime: selectedTime || "",
            pricingTotal: totalPrice,
            services: [
              ...tvServices.map(tv => ({
                id: tv.id,
                name: `TV Installation - ${tv.size} (${tv.location})`,
                price: calculateServicePrice(tv),
                type: 'TV Installation'
              })),
              ...smartHomeServices.map(device => ({
                id: device.id,
                name: `Smart Home Device - ${device.type}`,
                price: calculateServicePrice(device),
                type: 'Smart Home'
              })),
              ...deinstallationServices.map(removal => ({
                id: removal.id,
                name: `TV Removal Service`,
                price: calculateServicePrice(removal),
                type: 'Removal'
              }))
            ],
            tvInstallations: tvServices.map(tv => ({
              size: tv.size,
              location: tv.location,
              mountType: tv.mountType,
              masonryWall: tv.masonryWall,
              highRise: tv.highRise,
              outletRelocation: tv.outletNeeded,
              outletImage: tv.outletImage
            })),
            smartHomeInstallations: smartHomeServices.map(device => ({
              deviceType: device.type,
              location: 'Indoor'
            }))
          }}
          onConfirm={async () => {
            try {
              const bookingData = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                streetAddress: formData.streetAddress,
                addressLine2: formData.addressLine2,
                city: formData.city,
                state: formData.state,
                zipCode: formData.zipCode,
                preferredDate: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
                appointmentTime: selectedTime || "",
                serviceType: tvServices.length > 0 ? "TV Installation" : "Smart Home Installation",
                pricingTotal: totalPrice.toString(),
                notes: formData.notes,
                consentToContact: formData.consentToContact,
                pricingBreakdown: [
                  ...tvServices.map(tv => ({
                    service: `TV Installation - ${tv.size} (${tv.location})`,
                    price: calculateServicePrice(tv)
                  })),
                  ...smartHomeServices.map(device => ({
                    service: `Smart Home Device - ${device.type}`,
                    price: calculateServicePrice(device)
                  })),
                  ...deinstallationServices.map(removal => ({
                    service: `TV Removal Service`,
                    price: calculateServicePrice(removal)
                  }))
                ]
              };

              setIsSubmitting(true);
              
              const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingData),
              });

              if (response.ok) {
                toast({
                  title: "Booking Confirmed!",
                  description: "We'll contact you within 24 hours to confirm your appointment.",
                });
                setShowConfirmationModal(false);
                // Reset form or redirect
              } else {
                throw new Error('Failed to create booking');
              }
            } catch (error) {
              console.error('Booking error:', error);
              toast({
                title: "Booking Error",
                description: "There was an issue creating your booking. Please try again.",
                variant: "destructive",
              });
            } finally {
              setIsSubmitting(false);
            }
          }}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
}