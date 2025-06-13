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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { Checkbox } from "./checkbox";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Icons } from "../icons";
import { Badge } from "./badge";
import { motion, AnimatePresence } from "framer-motion";
import { BookingAssistant, BookingAssistantButton } from "./booking-assistant";
import { BookingTutorial } from "./booking-tutorial";
import { useFirstTimeUser, BookingStepGuide } from "./booking-step-guide";
import { BookingAutofill } from "./booking-autofill";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from './tooltip';
import { TVInstallation, SmartHomeInstallation } from "@/types/booking";
import { ReviewBookingStep } from "@/components/steps/review-booking-step";
import { BookingConfirmationModal } from "@/components/ui/booking-confirmation-modal";

import { createCalendarEvent, downloadICSFile, generateGoogleCalendarURL } from "@/lib/calendar-export";

// Service-related interfaces 
interface TVServiceOption {
  id: string;
  size: 'small' | 'large';
  location: 'standard' | 'fireplace';
  mountType: 'fixed' | 'tilting' | 'full_motion' | 'customer';
  masonryWall: boolean;
  highRise: boolean;
  outletNeeded: boolean;
  outletImage?: string; // Base64 encoded image for outlet locations
}

interface SmartHomeDeviceOption {
  id: string;
  type: 'doorbell' | 'camera' | 'floodlight';
  count: number;
  hasExistingWiring?: boolean;
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

// Safe date formatter (handles undefined)
const safeFormatDate = (date: Date | undefined, formatStr: string, fallback: string = 'Not selected') => {
  return date ? format(date, formatStr) : fallback;
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
  const [bookingBufferHours, setBookingBufferHours] = useState<number>(2); // Default to 2 hours
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  
  // Accessibility and guidance features
  const [guidanceMode, setGuidanceMode] = useState<'full' | 'minimal' | 'hidden'>('minimal');
  const [showAccessibilityOptions, setShowAccessibilityOptions] = useState(false);
  const [textSizeMode, setTextSizeMode] = useState<'normal' | 'large' | 'extra-large'>('normal');
  const [highContrastMode, setHighContrastMode] = useState(false);
  const { isFirstTime, markAsReturningUser } = useFirstTimeUser();
  const [showTutorial, setShowTutorial] = useState(isFirstTime);
  
  // Function to handle assistant visibility
  const toggleAssistant = () => {
    if (guidanceMode === 'hidden') {
      setGuidanceMode('full');
    } else {
      setGuidanceMode('hidden');
    }
  };
  
  // Use business hours to generate time slots and check availability
  const { getTimeSlotsForDate, getBusinessHoursForDay, businessHours } = useBusinessHours();
  
  // Generate time slots based on the selected date and business hours
  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    
    console.log(`Generating time slots for date: ${format(selectedDate, 'yyyy-MM-dd')}`);
    // Get time slots based on business hours - 60 minute intervals
    const slots = getTimeSlotsForDate(selectedDate, 60);
    console.log(`Generated ${slots.length} time slots:`, slots);
    return slots;
  }, [selectedDate, getTimeSlotsForDate]);
  
  // Simple function to check if a time slot is in the past or too soon 
  // (extracted to avoid circular dependencies)
  const isTimePastOrTooSoon = useCallback((dateStr: string, timeStr: string): boolean => {
    // Parse the time string
    const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return true; // Invalid format means unavailable
    
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const period = timeMatch[3].toUpperCase();
    
    // Convert to 24-hour format
    if (period === 'PM' && hours < 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    // Parse the date correctly to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
    
    // Create a date object using individual components (avoids timezone shifts)
    // Note: month is 0-indexed in JavaScript Date
    const slotDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    
    // Get current time plus buffer
    const now = new Date();
    const bufferTime = new Date(now.getTime() + bookingBufferHours * 60 * 60 * 1000); // Use configurable buffer
    
    // Check if slot is in the past or too soon
    return slotDate <= bufferTime;
  }, [bookingBufferHours]);

  // Add real-time refreshing of time slot availability
  useEffect(() => {
    // First-time check when date changes
    if (selectedDate) {
      // Check each time slot for the selected date
      const dateStr = safeFormatDate(selectedDate, "yyyy-MM-dd", "");
      
      // We only want to update the UI, not create an infinite loop
      // So we handle this in a non-render-triggering way
      const timer1 = setTimeout(() => {
        // For each time slot, check if it's in the past and update accordingly
        timeSlots.forEach(timeSlot => {
          const key = `${dateStr}|${timeSlot}`;
          const isPastOrTooSoon = isTimePastOrTooSoon(dateStr, timeSlot);
          
          if (isPastOrTooSoon) {
            setTimeSlotAvailability(prev => ({ ...prev, [key]: false }));
          }
        });
        
        console.log('Initial availability check for', dateStr, 'at', new Date().toLocaleTimeString());
      }, 0);
      
      // Set up an interval to refresh time slot availability every minute
      const refreshInterval = setInterval(() => {
        if (selectedDate) {
          const dateStr = safeFormatDate(selectedDate, "yyyy-MM-dd", "");
          
          // For each time slot, check if it's just become unavailable
          timeSlots.forEach(timeSlot => {
            const key = `${dateStr}|${timeSlot}`;
            const isPastOrTooSoon = isTimePastOrTooSoon(dateStr, timeSlot);
            
            if (isPastOrTooSoon && timeSlotAvailability[key] !== false) {
              setTimeSlotAvailability(prev => ({ ...prev, [key]: false }));
              console.log(`Auto-refresh: Time slot ${timeSlot} on ${dateStr} is now unavailable`);
            }
          });
          
          console.log('Real-time refresh: Checked time slot availability at', new Date().toLocaleTimeString());
        }
      }, 60000); // Refresh every minute
      
      return () => {
        clearTimeout(timer1);
        clearInterval(refreshInterval);
      };
    }
  }, [selectedDate, timeSlots, isTimePastOrTooSoon]);
  
  const [formData, setFormData] = useState<BookingFormData>({
    name: "",
    email: "",
    phone: "",
    streetAddress: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    notes: "",
    consentToContact: false,
    createAccount: false,
    password: "",
    confirmPassword: ""
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const { toast } = useToast();
  
  // TVs
  const [newTvSize, setNewTvSize] = useState<'small' | 'large'>('small');
  const [newTvLocation, setNewTvLocation] = useState<'standard' | 'fireplace'>('standard');
  const [newTvMountType, setNewTvMountType] = useState<'fixed' | 'tilting' | 'full_motion' | 'customer'>('customer');
  const [newTvMasonryWall, setNewTvMasonryWall] = useState(false);
  const [newTvHighRise, setNewTvHighRise] = useState(false);
  const [newTvOutletNeeded, setNewTvOutletNeeded] = useState(false);
  const [newTvOutletImage, setNewTvOutletImage] = useState<string | undefined>();
  
  // Smart Home
  const [newDeviceType, setNewDeviceType] = useState<'doorbell' | 'camera' | 'floodlight'>('camera');
  const [newDeviceCount, setNewDeviceCount] = useState(1);
  const [hasExistingWiring, setHasExistingWiring] = useState(true);
  
  // Scroll to top when changing steps
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);
  
  // Fetch booking buffer setting from the API
  useEffect(() => {
    async function fetchBookingBuffer() {
      try {
        const response = await fetch('/api/system-settings/booking-buffer');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.bookingBufferHours !== undefined) {
            setBookingBufferHours(Number(data.bookingBufferHours));
            console.log(`Loaded booking buffer setting: ${data.bookingBufferHours} hours`);
          }
        }
      } catch (error) {
        console.error('Error fetching booking buffer setting:', error);
      }
    }
    
    fetchBookingBuffer();
  }, []);

  // Time slot availability check with real-time validation and improved error handling
  const isTimeSlotAvailable = useCallback(
    (date: string, time: string) => {
      const key = `${date}|${time}`;
      
      // Check if we already have a cached result to avoid unnecessary state updates
      if (timeSlotAvailability[key] !== undefined) {
        return timeSlotAvailability[key];
      }
      
      // Always recalculate time-based availability to ensure real-time checks
      // (don't use cached result for time-based checks)
      
      // Get current time for comparison
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
      
      // Parse the date components to ensure consistent handling across timezones
      const [year, month, day] = date.split('-').map(num => parseInt(num, 10));
      
      // Create a date object using individual components to avoid timezone issues
      // Note: month is 0-indexed in JavaScript Date
      const selectedDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
      
      // Add configurable buffer for bookings (using system setting)
      const bufferTime = new Date(now.getTime() + bookingBufferHours * 60 * 60 * 1000);
      
      // Check if the selected time is in the past (with buffer)
      if (selectedDate <= bufferTime) {
        console.log(`Time slot ${time} on ${date} is unavailable due to being in the past or too soon`);
        
        // Use setTimeout to prevent state updates during render
        setTimeout(() => {
          setTimeSlotAvailability((prev) => {
            // Only update if not already set
            if (prev[key] !== false) {
              return { ...prev, [key]: false };
            }
            return prev;
          });
        }, 0);
        
        return false;
      }

      // Check if time slot conflicts with existing bookings - enhanced with better debugging
      if (existingBookings && existingBookings.length > 0) {
        try {
          const dateStr = safeFormatDate(new Date(date), "yyyy-MM-dd", date);
          
          // Filter bookings for the selected date
          const bookingsOnDate = existingBookings.filter(
            (booking) => booking.preferredDate === dateStr
          );
          
          console.log(`Checking conflicts for ${dateStr} at ${time}. Found ${bookingsOnDate.length} bookings on this date.`);
          
          // Check if any booking has the same time slot
          const conflictingBooking = bookingsOnDate.find(
            (booking) => booking.appointmentTime === time
          );
          
          const isSlotTaken = !!conflictingBooking;
          
          if (isSlotTaken) {
            console.log(`Time slot ${time} on ${dateStr} is already booked (Conflict ID: ${conflictingBooking.id})`);
          }
          
          // Cache the result for faster lookup later
          setTimeout(() => {
            setTimeSlotAvailability((prev) => {
              // Only update if value changed
              if (prev[key] !== !isSlotTaken) {
                return { ...prev, [key]: !isSlotTaken };
              }
              return prev;
            });
          }, 0);
          
          return !isSlotTaken;
        } catch (error) {
          console.error("Error checking time slot availability:", error);
          return false; // Changed to false for safety - don't assume available on error
        }
      }
      
      // If we get here, there are no existing bookings, so the slot is available
      // Still cache the result for consistency
      setTimeout(() => {
        setTimeSlotAvailability((prev) => {
          if (prev[key] !== true) {
            return { ...prev, [key]: true };
          }
          return prev;
        });
      }, 0);
      
      return true;
    },
    [existingBookings, timeSlotAvailability, bookingBufferHours] // Include all dependencies
  );
  
  // Function to find the next available time slot with enhanced reliability
  const findNextAvailableTimeSlot = useCallback(() => {
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Look ahead up to 14 days
    const maxDaysToCheck = 14;
    let availableDate: Date | undefined = undefined;
    let availableTime: string | undefined = undefined;
    
    // Clear any previously cached availability data to ensure fresh checks
    setTimeSlotAvailability({});
    
    console.log("Searching for next available time slot...");
    console.log(`Existing bookings: ${existingBookings ? existingBookings.length : 0}`);
    
    // For each date, starting from today
    for (let dayOffset = 0; dayOffset < maxDaysToCheck; dayOffset++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + dayOffset);
      
      // Check if this day has business hours
      const dayOfWeek = checkDate.getDay();
      const hoursForDay = getBusinessHoursForDay(dayOfWeek);
      
      // Skip days with no business hours or marked unavailable
      if (!hoursForDay || !hoursForDay.isAvailable) {
        console.log(`Day ${dayOfWeek} (${safeFormatDate(checkDate, "yyyy-MM-dd", "")}) has no business hours or is marked unavailable`);
        continue;
      }
      
      // Get time slots for this date
      const slots = getTimeSlotsForDate(checkDate, 60);
      const dateString = safeFormatDate(checkDate, "yyyy-MM-dd", "");
      
      console.log(`Checking ${slots.length} time slots for ${dateString}`);
      
      // Find the first available time slot with double-checking
      for (const time of slots) {
        // First check - standard availability check
        const isAvailable = isTimeSlotAvailable(dateString, time);
        
        if (isAvailable) {
          // Double-check for conflicts with existing bookings
          let hasConflict = false;
          
          if (existingBookings && existingBookings.length > 0) {
            const conflictingBooking = existingBookings.find(
              (booking) => booking.preferredDate === dateString && booking.appointmentTime === time
            );
            hasConflict = !!conflictingBooking;
            
            if (hasConflict) {
              console.log(`Found conflict for ${dateString} at ${time}`);
            }
          }
          
          if (!hasConflict) {
            console.log(`Found available slot: ${dateString} at ${time}`);
            availableDate = checkDate;
            availableTime = time;
            break;
          }
        } else {
          console.log(`Slot ${time} on ${dateString} is not available`);
        }
      }
      
      // If we found an available slot, break the loop
      if (availableDate && availableTime) {
        break;
      }
    }
    
    // If we found an available date/time, select it
    if (availableDate && availableTime) {
      setSelectedDate(availableDate);
      setSelectedTime(availableTime);
      toast({
        title: "Next available time found",
        description: `${safeFormatDate(availableDate, "EEEE, MMMM d", "")} at ${availableTime}`,
      });
    } else {
      toast({
        title: "No available time slots",
        description: "We couldn't find any available time slots in the next 14 days. Please select a date and time manually.",
        variant: "destructive",
      });
    }
  }, [getTimeSlotsForDate, getBusinessHoursForDay, isTimeSlotAvailable, existingBookings, toast, setSelectedDate, setSelectedTime]);

  // Add TV installation option
  const addTvService = () => {
    // No longer checking for image upload as we're asking users to email/text images separately
    
    const newTv: TVServiceOption = {
      id: `tv-${Date.now()}`,
      size: newTvSize,
      location: newTvLocation,
      mountType: newTvMountType,
      masonryWall: newTvMasonryWall,
      highRise: newTvHighRise,
      outletNeeded: newTvOutletNeeded,
      outletImage: newTvOutletImage
    };
    
    setTvServices([...tvServices, newTv]);
    
    // Reset form for next TV
    setNewTvSize('small');
    setNewTvLocation('standard');
    setNewTvMountType('customer');
    setNewTvMasonryWall(false);
    setNewTvHighRise(false);
    setNewTvOutletNeeded(false);
    setNewTvOutletImage(undefined);
    
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
  // Format phone number as (XXX)-XXX-XXXX while typing
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits from the input
    const phoneDigits = value.replace(/\D/g, '');
    
    // Format the phone number
    if (phoneDigits.length <= 3) {
      return phoneDigits;
    } else if (phoneDigits.length <= 6) {
      return `(${phoneDigits.slice(0, 3)})-${phoneDigits.slice(3)}`;
    } else {
      return `(${phoneDigits.slice(0, 3)})-${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6, 10)}`;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Apply special formatting for phone numbers
    if (name === 'phone') {
      setFormData({ ...formData, [name]: formatPhoneNumber(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleCheckboxChange = (checked: boolean, name: string) => {
    setFormData({ ...formData, [name]: checked });
  };
  
  // Handle autofill from customer profile
  const handleAutofill = (customerData: any) => {
    setFormData({
      ...formData,
      name: customerData.name || '',
      phone: customerData.phone || '',
      email: customerData.email || '',
      streetAddress: customerData.streetAddress || '',
      addressLine2: customerData.addressLine2 || '',
      city: customerData.city || '',
      state: customerData.state || '',
      zipCode: customerData.zipCode || '',
    });
  };

  // Validation
  // Helper function to scroll to the first error field
  const scrollToFirstError = (fieldNames: string[]) => {
    for (const fieldName of fieldNames) {
      const element = document.getElementById(fieldName);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
  };

  const validateCurrentStep = (): boolean => {
    let isValid = true;
    const errors: Record<string, string[]> = {};
    let errorCount = 0;
    const errorFieldIds: string[] = [];

    if (currentStep === 0) {
      // Service selection validation
      if (tvServices.length === 0 && smartHomeServices.length === 0) {
        toast({
          title: "Service required",
          description: "Please select at least one service",
          variant: "destructive",
        });
        // No scrolling needed on the service tab
        return false;
      }
    } else if (currentStep === 1) {
      // Date and time validation
      if (!selectedDate) {
        errors.date = ["Please select a date"];
        errorFieldIds.push('date-selection');
        isValid = false;
        errorCount++;
      }
      
      if (!selectedTime) {
        errors.time = ["Please select a time"];
        errorFieldIds.push('time-selection');
        isValid = false;
        errorCount++;
      }
    } else if (currentStep === 2) {
      // Customer details validation
      if (!formData.name) {
        errors.name = ["Name is required"];
        errorFieldIds.push('customer-name');
        isValid = false;
        errorCount++;
      }
      
      if (!formData.email) {
        errors.email = ["Email is required"];
        errorFieldIds.push('customer-email');
        isValid = false;
        errorCount++;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = ["Please enter a valid email"];
        errorFieldIds.push('customer-email');
        isValid = false;
        errorCount++;
      }
      
      if (!formData.phone) {
        errors.phone = ["Phone number is required"];
        errorFieldIds.push('customer-phone');
        isValid = false;
        errorCount++;
      } else {
        // Extract just the digits for validation
        const digitsOnly = formData.phone.replace(/\D/g, '');
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
          errors.phone = ["Please enter a valid phone number in format (XXX)-XXX-XXXX"];
          errorFieldIds.push('customer-phone');
          isValid = false;
          errorCount++;
        }
      }
      
      if (!formData.streetAddress) {
        errors.streetAddress = ["Street address is required"];
        errorFieldIds.push('customer-street-address');
        isValid = false;
        errorCount++;
      }
      
      if (!formData.city) {
        errors.city = ["City is required"];
        errorFieldIds.push('customer-city');
        isValid = false;
        errorCount++;
      }
      
      if (!formData.state) {
        errors.state = ["State is required"];
        errorFieldIds.push('customer-state');
        isValid = false;
        errorCount++;
      }
      
      if (!formData.zipCode) {
        errors.zipCode = ["ZIP code is required"];
        errorFieldIds.push('customer-zipcode');
        isValid = false;
        errorCount++;
      } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
        errors.zipCode = ["Please enter a valid ZIP code"];
        errorFieldIds.push('customer-zipcode');
        isValid = false;
        errorCount++;
      }
      
      if (!formData.consentToContact) {
        errors.consentToContact = ["Please consent to being contacted"];
        errorFieldIds.push('consent-to-contact');
        isValid = false;
        errorCount++;
      }
      
      // Password validation when creating an account
      if (formData.createAccount) {
        if (!formData.password) {
          errors.password = ["Password is required when creating an account"];
          errorFieldIds.push('password');
          isValid = false;
          errorCount++;
        } else if (formData.password.length < 6) {
          errors.password = ["Password must be at least 6 characters long"];
          errorFieldIds.push('password');
          isValid = false;
          errorCount++;
        }
        
        if (!formData.confirmPassword) {
          errors.confirmPassword = ["Please confirm your password"];
          errorFieldIds.push('confirmPassword');
          isValid = false;
          errorCount++;
        } else if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = ["Passwords do not match"];
          errorFieldIds.push('confirmPassword');
          isValid = false;
          errorCount++;
        }
      }
    }

    setValidationErrors(errors);

    // If there are errors, display a summary and scroll to the first error
    if (!isValid) {
      // Show an error summary message
      toast({
        title: `Please fix ${errorCount} field${errorCount !== 1 ? 's' : ''} to continue`,
        description: "Required information is missing or invalid",
        variant: "destructive",
      });
      
      // Scroll to the first error field after a small delay to ensure the DOM is updated
      setTimeout(() => {
        scrollToFirstError(errorFieldIds);
      }, 100);
    }

    return isValid;
  };

  // Next/Prev step handlers
  const handleNextClick = () => {
    if (!validateCurrentStep()) return;
    
    // If this is the last step, check if there are any services selected before proceeding
    if (currentStep === 3 && tvServices.length === 0 && smartHomeServices.length === 0) {
      toast({
        title: "No services selected",
        description: "Please add at least one service before confirming your booking.",
        variant: "destructive"
      });
      return;
    }
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final submission
      submitBooking();
    }
  };

  // Function to go back to the services selection step but keep all selections
  const goToEditServices = () => {
    // Go to the first step where services are selected
    setCurrentStep(0);
    
    // Capture current state data to preserve settings
    // This data will be automatically used when the user returns to the review step
    toast({
      title: "Editing Services",
      description: "Make your changes and continue through the steps again",
    });
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
      basePrice: 0, // Price is calculated on backend
      outletImage: tv.outletImage // Include the outlet image if it exists
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
    // Normalize email to lowercase for consistency
    const normalizedEmail = formData.email ? formData.email.toLowerCase().trim() : '';
    
    const bookingData = {
      name: formData.name,
      email: normalizedEmail, // Use normalized email
      phone: formData.phone,
      streetAddress: formData.streetAddress,
      addressLine2: formData.addressLine2 || undefined,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      notes: formData.notes || undefined,
      preferredDate: safeFormatDate(selectedDate, "yyyy-MM-dd", ""),
      appointmentTime: selectedTime || "",
      serviceType: tvInstallations.length > 0 ? "TV Installation" : "Smart Home Installation",
      status: "active",
      pricingTotal,
      consentToContact: formData.consentToContact,
      // Account creation data
      createAccount: formData.createAccount || false,
      password: formData.createAccount ? formData.password : undefined,
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
          outletRelocation: tv.outletNeeded,
          outletImage: tv.outletImage
        })),
        ...smartHomeServices.map(device => ({
          type: device.type,
          count: device.count,
          hasExistingWiring: device.hasExistingWiring
        }))
      ]
    };

    // Submit booking directly without nesting
    // Show confirmation modal instead of submitting directly
    setShowConfirmationModal(true);
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div 
      className={cn(
        "w-full booking-wizard-container mx-auto relative", 
        textSizeMode === 'large' && "text-lg",
        textSizeMode === 'extra-large' && "text-xl",
        highContrastMode && "high-contrast-mode"
      )} 
      style={{ position: 'relative', overflow: 'visible', transform: 'translate3d(0,0,0)' }}
    >
      {/* Tutorial modal for first-time users */}
      {showTutorial && (
        <div className="relative z-50">
          <BookingTutorial 
            onClose={() => {
              setShowTutorial(false);
              markAsReturningUser();
            }}
            onEnable={() => setGuidanceMode('full')}
          />
        </div>
      )}
      


      {/* Accessibility tools */}
      <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 mb-4 px-2 sm:px-0">
        <div className="flex flex-wrap gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setGuidanceMode(guidanceMode === 'hidden' ? 'full' : 'hidden')}
                  className="flex items-center text-xs sm:text-sm"
                >
                  <HelpCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Help
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle help assistant</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAccessibilityOptions(!showAccessibilityOptions)}
                className="flex items-center"
              >
                <Settings2 className="h-4 w-4 mr-1.5" />
                Accessibility
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Adjust text size and contrast</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Accessibility options panel */}
      {showAccessibilityOptions && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Text Size</h3>
                <div className="flex space-x-2">
                  <Button 
                    variant={textSizeMode === 'normal' ? 'default' : 'outline'} 
                    onClick={() => setTextSizeMode('normal')}
                    className="flex-1"
                  >
                    Normal
                  </Button>
                  <Button 
                    variant={textSizeMode === 'large' ? 'default' : 'outline'} 
                    onClick={() => setTextSizeMode('large')}
                    className="flex-1"
                  >
                    Large
                  </Button>
                  <Button 
                    variant={textSizeMode === 'extra-large' ? 'default' : 'outline'} 
                    onClick={() => setTextSizeMode('extra-large')}
                    className="flex-1"
                  >
                    Extra Large
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Display</h3>
                <div className="flex space-x-2">
                  <Button 
                    variant={highContrastMode ? 'default' : 'outline'} 
                    onClick={() => setHighContrastMode(!highContrastMode)}
                    className="flex-1"
                  >
                    {highContrastMode ? 'Disable' : 'Enable'} High Contrast
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Guidance Level</h3>
                <div className="flex space-x-2">
                  <Button 
                    variant={guidanceMode === 'minimal' ? 'default' : 'outline'} 
                    onClick={() => setGuidanceMode('minimal')}
                    className="flex-1"
                  >
                    Basic
                  </Button>
                  <Button 
                    variant={guidanceMode === 'full' ? 'default' : 'outline'} 
                    onClick={() => setGuidanceMode('full')}
                    className="flex-1"
                  >
                    Detailed
                  </Button>
                  <Button 
                    variant={guidanceMode === 'hidden' ? 'default' : 'outline'} 
                    onClick={() => setGuidanceMode('hidden')}
                    className="flex-1"
                  >
                    None
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="space-y-6 relative">
        {/* Mobile-optimized step indicator with reduced padding on small screens */}
        <div className="px-2 sm:px-0">
          <StepIndicator currentStep={currentStep} totalSteps={4} />
        </div>
        
        {/* Booking Assistant - Shows conditionally based on guidanceMode */}
        {guidanceMode === 'full' && (
          <BookingAssistant
            currentStep={currentStep}
            onClose={() => setGuidanceMode('minimal')}
          />
        )}
        
        {guidanceMode === 'minimal' && (
          <div className="mb-4">
            <BookingAssistantButton
              onClick={() => setGuidanceMode('full')}
            />
          </div>
        )}
        
        {/* Step-specific guidance that's always visible */}
        {guidanceMode !== 'hidden' && (
          <BookingStepGuide currentStep={currentStep} />
        )}

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
                        {/* Base Price Notification */}
                        <div className="bg-primary/10 p-3 rounded-md mb-3">
                          <p className="text-sm font-medium flex items-center">
                            <Info className="h-4 w-4 mr-2" />
                            Base Installation Price: $100 per TV
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Additional charges apply based on your selections below.
                          </p>
                        </div>
                        
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
                                <Label htmlFor="fixed" className="flex flex-col">
                                  <span>Fixed (No Tilt)</span>
                                  <span className="text-xs text-muted-foreground">
                                    {newTvSize === 'small' ? '+$30 (32"-55")' : '+$40 (56"+)'}
                                  </span>
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="tilting" id="tilting" />
                                <Label htmlFor="tilting" className="flex flex-col">
                                  <span>Tilting</span>
                                  <span className="text-xs text-muted-foreground">
                                    {newTvSize === 'small' ? '+$40 (32"-55")' : '+$50 (56"+)'}
                                  </span>
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="full_motion" id="full_motion" />
                                <Label htmlFor="full_motion" className="flex flex-col">
                                  <span>Full Motion</span>
                                  <span className="text-xs text-muted-foreground">
                                    {newTvSize === 'small' ? '+$60 (32"-55")' : '+$80 (56"+)'}
                                  </span>
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="customer" id="customer" />
                                <Label htmlFor="customer" className="flex flex-col">
                                  <span>Customer-Provided</span>
                                  <span className="text-xs text-muted-foreground">
                                    (No additional charge)
                                  </span>
                                </Label>
                              </div>
                            </RadioGroup>
                            <div className="p-2 bg-primary/10 rounded-md mt-1">
                              <div className="text-xs">
                                <strong>Important Notes:</strong>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                  <li>Installation always requires a mount. Please provide your own or select one of our options.</li>
                                  <li>When using a customer-provided mount, TV size selection is still required for installation planning.</li>
                                  <li>Mount prices vary based on the size of your TV and the type of mount selected.</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Wall Material</label>
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
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Additional Services</label>
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="outletNeeded" 
                                  checked={newTvOutletNeeded}
                                  onCheckedChange={(checked) => setNewTvOutletNeeded(checked === true)}
                                />
                                <Label htmlFor="outletNeeded">Wire Concealment & Outlet (+$100)</Label>
                              </div>
                              
                              {/* Information message for outlet locations */}
                              {newTvLocation === 'fireplace' && newTvOutletNeeded && (
                                <div className="mt-3 bg-blue-50 border-l-4 border-blue-400 p-3 rounded-md">
                                  <div className="flex">
                                    <div className="flex-shrink-0">
                                      <Info className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div className="ml-3">
                                      <p className="text-sm text-blue-700">
                                        <strong>Important:</strong> For fireplace installations with wire concealment, 
                                        please email or text a picture of the nearest outlets to your fireplace.
                                      </p>
                                      <p className="text-sm text-blue-700 mt-2">
                                        Send to: <span className="font-medium">pptvinstall@gmail.com</span> or 
                                        <span className="font-medium"> (404) 702-4748</span>
                                      </p>
                                      <p className="text-sm text-blue-700 mt-2">
                                        Include your name and appointment date in the message to help us prepare for your installation.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
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
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            <span className="font-medium">Select Date</span>
                          </div>
                          <Button 
                            type="button" 
                            size="sm"
                            variant="outline"
                            onClick={findNextAvailableTimeSlot}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Next Available Time
                          </Button>
                        </div>
                        <div id="date-selection" className="calendar-container relative">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              // Reset selected time when the date changes
                              setSelectedTime(undefined); 
                              // Update the selected date
                              setSelectedDate(date);
                              // Clear any cached availability data
                              setTimeSlotAvailability({});
                            }}
                            disabled={(date) => {
                              // Disable dates in the past
                              const isPastDate = date < new Date(new Date().setHours(0, 0, 0, 0));
                              if (isPastDate) return true;
                              
                              if (!date) return true;
                              
                              // Check if business hours exist for this day by using the function from our hook
                              const dayOfWeek = date.getDay();
                              // We're using the proper imported function here
                              const hoursForDay = getBusinessHoursForDay(dayOfWeek);
                              
                              // If no business hours set for this day or marked as unavailable
                              if (!hoursForDay || !hoursForDay.isAvailable) {
                                return true;
                              }
                              
                              return false;
                            }}
                            className="rounded-md border mx-auto w-full"
                          />
                        </div>
                      </div>

                      {/* Time Selection */}
                      <div id="time-selection" className="relative">
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
                          Date: <span className="font-medium">{safeFormatDate(selectedDate, 'EEEE, MMMM d, yyyy', 'No date selected')}</span>
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
                        <div className="flex items-center justify-between">
                          <h3 className="text-base sm:text-lg font-medium flex items-center">
                            <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            Personal Information
                          </h3>
                          <BookingAutofill onAutofill={handleAutofill} />
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <label htmlFor="customer-name" className="text-sm font-medium">
                              Full Name
                            </label>
                            <Input
                              id="customer-name"
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
                            <label htmlFor="customer-email" className="text-sm font-medium">
                              Email Address
                            </label>
                            <div className="flex items-center relative">
                              <Mail className="absolute left-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="customer-email"
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
                            <label htmlFor="customer-phone" className="text-sm font-medium">
                              Phone Number
                            </label>
                            <div className="flex items-center relative">
                              <Phone className="absolute left-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="customer-phone"
                                name="phone"
                                type="tel"
                                value={formData.phone || ""}
                                onChange={handleInputChange}
                                placeholder="(XXX)-XXX-XXXX"
                                className={`${validationErrors.phone ? "border-destructive" : ""} pl-10 h-10`}
                              />
                            </div>
                            {validationErrors.phone ? (
                              <p className="text-sm text-destructive">
                                {validationErrors.phone[0]}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-1">
                                Format: (XXX)-XXX-XXXX - Number will be formatted automatically as you type
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
                            <label htmlFor="customer-street-address" className="text-sm font-medium">
                              Street Address
                            </label>
                            <Input
                              id="customer-street-address"
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
                            <label htmlFor="customer-city" className="text-sm font-medium">
                              City
                            </label>
                            <Input
                              id="customer-city"
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
                            <label htmlFor="customer-state" className="text-sm font-medium">
                              State
                            </label>
                            <Input
                              id="customer-state"
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
                            <label htmlFor="customer-zipcode" className="text-sm font-medium">
                              ZIP Code
                            </label>
                            <Input
                              id="customer-zipcode"
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
                            id="consent-to-contact"
                            checked={formData.consentToContact}
                            onCheckedChange={(checked) => handleCheckboxChange(checked === true, 'consentToContact')}
                            className={validationErrors.consentToContact ? "border-destructive mt-1" : "mt-1"}
                          />
                          <div className="space-y-1 leading-tight">
                            <label
                              htmlFor="consent-to-contact"
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
                  <ReviewBookingStep
                    tvInstallations={tvServices}
                    tvRemovalService={null}
                    smartHomeInstallations={smartHomeServices}
                    handymanService={null}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    formData={formData}
                    pricingTotal={pricingTotal}
                    onEditServices={() => goToEditServices()}
                    onRemoveService={(type, id) => {
                      // Create updated service arrays
                      let updatedTvServices = [...tvServices];
                      let updatedSmartHomeServices = [...smartHomeServices];
                      
                      if (type === 'tv') {
                        updatedTvServices = tvServices.filter(tv => tv.id !== id);
                        setTvServices(updatedTvServices);
                      } else if (type === 'smartHome') {
                        updatedSmartHomeServices = smartHomeServices.filter(device => device.id !== id);
                        setSmartHomeServices(updatedSmartHomeServices);
                      }
                      
                      // Recalculate pricing based on the updated service arrays
                      calculatePricingTotal(
                        type === 'tv' ? updatedTvServices : tvServices, 
                        type === 'smartHome' ? updatedSmartHomeServices : smartHomeServices
                      );
                      
                      // Toast to confirm removal
                      toast({
                        title: "Service removed",
                        description: "Your estimated total has been updated",
                        variant: "default"
                      });
                    }}
                  />
                )}
                
                {/* Old review step - Remove after verifying the new component works */}
                {false && currentStep === 3 && (
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
                            {safeFormatDate(selectedDate, 'EEE, MMM d, yyyy')}
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
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-muted/30 p-2 sm:p-3 rounded-md">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs sm:text-sm font-medium">Selected Services:</p>
                      <p className="text-xs text-muted-foreground">
                        {tvServices.length} TV{tvServices.length !== 1 ? 's' : ''}, {smartHomeServices.length} Device{smartHomeServices.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs sm:text-sm font-medium">Estimated Total:</p>
                      <p className="text-base sm:text-lg font-bold">{formatPrice(pricingTotal)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevClick}
                    disabled={currentStep === 0 || isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    Previous
                  </Button>

                  <Button
                    onClick={handleNextClick}
                    disabled={isSubmitting || (currentStep === 3 && tvServices.length === 0 && smartHomeServices.length === 0)}
                    className="w-full sm:w-auto"
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

      {/* Booking Confirmation Modal */}
      <BookingConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        bookingData={{
          name: formData.name || "",
          email: formData.email || "",
          phone: formData.phone || "",
          streetAddress: formData.streetAddress || "",
          addressLine2: formData.addressLine2,
          city: formData.city || "",
          state: formData.state || "",
          zipCode: formData.zipCode || "",
          preferredDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : "",
          appointmentTime: selectedTime || "",
          pricingTotal: pricingTotal,
          tvInstallations: tvServices.map(tv => ({
            size: tv.size === 'large' ? '56"+' : '32"-55"',
            mountType: tv.mountType,
            masonryWall: tv.masonryWall,
            highRise: tv.highRise,
            outletNeeded: tv.outletNeeded
          })),
          smartHomeInstallations: smartHomeServices.map(device => ({
            deviceType: device.type,
            location: 'Indoor'
          })) as { deviceType: string; location: string; }[]
        }}
        onConfirm={async () => {
          try {
            // Create the booking data for submission - match the server's expected schema
            const bookingData = {
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              streetAddress: formData.streetAddress,
              addressLine2: formData.addressLine2,
              city: formData.city,
              state: formData.state,
              zipCode: formData.zipCode,
              preferredDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
              appointmentTime: selectedTime,
              notes: formData.notes || '',
              consentToContact: formData.consentToContact,
              serviceType: tvServices.length > 0 ? "TV Installation" : "Smart Home Installation",
              pricingTotal: pricingTotal.toString(),
              // Convert to the format expected by the server
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
                }))
              ],
              // Account creation data
              createAccount: formData.createAccount || false,
              password: formData.createAccount ? formData.password : undefined,

            };

            console.log('Submitting booking data:', bookingData);

            // Submit the booking
            const result = await onSubmit(bookingData);
            
            console.log('Booking submission result:', result);
            
            // Generate and download calendar file after successful booking
            if (result && selectedDate && selectedTime) {
              const calendarEvent = createCalendarEvent({
                ...bookingData,
                customerName: bookingData.name,
                customerEmail: bookingData.email
              });
              downloadICSFile(calendarEvent, `TV_Installation_${bookingData.name.replace(/\s+/g, '_')}`);
            }
            
            // Don't close the modal here - let the BookingConfirmationModal handle state transitions
          } catch (error) {
            console.error('Error submitting booking:', error);
            // Don't close the modal on error - let the user try again
            throw error; // Re-throw to let the modal handle the error state
          }
        }}
        isSubmitting={isSubmitting}
      />
    </div>
    </div>
  );
}