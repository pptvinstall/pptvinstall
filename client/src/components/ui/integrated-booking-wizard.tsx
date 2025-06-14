import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { 
  CalendarIcon, Plus, Clock, MinusCircle, User, Home, Mail, Phone, 
  Info, Minus, PlusCircle, AlertTriangle, HelpCircle, ChevronRight,
  ChevronLeft, CheckCircle, Settings2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { pricing } from "@/lib/pricing";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Separator } from "@/components/ui/separator";
import { useBusinessHours } from "@/hooks/use-business-hours";
import { ScrollArea } from "./scroll-area";
import { ServiceSelectionGrid } from "./service-selection-grid";
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
import { Badge } from "./badge";
import { motion, AnimatePresence } from "framer-motion";
import { BookingConfirmationModal } from "./booking-confirmation-modal";
import { StickyBookingSummary } from "./sticky-summary-bar";

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
  type: 'doorbell' | 'camera' | 'floodlight';
  count: number;
  hasExistingWiring?: boolean;
}

interface TVDeinstallationOption {
  id: string;
  tvSize: 'small' | 'large';
  wallType: 'standard' | 'brick' | 'highrise';
  cableCleanup: boolean;
  basePrice: number;
}

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
  consentToContact: boolean;
  createAccount: boolean;
  password: string;
  confirmPassword: string;
}

type IntegratedBookingWizardProps = {
  onSubmit: (data: any) => Promise<any>;
  isSubmitting: boolean;
  existingBookings?: any[];
  isLoadingBookings?: boolean;
};

export function IntegratedBookingWizard({
  onSubmit,
  isSubmitting,
  existingBookings = [],
  isLoadingBookings = false
}: IntegratedBookingWizardProps) {
  const { toast } = useToast();
  const { businessHours } = useBusinessHours();

  // Step management
  const [currentStep, setCurrentStep] = useState(0);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  // Service selections
  const [tvServices, setTvServices] = useState<TVServiceOption[]>([]);
  const [smartHomeServices, setSmartHomeServices] = useState<SmartHomeDeviceOption[]>([]);
  const [deinstallationServices, setDeinstallationServices] = useState<TVDeinstallationOption[]>([]);

  // Date and time
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  // Form data
  const [formData, setFormData] = useState<BookingFormData>({
    name: "",
    email: "",
    phone: "",
    streetAddress: "",
    addressLine2: "",
    city: "",
    state: "Georgia",
    zipCode: "",
    notes: "",
    consentToContact: false,
    createAccount: false,
    password: "",
    confirmPassword: ""
  });

  // Calculate total price
  const calculateTotalPrice = useCallback(() => {
    let total = 0;

    // TV installation pricing - simple calculation
    tvServices.forEach(tv => {
      let price = 100; // Base price
      
      // Mount type pricing
      if (tv.mountType === "tilting") {
        price += tv.size === "large" ? 50 : 40;
      } else if (tv.mountType === "full_motion") {
        price += tv.size === "large" ? 80 : 60;
      } else if (tv.mountType === "fixed") {
        price += tv.size === "large" ? 40 : 30;
      }
      // customer_provided adds $0
      
      // Location surcharge
      if (tv.location === "fireplace") price += 100;
      
      // Add-ons
      if (tv.masonryWall) price += 50;
      if (tv.highRise) price += 25;
      if (tv.outletNeeded) price += 100;
      
      total += price;
    });

    // Smart home pricing
    smartHomeServices.forEach(device => {
      total += pricing.calculateSmartHomeInstallation({
        type: device.type,
        count: device.count,
        hasExistingWiring: device.hasExistingWiring
      });
    });

    // Deinstallation pricing
    deinstallationServices.forEach(service => {
      total += service.basePrice;
    });

    return total;
  }, [tvServices, smartHomeServices, deinstallationServices]);

  // Service handlers
  const handleServiceSelection = (type: "tv" | "smartHome" | "deinstallation", service: any) => {
    if (type === "tv") {
      setTvServices(prev => [...prev, { ...service, id: `tv-${Date.now()}` }]);
    } else if (type === "smartHome") {
      setSmartHomeServices(prev => [...prev, { ...service, id: `smart-${Date.now()}` }]);
    } else if (type === "deinstallation") {
      setDeinstallationServices(prev => [...prev, { ...service, id: `deinstall-${Date.now()}` }]);
    }
  };

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
        const slots = [];
        const startTime = businessHour.startTime || "09:00";
        const endTime = businessHour.endTime || "17:00";
        
        // Generate common time slots
        const commonTimes = ["10:00", "12:30", "15:00", "17:30"];
        
        // Filter times that fall within business hours
        commonTimes.forEach(time => {
          const [hour] = time.split(':').map(Number);
          const [startHour] = startTime.split(':').map(Number);
          const [endHour] = endTime.split(':').map(Number);
          
          if (hour >= startHour && hour <= endHour - 2) { // -2 for 2-hour service window
            slots.push(time);
          }
        });
        
        // If no common times fit, generate 2-hour intervals within business hours
        if (slots.length === 0) {
          const [startHour, startMin] = startTime.split(':').map(Number);
          const [endHour, endMin] = endTime.split(':').map(Number);
          
          let currentHour = startHour;
          let currentMin = startMin;
          
          while (currentHour < endHour || (currentHour === endHour && currentMin <= endMin - 120)) {
            const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
            slots.push(timeString);
            
            // Add 2 hours
            currentMin += 120;
            if (currentMin >= 60) {
              currentHour += Math.floor(currentMin / 60);
              currentMin = currentMin % 60;
            }
            
            // Stop if we exceed business hours
            if (currentHour > endHour || (currentHour === endHour && currentMin > endMin)) break;
          }
        }
        
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

  // Get pricing total
  const pricingTotal = useMemo(() => calculateTotalPrice(), [calculateTotalPrice]);

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
              <Card className="shadow-xl border-0 overflow-hidden">
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

              <CardContent className="space-y-6">
                {/* Step 1: Service Selection */}
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium">Select Your Services</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose the services you need
                      </p>
                    </div>

                    <ServiceSelectionGrid
                      onServiceAdd={handleServiceSelection}
                      services={[]}
                      isLoading={false}
                    />

                    {/* Service Selection Summary */}
                    <div className="mt-6 space-y-3">
                      <Separator />
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium">Total Selected:</h4>
                        <div>
                          <Badge variant="outline" className="mr-2">{tvServices.length} TV{tvServices.length !== 1 ? 's' : ''}</Badge>
                          <Badge variant="outline" className="mr-2">{smartHomeServices.length} Device{smartHomeServices.length !== 1 ? 's' : ''}</Badge>
                          <Badge variant="outline">{deinstallationServices.length} Removal{deinstallationServices.length !== 1 ? 's' : ''}</Badge>
                        </div>
                      </div>
                      <div className="bg-muted p-3 rounded-md flex justify-between items-center">
                        <span className="font-medium">Estimated Total:</span>
                        <span className="text-xl font-bold">{formatPrice(pricingTotal)}</span>
                      </div>
                      {deinstallationServices.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Includes {deinstallationServices.length} TV de-installation{deinstallationServices.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    {/* Selected Services List */}
                    {(tvServices.length > 0 || smartHomeServices.length > 0 || deinstallationServices.length > 0) && (
                      <div className="space-y-4">
                        <Separator />
                        <h4 className="text-sm font-medium">Selected Services:</h4>
                        
                        {/* TV Services */}
                        {tvServices.map((service, index) => (
                          <div key={service.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                            <div>
                              <p className="font-medium">TV Installation {index + 1}</p>
                              <p className="text-sm text-muted-foreground">
                                {service.size === 'large' ? '56" or larger' : '32"-55"'} • {service.location === 'fireplace' ? 'Over Fireplace' : 'Standard Wall'}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleServiceRemoval("tv", service.id)}
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                        {/* Smart Home Services */}
                        {smartHomeServices.map((service, index) => (
                          <div key={service.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                            <div>
                              <p className="font-medium">Smart {service.type.charAt(0).toUpperCase() + service.type.slice(1)}</p>
                              <p className="text-sm text-muted-foreground">
                                Quantity: {service.count}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleServiceRemoval("smartHome", service.id)}
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                        {/* Deinstallation Services */}
                        {deinstallationServices.map((service, index) => (
                          <div key={service.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                            <div>
                              <p className="font-medium">TV De-installation</p>
                              <p className="text-sm text-muted-foreground">
                                {service.tvSize === 'large' ? '56" or larger' : '32"-55"'} • ${service.basePrice}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleServiceRemoval("deinstallation", service.id)}
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Date & Time Selection */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium">Select Date & Time</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose your preferred appointment date and time
                      </p>
                    </div>

                    {/* Date Selection */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Select Date</h4>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
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
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              return date < today;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Time Selection */}
                    {selectedDate && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Select Time</h4>
                        {timeSlots.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {timeSlots.map((slot) => (
                              <Button
                                key={slot}
                                variant={selectedTime === slot ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedTime(slot)}
                                className="text-xs"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                {slot}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No available time slots for this date</p>
                            <p className="text-sm">Please select a different date</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Customer Information */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium">Customer Information</h3>
                      <p className="text-sm text-muted-foreground">
                        Please provide your contact and address details
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Personal Information */}
                      <div className="space-y-4">
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

                        <div>
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => {
                              // Auto-format phone number
                              let value = e.target.value.replace(/\D/g, '');
                              if (value.length >= 6) {
                                value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
                              } else if (value.length >= 3) {
                                value = value.replace(/(\d{3})(\d{3})/, '($1) $2');
                              } else if (value.length > 0) {
                                value = value.replace(/(\d{3})/, '($1)');
                              }
                              setFormData(prev => ({ ...prev, phone: value }));
                            }}
                            placeholder="(555) 123-4567"
                            className="mt-1"
                            maxLength={14}
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
                    </div>

                    {/* Additional Notes */}
                    <div>
                      <Label htmlFor="notes">Additional Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any special instructions or requirements..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    {/* Consent */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="consent"
                          checked={formData.consentToContact}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, consentToContact: checked === true }))}
                        />
                        <Label htmlFor="consent" className="text-sm">
                          I consent to be contacted about this service request
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="createAccount"
                          checked={formData.createAccount}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, createAccount: checked === true }))}
                        />
                        <Label htmlFor="createAccount" className="text-sm">
                          Create customer account for faster future bookings
                        </Label>
                      </div>

                      {formData.createAccount && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                          <div>
                            <Label htmlFor="password">Password *</Label>
                            <Input
                              id="password"
                              type="password"
                              value={formData.password}
                              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                              placeholder="Choose a secure password"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="confirmPassword">Confirm Password *</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={formData.confirmPassword}
                              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              placeholder="Confirm your password"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 4: Review & Submit */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium">Review Your Booking</h3>
                      <p className="text-sm text-muted-foreground">
                        Please review all details before submitting
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Services Summary */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Selected Services</h4>
                        {tvServices.map((service, index) => (
                          <div key={service.id} className="p-3 bg-muted rounded-md">
                            <p className="font-medium">TV Installation {index + 1}</p>
                            <p className="text-sm text-muted-foreground">
                              {service.size === 'large' ? '56" or larger' : '32"-55"'} • {service.location === 'fireplace' ? 'Over Fireplace' : 'Standard Wall'}
                            </p>
                          </div>
                        ))}
                        {smartHomeServices.map((service, index) => (
                          <div key={service.id} className="p-3 bg-muted rounded-md">
                            <p className="font-medium">Smart {service.type.charAt(0).toUpperCase() + service.type.slice(1)}</p>
                            <p className="text-sm text-muted-foreground">Quantity: {service.count}</p>
                          </div>
                        ))}
                        {deinstallationServices.map((service, index) => (
                          <div key={service.id} className="p-3 bg-muted rounded-md">
                            <p className="font-medium">TV De-installation</p>
                            <p className="text-sm text-muted-foreground">${service.basePrice}</p>
                          </div>
                        ))}
                      </div>

                      <Separator />

                      {/* Date and Time */}
                      <div>
                        <h4 className="text-sm font-medium">Appointment</h4>
                        <p className="text-sm">{selectedDate && format(selectedDate, "PPP")} at {selectedTime}</p>
                      </div>

                      <Separator />

                      {/* Customer Info */}
                      <div>
                        <h4 className="text-sm font-medium">Customer Information</h4>
                        <div className="text-sm space-y-1">
                          <p>{formData.name}</p>
                          <p>{formData.email} • {formData.phone}</p>
                          <p>{formData.streetAddress}{formData.addressLine2 ? `, ${formData.addressLine2}` : ''}</p>
                          <p>{formData.city}, {formData.state} {formData.zipCode}</p>
                        </div>
                      </div>

                      <Separator />

                      {/* Total */}
                      <div className="bg-muted p-3 rounded-md flex justify-between items-center">
                        <span className="font-medium">Total:</span>
                        <span className="text-xl font-bold">{formatPrice(pricingTotal)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row gap-3">
                {currentStep > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={handlePrevious}
                    className="w-full sm:w-auto"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                )}

                <Button 
                  onClick={handleNext}
                  disabled={currentStep === 3 ? (!formData.name || !formData.email || !formData.phone || !formData.streetAddress) : !canProceedToNext()}
                  className="flex-1 ml-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-semibold"
                >
                  {currentStep === 3 ? "Review Booking" : "Continue"}
                </Button>
              </CardFooter>
            </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky Summary Bar */}
      <StickyBookingSummary
        services={[...tvServices, ...smartHomeServices, ...deinstallationServices]}
        totalPrice={calculateTotalPrice()}
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
            pricingTotal: pricingTotal,
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
                pricingTotal: pricingTotal.toString(),
                notes: formData.notes,
                consentToContact: formData.consentToContact,
                pricingBreakdown: [
                  ...tvServices.map(tv => ({
                    type: 'tv',
                    size: tv.size,
                    location: tv.location,
                    mountType: tv.mountType,
                    masonryWall: tv.masonryWall,
                    highRise: tv.highRise,
                    outletRelocation: tv.outletNeeded,
                    outletImage: tv.outletImage
                  })),
                  ...smartHomeServices.map(device => ({
                    type: device.type,
                    count: device.count,
                    hasExistingWiring: device.hasExistingWiring
                  })),
                  ...deinstallationServices.map(service => ({
                    type: 'deinstallation',
                    tvSize: service.tvSize,
                    wallType: service.wallType,
                    cableCleanup: service.cableCleanup,
                    basePrice: service.basePrice
                  }))
                ],
                createAccount: formData.createAccount,
                password: formData.createAccount ? formData.password : undefined
              };

              await onSubmit(bookingData);
              setShowConfirmationModal(false);
            } catch (error) {
              console.error('Error submitting booking:', error);
              throw error;
            }
          }}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
}