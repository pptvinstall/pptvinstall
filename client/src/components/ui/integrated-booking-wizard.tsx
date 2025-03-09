import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Clock, MinusCircle, User, Home, Mail, Phone, Info, Minus, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { pricing } from "@/lib/pricing";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Separator } from "@/components/ui/separator";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { Checkbox } from "./checkbox";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Icons } from "../icons";
import { Badge } from "./badge";
import { motion, AnimatePresence } from "framer-motion";
import { TVInstallation, SmartHomeInstallation } from "@/types/booking";

// Service-related interfaces 
interface TVServiceOption {
  id: string;
  size: 'small' | 'large';
  location: 'standard' | 'fireplace';
  mountType: 'fixed' | 'tilting' | 'full_motion' | 'none' | 'customer';
  masonryWall: boolean;
  highRise: boolean;
  outletNeeded: boolean;
}

interface SmartHomeDeviceOption {
  id: string;
  type: 'doorbell' | 'camera' | 'floodlight';
  count: number;
  hasExistingWiring?: boolean;
}

// Main wizard props
type IntegratedBookingWizardProps = {
  onSubmit: (data: any) => Promise<any>;
  isSubmitting: boolean;
  existingBookings?: any[];
  isLoadingBookings?: boolean;
};

// Step indicator component
const StepIndicator = ({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) => {
  const steps = [];

  for (let i = 0; i < totalSteps; i++) {
    steps.push(
      <div
        key={`step-${i}`}
        className={cn(
          "rounded-full transition-all duration-200 flex items-center justify-center",
          currentStep === i
            ? "bg-primary text-primary-foreground w-8 h-8 shadow-md"
            : currentStep > i
            ? "bg-primary/20 text-primary w-7 h-7"
            : "bg-muted text-muted-foreground w-7 h-7"
        )}
      >
        {currentStep > i ? (
          <Icons.check className="h-4 w-4" />
        ) : (
          <span className="text-sm">{i + 1}</span>
        )}
      </div>
    );

    if (i < totalSteps - 1) {
      steps.push(
        <div key={`connector-${i}`} className="flex-grow h-0.5 mx-1 relative">
          <div
            className={cn(
              "absolute inset-0",
              currentStep > i ? "bg-primary/30" : "bg-muted"
            )}
            aria-hidden="true"
          ></div>
          <div
            className={cn(
              "absolute inset-0 transition-all duration-500",
              currentStep > i ? "w-full" : "w-0",
              "bg-primary"
            )}
            aria-hidden="true"
          ></div>
        </div>
      );
    }
  }

  return (
    <div className="flex items-center justify-between w-full px-2 sm:px-0 mb-6">
      {steps}
    </div>
  );
};

// Format price helper
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

// Main wizard component
export function IntegratedBookingWizard({
  onSubmit,
  isSubmitting,
  existingBookings = [],
  isLoadingBookings = false
}: IntegratedBookingWizardProps) {
  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [tvServices, setTvServices] = useState<TVServiceOption[]>([]);
  const [smartHomeServices, setSmartHomeServices] = useState<SmartHomeDeviceOption[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [pricingTotal, setPricingTotal] = useState(0);
  const [timeSlotAvailability, setTimeSlotAvailability] = useState<Record<string, boolean>>({});
  
  // Add real-time refreshing of time slot availability
  useEffect(() => {
    // Set up an interval to refresh time slot availability every minute
    const refreshInterval = setInterval(() => {
      if (selectedDate) {
        // Clear the cache for the selected date to force recalculation
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const newAvailability = { ...timeSlotAvailability };
        
        // Remove all cached entries for the selected date
        Object.keys(newAvailability).forEach(key => {
          if (key.startsWith(dateStr)) {
            delete newAvailability[key];
          }
        });
        
        setTimeSlotAvailability(newAvailability);
        
        // Log for debugging
        console.log('Real-time refresh: Updated time slot availability at', new Date().toLocaleTimeString());
      }
    }, 60000); // Refresh every minute
    
    return () => clearInterval(refreshInterval);
  }, [selectedDate, timeSlotAvailability]);
  
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const { toast } = useToast();
  
  // TVs
  const [newTvSize, setNewTvSize] = useState<'small' | 'large'>('small');
  const [newTvLocation, setNewTvLocation] = useState<'standard' | 'fireplace'>('standard');
  const [newTvMountType, setNewTvMountType] = useState<'fixed' | 'tilting' | 'full_motion' | 'none' | 'customer'>('fixed');
  const [newTvMasonryWall, setNewTvMasonryWall] = useState(false);
  const [newTvHighRise, setNewTvHighRise] = useState(false);
  const [newTvOutletNeeded, setNewTvOutletNeeded] = useState(false);
  
  // Smart Home
  const [newDeviceType, setNewDeviceType] = useState<'doorbell' | 'camera' | 'floodlight'>('camera');
  const [newDeviceCount, setNewDeviceCount] = useState(1);
  const [hasExistingWiring, setHasExistingWiring] = useState(true);
  
  // Scroll to top when changing steps
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Available time slots
  const timeSlots = [
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
    "5:00 PM"
  ];

  // Time slot availability check with real-time validation and improved error handling
  const isTimeSlotAvailable = useCallback(
    (date: string, time: string) => {
      const key = `${date}|${time}`;
      
      // Always recalculate time-based availability to ensure real-time checks
      // (don't use cached result for time-based checks)
      
      // Convert the selected date and time to a DateTime
      const now = new Date();
      
      // Parse the time string to get hours and minutes
      const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeMatch) {
        console.error(`Invalid time format: ${time}`);
        return false;
      }
      
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const period = timeMatch[3].toUpperCase();
      
      // Convert to 24-hour format
      if (period === 'PM' && hours < 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      // Create a date object for the selected date and time
      const selectedDate = new Date(date);
      selectedDate.setHours(hours, minutes, 0, 0);
      
      // Add a 60-minute buffer for bookings (appointments need to be at least 1 hour in the future)
      const bufferTime = new Date(now.getTime() + 60 * 60 * 1000);
      
      // Check if the selected time is in the past (with buffer)
      if (selectedDate <= bufferTime) {
        console.log(`Time slot ${time} on ${date} is unavailable due to being in the past or too soon`);
        setTimeSlotAvailability((prev) => ({ ...prev, [key]: false }));
        return false;
      }

      // Check if time slot conflicts with existing bookings
      if (existingBookings && existingBookings.length > 0) {
        try {
          const dateStr = format(new Date(date), "yyyy-MM-dd");
          
          // Filter bookings for the selected date
          const bookingsOnDate = existingBookings.filter(
            (booking) => booking.preferredDate === dateStr
          );
          
          // Check if any booking has the same time slot
          const conflictingBooking = bookingsOnDate.find(
            (booking) => booking.appointmentTime === time
          );
          
          const isSlotTaken = !!conflictingBooking;
          
          if (isSlotTaken) {
            console.log(`Time slot ${time} on ${dateStr} is already booked`);
          }
          
          setTimeSlotAvailability((prev) => ({ ...prev, [key]: !isSlotTaken }));
          return !isSlotTaken;
        } catch (error) {
          console.error("Error checking time slot availability:", error);
          // Default to available if there's an error in checking
          setTimeSlotAvailability((prev) => ({ ...prev, [key]: true }));
          return true;
        }
      }

      setTimeSlotAvailability((prev) => ({ ...prev, [key]: true }));
      return true;
    },
    [existingBookings, timeSlotAvailability]
  );

  // Add TV installation option
  const addTvService = () => {
    const newTv: TVServiceOption = {
      id: `tv-${Date.now()}`,
      size: newTvSize,
      location: newTvLocation,
      mountType: newTvMountType,
      masonryWall: newTvMasonryWall,
      highRise: newTvHighRise,
      outletNeeded: newTvOutletNeeded
    };
    
    setTvServices([...tvServices, newTv]);
    
    // Reset form for next TV
    setNewTvSize('small');
    setNewTvLocation('standard');
    setNewTvMountType('fixed');
    setNewTvMasonryWall(false);
    setNewTvHighRise(false);
    setNewTvOutletNeeded(false);
    
    calculatePricingTotal([...tvServices, newTv], smartHomeServices);
  };
  
  // Add smart home service option
  const addSmartHomeService = () => {
    const newDevice: SmartHomeDeviceOption = {
      id: `sh-${Date.now()}`,
      type: newDeviceType,
      count: newDeviceCount,
      hasExistingWiring: hasExistingWiring
    };
    
    setSmartHomeServices([...smartHomeServices, newDevice]);
    
    // Reset form for next device
    setNewDeviceType('camera');
    setNewDeviceCount(1);
    setHasExistingWiring(true);
    
    calculatePricingTotal(tvServices, [...smartHomeServices, newDevice]);
  };
  
  // Remove a service
  const removeService = (type: 'tv' | 'smartHome', id: string) => {
    if (type === 'tv') {
      const updatedTvServices = tvServices.filter(tv => tv.id !== id);
      setTvServices(updatedTvServices);
      calculatePricingTotal(updatedTvServices, smartHomeServices);
    } else {
      const updatedSmartHomeServices = smartHomeServices.filter(device => device.id !== id);
      setSmartHomeServices(updatedSmartHomeServices);
      calculatePricingTotal(tvServices, updatedSmartHomeServices);
    }
  };
  
  // Calculate total price
  const calculatePricingTotal = (tvs: TVServiceOption[], devices: SmartHomeDeviceOption[]) => {
    let total = 0;
    
    // Calculate TV installations
    tvs.forEach(tv => {
      let price = tv.location === 'standard' ? pricing.tvMounting.standard.price : pricing.tvMounting.fireplace.price;
      
      if (tv.masonryWall) {
        price += pricing.tvMounting.nonDrywall.price;
      }
      
      if (tv.highRise) {
        price += pricing.tvMounting.highRise.price;
      }
      
      if (tv.outletNeeded) {
        price += pricing.wireConcealment.standard.price;
      }
      
      if (['fixed', 'tilting', 'full_motion'].includes(tv.mountType)) {
        const size = tv.size === 'small' ? 'Small' : 'Big';
        const mountType = tv.mountType === 'full_motion' ? 'fullMotion' : tv.mountType;
        const mountKey = `${mountType}${size}` as keyof typeof pricing.tvMounts;
        price += pricing.tvMounts[mountKey]?.price || 0;
      }
      
      total += price;
    });
    
    // Calculate smart home devices
    devices.forEach(device => {
      let price = 0;
      
      if (device.type === 'camera') {
        price = pricing.smartHome.securityCamera.price * device.count;
      } else if (device.type === 'doorbell') {
        price = pricing.smartHome.doorbell.price * device.count;
      } else if (device.type === 'floodlight') {
        price = pricing.smartHome.floodlight.price * device.count;
      }
      
      total += price;
    });
    
    setPricingTotal(total);
    return total;
  };
  
  // Form input handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCheckboxChange = (checked: boolean, name: string) => {
    setFormData({ ...formData, [name]: checked });
  };

  // Validation
  const validateCurrentStep = (): boolean => {
    let isValid = true;
    const errors: Record<string, string[]> = {};

    if (currentStep === 0) {
      // Service selection validation
      if (tvServices.length === 0 && smartHomeServices.length === 0) {
        toast({
          title: "Service required",
          description: "Please select at least one service",
          variant: "destructive",
        });
        return false;
      }
    } else if (currentStep === 1) {
      // Date and time validation
      if (!selectedDate) {
        errors.date = ["Please select a date"];
        isValid = false;
      }
      
      if (!selectedTime) {
        errors.time = ["Please select a time"];
        isValid = false;
      }
    } else if (currentStep === 2) {
      // Customer details validation
      if (!formData.name) {
        errors.name = ["Name is required"];
        isValid = false;
      }
      
      if (!formData.email) {
        errors.email = ["Email is required"];
        isValid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = ["Please enter a valid email"];
        isValid = false;
      }
      
      if (!formData.phone) {
        errors.phone = ["Phone number is required"];
        isValid = false;
      } else if (!/^[0-9()-.\s]+$/.test(formData.phone)) {
        errors.phone = ["Please enter a valid phone number"];
        isValid = false;
      }
      
      if (!formData.streetAddress) {
        errors.streetAddress = ["Street address is required"];
        isValid = false;
      }
      
      if (!formData.city) {
        errors.city = ["City is required"];
        isValid = false;
      }
      
      if (!formData.state) {
        errors.state = ["State is required"];
        isValid = false;
      }
      
      if (!formData.zipCode) {
        errors.zipCode = ["ZIP code is required"];
        isValid = false;
      } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
        errors.zipCode = ["Please enter a valid ZIP code"];
        isValid = false;
      }
      
      if (!formData.consentToContact) {
        errors.consentToContact = ["Please consent to being contacted"];
        isValid = false;
      }
    }

    setValidationErrors(errors);
    return isValid;
  };

  // Next/Prev step handlers
  const handleNextClick = () => {
    if (!validateCurrentStep()) return;
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final submission
      submitBooking();
    }
  };

  const handlePrevClick = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Booking submission
  const submitBooking = () => {
    if (!validateCurrentStep()) return;

    // Convert TV services to the correct format for submission
    const tvInstallations = tvServices.map(tv => ({
      id: tv.id,
      name: `TV Installation (${tv.size === 'small' ? 'Small' : 'Large'})`,
      description: `${tv.location === 'fireplace' ? 'Fireplace' : 'Standard wall'} installation with ${tv.mountType} mount${tv.outletNeeded ? ' and wire concealment' : ''}`,
      type: 'mount',
      basePrice: 0 // Price is calculated on backend
    }));

    // Convert smart home services to the correct format
    const smartHomeInstallations = smartHomeServices.map(device => ({
      id: device.id,
      name: `Smart ${device.type.charAt(0).toUpperCase() + device.type.slice(1)} Installation`,
      description: `Installation of smart ${device.type} (Qty: ${device.count})`,
      type: device.type,
      basePrice: 0 // Price is calculated on backend
    }));

    // Prepare booking data - directly include all fields in the top-level object
    const bookingData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      streetAddress: formData.streetAddress,
      addressLine2: formData.addressLine2 || undefined,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      notes: formData.notes || undefined,
      preferredDate: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
      appointmentTime: selectedTime || "",
      serviceType: tvInstallations.length > 0 ? "TV Installation" : "Smart Home Installation",
      status: "active",
      pricingTotal,
      consentToContact: formData.consentToContact,
      tvInstallations,
      smartHomeInstallations,
      pricingBreakdown: [
        ...tvServices.map(tv => ({
          type: 'tv',
          size: tv.size,
          location: tv.location,
          mountType: tv.mountType,
          masonryWall: tv.masonryWall,
          highRise: tv.highRise,
          outletRelocation: tv.outletNeeded
        })),
        ...smartHomeServices.map(device => ({
          type: device.type,
          count: device.count,
          hasExistingWiring: device.hasExistingWiring
        }))
      ]
    };

    // Submit booking directly without nesting
    onSubmit(bookingData);
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="w-full booking-wizard-container mx-auto relative" style={{ position: 'relative' }}>
      <div className="space-y-6 relative">
        {/* Mobile-optimized step indicator with reduced padding on small screens */}
        <div className="px-2 sm:px-0">
          <StepIndicator currentStep={currentStep} totalSteps={4} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial="initial"
            animate="in"
            exit="exit"
            variants={pageVariants}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <div className="booking-step-grid grid grid-cols-1 gap-4 md:gap-6">
              <Card className="p-4 sm:p-6 wizard-step relative">
                {/* Step 1: Service Selection */}
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium">Select Services</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose the services you need
                      </p>
                    </div>
                    
                    <Tabs defaultValue="tv" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="tv">TV Installation</TabsTrigger>
                        <TabsTrigger value="smarthome">Smart Home</TabsTrigger>
                      </TabsList>
                      
                      {/* TV Installation */}
                      <TabsContent value="tv" className="space-y-4 mt-4">
                        {/* Current TVs */}
                        {tvServices.length > 0 && (
                          <div className="space-y-3 mb-6">
                            <h4 className="text-sm font-medium">Your TV Installations</h4>
                            <div className="space-y-2">
                              {tvServices.map((tv, index) => (
                                <div key={tv.id} className="flex items-start justify-between p-3 bg-muted rounded-md">
                                  <div>
                                    <p className="font-medium">TV {index + 1}</p>
                                    <p className="text-sm">Size: {tv.size === 'small' ? '32"-55"' : '56" or larger'}</p>
                                    <p className="text-sm">Location: {tv.location === 'standard' ? 'Standard Wall' : 'Over Fireplace'}</p>
                                    <p className="text-sm">
                                      Mount: {tv.mountType === 'fixed' 
                                        ? 'Fixed Mount' 
                                        : tv.mountType === 'tilting' 
                                        ? 'Tilting Mount' 
                                        : tv.mountType === 'full_motion' 
                                        ? 'Full Motion Mount' 
                                        : tv.mountType === 'customer' 
                                        ? 'Customer-Provided Mount' 
                                        : 'No Mount'}
                                    </p>
                                    {tv.masonryWall && <p className="text-sm">Brick/Stone Surface</p>}
                                    {tv.highRise && <p className="text-sm">High-Rise/Steel Studs</p>}
                                    {tv.outletNeeded && <p className="text-sm">Wire Concealment & Outlet</p>}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeService('tv', tv.id)}
                                    className="text-destructive hover:text-destructive/90"
                                  >
                                    <MinusCircle className="h-5 w-5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Add New TV */}
                        <div className="space-y-4 bg-muted/30 p-4 rounded-md">
                          <h4 className="text-sm font-medium">Add New TV Installation</h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">TV Size</label>
                              <RadioGroup
                                value={newTvSize}
                                onValueChange={(value) => setNewTvSize(value as 'small' | 'large')}
                                className="flex flex-col space-y-1"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="small" id="small" />
                                  <Label htmlFor="small">32"-55"</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="large" id="large" />
                                  <Label htmlFor="large">56" or larger</Label>
                                </div>
                              </RadioGroup>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Installation Location</label>
                              <RadioGroup
                                value={newTvLocation}
                                onValueChange={(value) => setNewTvLocation(value as 'standard' | 'fireplace')}
                                className="flex flex-col space-y-1"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="standard" id="standard" />
                                  <Label htmlFor="standard">Standard Wall</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="fireplace" id="fireplace" />
                                  <Label htmlFor="fireplace">Over Fireplace (+$100)</Label>
                                </div>
                              </RadioGroup>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Mount Type</label>
                            <RadioGroup
                              value={newTvMountType}
                              onValueChange={(value) => setNewTvMountType(value as any)}
                              className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="fixed" id="fixed" />
                                <Label htmlFor="fixed">Fixed (No Tilt)</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="tilting" id="tilting" />
                                <Label htmlFor="tilting">Tilting (+$10)</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="full_motion" id="full_motion" />
                                <Label htmlFor="full_motion">Full Motion (+$30)</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="customer" id="customer" />
                                <Label htmlFor="customer">Customer-Provided</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="none" id="none" />
                                <Label htmlFor="none">No Mount Needed</Label>
                              </div>
                            </RadioGroup>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="masonryWall" 
                                checked={newTvMasonryWall}
                                onCheckedChange={(checked) => setNewTvMasonryWall(checked === true)}
                              />
                              <Label htmlFor="masonryWall">Brick/Stone Surface (+$50)</Label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="highRise" 
                                checked={newTvHighRise}
                                onCheckedChange={(checked) => setNewTvHighRise(checked === true)}
                              />
                              <Label htmlFor="highRise">High-Rise/Steel Studs (+$25)</Label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="outletNeeded" 
                                checked={newTvOutletNeeded}
                                onCheckedChange={(checked) => setNewTvOutletNeeded(checked === true)}
                              />
                              <Label htmlFor="outletNeeded">Wire Concealment & Outlet (+$100)</Label>
                            </div>
                          </div>
                          
                          <Button 
                            onClick={addTvService}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" /> Add TV Installation
                          </Button>
                        </div>
                      </TabsContent>
                      
                      {/* Smart Home */}
                      <TabsContent value="smarthome" className="space-y-4 mt-4">
                        {/* Current Smart Home Devices */}
                        {smartHomeServices.length > 0 && (
                          <div className="space-y-3 mb-6">
                            <h4 className="text-sm font-medium">Your Smart Home Devices</h4>
                            <div className="space-y-2">
                              {smartHomeServices.map((device, index) => (
                                <div key={device.id} className="flex items-start justify-between p-3 bg-muted rounded-md">
                                  <div>
                                    <p className="font-medium">
                                      {device.type === 'camera' 
                                        ? 'Smart Camera' 
                                        : device.type === 'doorbell' 
                                        ? 'Smart Doorbell' 
                                        : 'Smart Floodlight'}
                                    </p>
                                    <p className="text-sm">Quantity: {device.count}</p>
                                    {device.type === 'floodlight' && (
                                      <p className="text-sm">
                                        {device.hasExistingWiring ? 'Existing Wiring' : 'Requires New Wiring'}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeService('smartHome', device.id)}
                                    className="text-destructive hover:text-destructive/90"
                                  >
                                    <MinusCircle className="h-5 w-5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Add New Smart Home Device */}
                        <div className="space-y-4 bg-muted/30 p-4 rounded-md">
                          <h4 className="text-sm font-medium">Add Smart Home Device</h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Device Type</label>
                              <RadioGroup
                                value={newDeviceType}
                                onValueChange={(value) => setNewDeviceType(value as 'doorbell' | 'camera' | 'floodlight')}
                                className="flex flex-col space-y-1"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="camera" id="camera" />
                                  <Label htmlFor="camera">Security Camera ($75)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="doorbell" id="doorbell" />
                                  <Label htmlFor="doorbell">Video Doorbell ($85)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="floodlight" id="floodlight" />
                                  <Label htmlFor="floodlight">Floodlight Camera ($125)</Label>
                                </div>
                              </RadioGroup>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Quantity</label>
                              <div className="flex items-center space-x-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setNewDeviceCount(Math.max(1, newDeviceCount - 1))}
                                  disabled={newDeviceCount <= 1}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center">{newDeviceCount}</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setNewDeviceCount(newDeviceCount + 1)}
                                >
                                  <PlusCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          {newDeviceType === 'floodlight' && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Wiring</label>
                              <RadioGroup
                                value={hasExistingWiring ? 'existing' : 'new'}
                                onValueChange={(value) => setHasExistingWiring(value === 'existing')}
                                className="flex flex-col space-y-1"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="existing" id="existing" />
                                  <Label htmlFor="existing">Replacing Existing Floodlight/Light</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="new" id="new" />
                                  <Label htmlFor="new">New Installation (May Require Assessment)</Label>
                                </div>
                              </RadioGroup>
                            </div>
                          )}
                          
                          <Button 
                            onClick={addSmartHomeService}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" /> Add Device
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                    
                    {/* Service Selection Summary */}
                    <div className="mt-6 space-y-3">
                      <Separator />
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium">Total Selected:</h4>
                        <div>
                          <Badge variant="outline" className="mr-2">{tvServices.length} TV{tvServices.length !== 1 ? 's' : ''}</Badge>
                          <Badge variant="outline">{smartHomeServices.length} Device{smartHomeServices.length !== 1 ? 's' : ''}</Badge>
                        </div>
                      </div>
                      <div className="bg-muted p-3 rounded-md flex justify-between items-center">
                        <span className="font-medium">Estimated Total:</span>
                        <span className="text-xl font-bold">{formatPrice(pricingTotal)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Step 2: Date & Time Selection */}
                {currentStep === 1 && (
                  <div className="space-y-6 relative">
                    <div>
                      <h3 className="text-base sm:text-lg font-medium">Select Date & Time</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Choose a date and time for your service appointment
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                      {/* Date Selection */}
                      <div className="relative">
                        <div className="mb-4 flex items-center">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          <span className="font-medium">Select Date</span>
                        </div>
                        <div className="calendar-container relative">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => {
                              // Disable dates in the past
                              return date < new Date(new Date().setHours(0, 0, 0, 0));
                            }}
                            className="rounded-md border mx-auto w-full"
                          />
                        </div>
                      </div>

                      {/* Time Selection */}
                      <div className="relative">
                        <div className="mb-4 flex items-center">
                          <Clock className="mr-2 h-4 w-4" />
                          <span className="font-medium">Select Time</span>
                        </div>
                        {selectedDate ? (
                          isLoadingBookings ? (
                            <div className="space-y-2">
                              <LoadingSpinner size="sm" />
                              <p className="text-sm text-muted-foreground">Loading availability...</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {timeSlots.map((time) => {
                                const isAvailable = isTimeSlotAvailable(
                                  format(selectedDate, "yyyy-MM-dd"),
                                  time
                                );
                                return (
                                  <Button
                                    key={time}
                                    variant={selectedTime === time ? "default" : "outline"}
                                    className={`
                                      ${!isAvailable ? "opacity-60 cursor-not-allowed border-red-200 bg-red-50 text-red-500 dark:bg-red-950 dark:border-red-800 dark:text-red-300" : ""} 
                                      text-sm sm:text-base relative
                                    `}
                                    onClick={() => {
                                      if (isAvailable) {
                                        setSelectedTime(time);
                                      } else {
                                        toast({
                                          title: "Time slot unavailable",
                                          description: "This time slot is already booked. Please select another time.",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    disabled={!isAvailable}
                                  >
                                    {time}
                                    {!isAvailable && (
                                      <span className="absolute inset-0 flex items-center justify-center">
                                        <span className="sr-only">Unavailable</span>
                                      </span>
                                    )}
                                  </Button>
                                );
                              })}
                            </div>
                          )
                        ) : (
                          <div className="flex flex-col items-center justify-center h-32 border rounded-md border-dashed">
                            <p className="text-muted-foreground text-sm">
                              Please select a date first
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selected Date & Time Summary */}
                    {selectedDate && selectedTime && (
                      <div className="bg-primary/10 p-4 rounded-md mt-4">
                        <h3 className="font-medium mb-2">Your Appointment</h3>
                        <p className="text-sm sm:text-base">
                          Date: <span className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
                        </p>
                        <p className="text-sm sm:text-base">
                          Time: <span className="font-medium">{selectedTime}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Step 3: Customer Details */}
                {currentStep === 2 && (
                  <div className="space-y-5 px-1">
                    <div>
                      <h3 className="text-base sm:text-lg font-medium">Customer Information</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Please provide your contact and address details
                      </p>
                    </div>
                    
                    <div className="space-y-5">
                      {/* Personal Information */}
                      <div className="space-y-3">
                        <h3 className="text-base sm:text-lg font-medium flex items-center">
                          <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Personal Information
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">
                              Full Name
                            </label>
                            <Input
                              id="name"
                              name="name"
                              value={formData.name || ""}
                              onChange={handleInputChange}
                              placeholder="John Doe"
                              className={`${validationErrors.name ? "border-destructive" : ""} h-10`}
                            />
                            {validationErrors.name && (
                              <p className="text-sm text-destructive">
                                {validationErrors.name[0]}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                              Email Address
                            </label>
                            <div className="flex items-center relative">
                              <Mail className="absolute left-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email || ""}
                                onChange={handleInputChange}
                                placeholder="john.doe@example.com"
                                className={`${validationErrors.email ? "border-destructive" : ""} pl-10 h-10`}
                              />
                            </div>
                            {validationErrors.email && (
                              <p className="text-sm text-destructive">
                                {validationErrors.email[0]}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="phone" className="text-sm font-medium">
                              Phone Number
                            </label>
                            <div className="flex items-center relative">
                              <Phone className="absolute left-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                value={formData.phone || ""}
                                onChange={handleInputChange}
                                placeholder="(555) 123-4567"
                                className={`${validationErrors.phone ? "border-destructive" : ""} pl-10 h-10`}
                              />
                            </div>
                            {validationErrors.phone && (
                              <p className="text-sm text-destructive">
                                {validationErrors.phone[0]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Address Information */}
                      <div className="space-y-3 pt-1">
                        <h3 className="text-base sm:text-lg font-medium flex items-center">
                          <Home className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Service Address
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <label htmlFor="streetAddress" className="text-sm font-medium">
                              Street Address
                            </label>
                            <Input
                              id="streetAddress"
                              name="streetAddress"
                              value={formData.streetAddress || ""}
                              onChange={handleInputChange}
                              placeholder="123 Main St"
                              className={`${validationErrors.streetAddress ? "border-destructive" : ""} h-10`}
                            />
                            {validationErrors.streetAddress && (
                              <p className="text-sm text-destructive">
                                {validationErrors.streetAddress[0]}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="addressLine2" className="text-sm font-medium">
                              Apartment, Suite, Unit, etc. (optional)
                            </label>
                            <Input
                              id="addressLine2"
                              name="addressLine2"
                              value={formData.addressLine2 || ""}
                              onChange={handleInputChange}
                              placeholder="Apt 4B"
                              className="h-10"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                          <div className="space-y-2">
                            <label htmlFor="city" className="text-sm font-medium">
                              City
                            </label>
                            <Input
                              id="city"
                              name="city"
                              value={formData.city || ""}
                              onChange={handleInputChange}
                              placeholder="Atlanta"
                              className={`${validationErrors.city ? "border-destructive" : ""} h-10`}
                            />
                            {validationErrors.city && (
                              <p className="text-sm text-destructive">
                                {validationErrors.city[0]}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="state" className="text-sm font-medium">
                              State
                            </label>
                            <Input
                              id="state"
                              name="state"
                              value={formData.state || ""}
                              onChange={handleInputChange}
                              placeholder="GA"
                              className={`${validationErrors.state ? "border-destructive" : ""} h-10`}
                            />
                            {validationErrors.state && (
                              <p className="text-sm text-destructive">
                                {validationErrors.state[0]}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2 col-span-2 sm:col-span-1">
                            <label htmlFor="zipCode" className="text-sm font-medium">
                              ZIP Code
                            </label>
                            <Input
                              id="zipCode"
                              name="zipCode"
                              value={formData.zipCode || ""}
                              onChange={handleInputChange}
                              placeholder="30303"
                              className={`${validationErrors.zipCode ? "border-destructive" : ""} h-10`}
                            />
                            {validationErrors.zipCode && (
                              <p className="text-sm text-destructive">
                                {validationErrors.zipCode[0]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Additional Information */}
                      <div className="space-y-3 pt-1">
                        <h3 className="text-base sm:text-lg font-medium flex items-center">
                          <Info className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Additional Information
                        </h3>
                        
                        <div className="space-y-2">
                          <label htmlFor="notes" className="text-sm font-medium">
                            Special Instructions or Notes (optional)
                          </label>
                          <Textarea
                            id="notes"
                            name="notes"
                            value={formData.notes || ""}
                            onChange={handleInputChange}
                            placeholder="Any specific details about your installation needs..."
                            rows={3}
                            className="min-h-[80px]"
                          />
                        </div>

                        <div className="flex items-start space-x-2 pt-2">
                          <Checkbox
                            id="consentToContact"
                            checked={formData.consentToContact}
                            onCheckedChange={(checked) => handleCheckboxChange(checked === true, 'consentToContact')}
                            className={validationErrors.consentToContact ? "border-destructive mt-1" : "mt-1"}
                          />
                          <div className="space-y-1 leading-tight">
                            <label
                              htmlFor="consentToContact"
                              className="text-sm font-medium cursor-pointer"
                            >
                              I agree to be contacted about my appointment
                            </label>
                            <p className="text-xs text-muted-foreground">
                              We may contact you via email or phone regarding your booking.
                            </p>
                            {validationErrors.consentToContact && (
                              <p className="text-sm text-destructive">
                                {validationErrors.consentToContact[0]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Step 4: Review Booking */}
                {currentStep === 3 && (
                  <div className="space-y-5 relative px-1">
                    <div>
                      <h3 className="text-base sm:text-lg font-medium">Review Your Booking</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Please review your booking details before confirming
                      </p>
                    </div>
                    
                    {/* Services Summary */}
                    <div className="relative">
                      <h4 className="text-sm font-medium mb-2">Services</h4>
                      <div className="space-y-3">
                        {/* TV Installations */}
                        {tvServices.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium">TV Installations:</h5>
                            <ul className="text-xs sm:text-sm space-y-2">
                              {tvServices.map((tv, index) => (
                                <li key={tv.id} className="flex flex-col p-2 bg-muted rounded-md">
                                  <span className="font-medium">TV {index + 1}:</span>
                                  <span>Size: {tv.size === 'large' ? '56" or larger' : '32"-55"'}</span>
                                  <span>Location: {tv.location === 'fireplace' ? 'Over Fireplace' : 'Standard Wall'}</span>
                                  <span className="line-clamp-2">
                                    Mount: {tv.mountType === 'fixed' 
                                      ? 'Fixed Mount' 
                                      : tv.mountType === 'tilting' 
                                      ? 'Tilting Mount' 
                                      : tv.mountType === 'full_motion' 
                                      ? 'Full Motion Mount' 
                                      : tv.mountType === 'customer' 
                                      ? 'Customer-Provided Mount' 
                                      : 'No Mount Required'}
                                  </span>
                                  {tv.masonryWall && <span>Non-Drywall Surface (Brick/Masonry)</span>}
                                  {tv.highRise && <span>High-Rise/Steel Studs</span>}
                                  {tv.outletNeeded && <span>With Wire Concealment & Outlet</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Smart Home Devices */}
                        {smartHomeServices.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium">Smart Home Installations:</h5>
                            <ul className="text-xs sm:text-sm space-y-2">
                              {smartHomeServices.map((device) => (
                                <li key={device.id} className="p-2 bg-muted rounded-md">
                                  {device.type === 'camera' && `Smart Security Camera (Qty: ${device.count})`}
                                  {device.type === 'doorbell' && `Smart Doorbell (Qty: ${device.count})`}
                                  {device.type === 'floodlight' && `Smart Floodlight (Qty: ${device.count})${device.hasExistingWiring ? ' - Existing Wiring' : ' - Requires Assessment'}`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Appointment Details */}
                    <div className="relative">
                      <h4 className="text-sm font-medium mb-2">Appointment</h4>
                      <div className="text-xs sm:text-sm space-y-2 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2">
                        <div>
                          <span className="font-medium">Date:</span>{' '}
                          <span className="break-all">
                            {selectedDate ? format(selectedDate, 'EEE, MMM d, yyyy') : 'Not selected'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Time:</span>{' '}
                          {selectedTime || 'Not selected'}
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Customer Details */}
                    <div className="relative">
                      <h4 className="text-sm font-medium mb-2">Customer Information</h4>
                      <div className="text-xs sm:text-sm space-y-2">
                        <p>
                          <span className="font-medium">Name:</span> {formData.name}
                        </p>
                        <p className="break-words">
                          <span className="font-medium">Contact:</span> {formData.email}
                          <br className="sm:hidden" /><span className="hidden sm:inline">, </span>
                          {formData.phone}
                        </p>
                        <div>
                          <span className="font-medium">Address:</span> 
                          <p className="mt-1">
                            {formData.streetAddress}
                            {formData.addressLine2 && <span><br />{formData.addressLine2}</span>}
                            <br />
                            {formData.city}, {formData.state} {formData.zipCode}
                          </p>
                        </div>
                        {formData.notes && (
                          <div>
                            <span className="font-medium">Notes:</span> 
                            <p className="mt-1 break-words">{formData.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Pricing */}
                    <div className="relative">
                      <h4 className="text-sm font-medium mb-2">Pricing</h4>
                      <div className="bg-muted p-3 rounded-md flex justify-between items-center">
                        <span className="font-medium">Estimated Total:</span>
                        <span className="text-xl font-bold">{formatPrice(pricingTotal)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Payment will be collected after installation. Cash, Zelle, and Apple Pay accepted.
                      </p>
                    </div>
                  </div>
                )}
              </Card>

              {/* Navigation Buttons */}
              <div className="space-y-4">
                <div className="bg-muted/30 p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Selected Services:</p>
                      <p className="text-xs text-muted-foreground">
                        {tvServices.length} TV{tvServices.length !== 1 ? 's' : ''}, {smartHomeServices.length} Device{smartHomeServices.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Estimated Total:</p>
                      <p className="text-lg font-bold">{formatPrice(pricingTotal)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevClick}
                    disabled={currentStep === 0 || isSubmitting}
                  >
                    Previous
                  </Button>

                  <Button
                    onClick={handleNextClick}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? <><LoadingSpinner size="sm" className="mr-2" /> Processing</>
                      : currentStep === 3
                        ? "Confirm Booking"
                        : "Next"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}