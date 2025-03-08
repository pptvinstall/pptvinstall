import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DateTimeStep } from "@/components/steps/date-time-step";
import { CustomerDetailsStep } from "@/components/steps/customer-details-step";
import { ReviewBookingStep } from "@/components/steps/review-booking-step";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ServiceWizard } from "@/components/ui/service-wizard";
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
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { Checkbox } from "./checkbox";
import { Icons } from "../icons";
import { Badge } from "./badge";
import { motion, AnimatePresence } from "framer-motion";
import { TVInstallation, SmartHomeInstallation } from "@/types/booking";


type BookingWizardProps = {
  onSubmit: (data: any) => Promise<any>;
  isSubmitting: boolean;
  existingBookings?: any[];
  isLoadingBookings?: boolean;
};

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
            className="absolute inset-0 bg-muted"
            aria-hidden="true"
          ></div>
          <div
            className="absolute inset-0 bg-primary transition-all duration-300 ease-in-out"
            style={{
              transform: `scaleX(${
                currentStep > i ? 1 : currentStep === i ? 0.5 : 0
              })`,
              transformOrigin: "left",
            }}
            aria-hidden="true"
          ></div>
        </div>
      );
    }
  }

  return (
    <div className="flex items-center justify-between w-full mb-6">
      {steps}
    </div>
  );
};

const PriceCalculator = React.memo(
  ({
    tvs,
    smartHome,
    distance = 0,
    onUpdate,
    onRemoveService,
    onAddService,
    currentStep = 0,
  }: {
    tvs: TVInstallation[];
    smartHome: SmartHomeInstallation[];
    distance: number;
    onUpdate: (total: number, breakdown: any) => void;
    onRemoveService: (type: "tv" | "smartHome", id: string) => void;
    onAddService: () => void;
    currentStep?: number;
  }) => {
    useEffect(() => {
      const tvCost = tvs.reduce(
        (acc, service) => acc + (service.basePrice || 0),
        0
      );
      const smartHomeCost = smartHome.reduce(
        (acc, service) => acc + (service.basePrice || 0),
        0
      );
      const distanceFee = distance > 30 ? (distance - 30) * 2 : 0;
      const totalCost = tvCost + smartHomeCost + distanceFee;

      const breakdown = {
        tv: tvCost,
        smartHome: smartHomeCost,
        distanceFee,
        total: totalCost,
      };

      onUpdate(totalCost, breakdown);
    }, [tvs, smartHome, distance, onUpdate]);

    const allServices = [...tvs, ...smartHome];

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex justify-between items-center">
            <span>Pricing Summary</span>
            <Badge variant="outline" className="font-normal text-xs">
              {allServices.length} {allServices.length === 1 ? "item" : "items"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2 relative">
          {allServices.length > 0 ? (
            <div className="relative">
              <ScrollArea className="max-h-[200px] pr-3 relative">
                <div className="space-y-3">
                  {allServices.map((service) => (
                    <div
                      key={service.id}
                      className="flex justify-between items-center group"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {service.description}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          ${service.basePrice}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() =>
                            onRemoveService(
                              "type" in service && service.type.includes("mount")
                                ? "tv"
                                : "smartHome",
                              service.id
                            )
                          }
                          title="Remove service"
                        >
                          <Icons.trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
              <div className="rounded-full bg-muted p-3">
                <Icons.fileX className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium">No services selected</div>
              <div className="text-xs text-muted-foreground">
                Add services to see pricing details
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col pt-0">
          {allServices.length > 0 && (
            <div className="w-full">
              <Separator className="my-2" />
              <div className="flex justify-between items-center py-2">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-xl text-primary">
                  $
                  {allServices
                    .reduce((acc, service) => acc + service.basePrice, 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>
          )}
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={onAddService}
            disabled={allServices.length === 0 && currentStep > 0}
          >
            <Icons.add className="mr-2 h-4 w-4" />
            {allServices.length === 0 ? "Add Services" : "Add More Services"}
          </Button>
        </CardFooter>
      </Card>
    );
  }
);


const ServiceSelectionStep = React.memo(
  ({
    onServiceSelect,
  }: {
    onServiceSelect: (
      type: "tv" | "smartHome",
      service: TVInstallation | SmartHomeInstallation
    ) => void;
    onContinue: () => void;
  }) => {
    const tvInstallations: TVInstallation[] = [
      {
        id: "tv-mount-1",
        name: "TV Wall Mounting (Up to 55\")",
        description: "Standard wall mounting for TVs up to 55 inches",
        type: "mount",
        basePrice: 99,
      },
      {
        id: "tv-mount-2",
        name: "TV Wall Mounting (56-75\")",
        description: "Standard wall mounting for TVs 56-75 inches",
        type: "mount",
        basePrice: 129,
      },
      {
        id: "tv-mount-3",
        name: "TV Wall Mounting (76\"+ or Heavy)",
        description: "Wall mounting for TVs 76 inches and larger or heavy TVs",
        type: "mount",
        basePrice: 199,
      },
      {
        id: "tv-unmount-1",
        name: "TV Unmounting",
        description: "Removal of an existing TV from wall mount",
        type: "unmount",
        basePrice: 49,
      },
      {
        id: "tv-remount-1",
        name: "TV Remounting",
        description: "Moving an existing TV to a new location",
        type: "remount",
        basePrice: 149,
      },
      {
        id: "tv-outlet-1",
        name: "In-Wall Power Outlet",
        description: "Professional installation of in-wall power management",
        type: "outlet",
        basePrice: 149,
      },
    ];

    const smartHomeInstallations: SmartHomeInstallation[] = [
      {
        id: "smart-camera-1",
        name: "Security Camera Installation",
        description: "Install and setup of security cameras",
        type: "camera",
        basePrice: 99,
      },
      {
        id: "smart-doorbell-1",
        name: "Smart Doorbell Installation",
        description: "Install and configure video doorbell",
        type: "doorbell",
        basePrice: 79,
      },
      {
        id: "smart-light-1",
        name: "Smart Lighting Setup",
        description: "Installation of smart lighting systems",
        type: "lighting",
        basePrice: 89,
      },
    ];

    return (
      <div className="space-y-6">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            Book Your Installation
          </h1>
          <p className="text-muted-foreground">
            Choose from our professional installation services
          </p>
        </div>

        <ServiceSelectionGrid
          onServiceSelect={onServiceSelect}
          tvInstallations={tvInstallations}
          smartHomeInstallations={smartHomeInstallations}
        />
      </div>
    );
  }
);

const DateTimeSelectionStep = React.memo(
  ({
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    isBookingsLoading,
    timeSlots,
    isTimeSlotAvailable,
  }: {
    selectedDate: Date | undefined;
    setSelectedDate: (date: Date | undefined) => void;
    selectedTime: string | undefined;
    setSelectedTime: (time: string | undefined) => void;
    isBookingsLoading: boolean;
    timeSlots: string[];
    isTimeSlotAvailable: (date: string, time: string) => boolean;
  }) => {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Select Date & Time</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Choose a preferred date and time for your installation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="md:col-span-3">
            <CardContent className="pt-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Available Time Slots
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isBookingsLoading ? (
                <div className="flex justify-center py-6">
                  <LoadingSpinner />
                </div>
              ) : !selectedDate ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  Please select a date first
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map((time) => {
                    const isAvailable = isTimeSlotAvailable(
                      format(selectedDate, "yyyy-MM-dd"),
                      time
                    );
                    return (
                      <Button
                        key={time}
                        variant={
                          selectedTime === time ? "default" : "outline"
                        }
                        className={cn(
                          "w-full justify-center",
                          !isAvailable &&
                            "opacity-50 cursor-not-allowed hover:bg-background hover:text-foreground"
                        )}
                        onClick={() => {
                          if (isAvailable) {
                            setSelectedTime(time);
                          }
                        }}
                        disabled={!isAvailable}
                      >
                        {time}
                      </Button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {selectedDate && selectedTime && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="font-medium">
              Your appointment:{" "}
              <span className="font-bold">
                {format(selectedDate, "EEEE, MMMM d, yyyy")} at {selectedTime}
              </span>
            </p>
          </div>
        )}
      </div>
    );
  }
);

const CustomerDetailsStep = React.memo(
  ({
    formData,
    setFormData,
    validationErrors,
  }: {
    formData: any;
    setFormData: (data: any) => void;
    validationErrors: Record<string, string[]>;
  }) => {
    const showError = (field: string) => {
      return validationErrors[field] ? (
        <p className="text-xs mt-1 text-destructive">
          {validationErrors[field][0]}
        </p>
      ) : null;
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Your Details</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Please provide your contact and address information
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Full Name*
              </Label>
              <Input
                id="name"
                placeholder="John Smith"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className={validationErrors.name ? "border-destructive" : ""}
              />
              {showError("name")}
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address*
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className={validationErrors.email ? "border-destructive" : ""}
              />
              {showError("email")}
            </div>
          </div>

          <div>
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone Number*
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(123) 456-7890"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className={validationErrors.phone ? "border-destructive" : ""}
            />
            {showError("phone")}
          </div>

          <div>
            <Label htmlFor="streetAddress" className="text-sm font-medium">
              Street Address*
            </Label>
            <Input
              id="streetAddress"
              placeholder="123 Main St"
              value={formData.streetAddress}
              onChange={(e) =>
                setFormData({ ...formData, streetAddress: e.target.value })
              }
              className={
                validationErrors.streetAddress ? "border-destructive" : ""
              }
            />
            {showError("streetAddress")}
          </div>

          <div>
            <Label htmlFor="addressLine2" className="text-sm font-medium">
              Apartment, Suite, etc. (optional)
            </Label>
            <Input
              id="addressLine2"
              placeholder="Apt #123"
              value={formData.addressLine2}
              onChange={(e) =>
                setFormData({ ...formData, addressLine2: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city" className="text-sm font-medium">
                City*
              </Label>
              <Input
                id="city"
                placeholder="Los Angeles"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className={validationErrors.city ? "border-destructive" : ""}
              />
              {showError("city")}
            </div>
            <div>
              <Label htmlFor="state" className="text-sm font-medium">
                State*
              </Label>
              <Select
                value={formData.state}
                onValueChange={(value) =>
                  setFormData({ ...formData, state: value })
                }
              >
                <SelectTrigger
                  id="state"
                  className={validationErrors.state ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {[
                      "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
                      "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
                      "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
                      "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
                      "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
                    ].map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {showError("state")}
            </div>
            <div>
              <Label htmlFor="zipCode" className="text-sm font-medium">
                ZIP Code*
              </Label>
              <Input
                id="zipCode"
                placeholder="90001"
                value={formData.zipCode}
                onChange={(e) =>
                  setFormData({ ...formData, zipCode: e.target.value })
                }
                className={validationErrors.zipCode ? "border-destructive" : ""}
              />
              {showError("zipCode")}
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              Additional Notes (optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Any special instructions or requests..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
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
      </div>
    );
  }
);

const ReviewBookingStep = React.memo(
  ({
    tvInstallations,
    smartHomeInstallations,
    selectedDate,
    selectedTime,
    formData,
    pricingTotal,
  }: {
    tvInstallations: TVInstallation[];
    smartHomeInstallations: SmartHomeInstallation[];
    selectedDate: Date | undefined;
    selectedTime: string | undefined;
    formData: any;
    pricingTotal: number;
  }) => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Review Your Booking</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Please review your information before confirming
        </p>
      </div>

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
            <div className="mt-1 space-y-1">
              {[...tvInstallations, ...smartHomeInstallations].map((service) => (
                <div key={service.id} className="flex justify-between text-sm">
                  <span>{service.name}</span>
                  <span>${service.basePrice}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <h4 className="font-medium">Name</h4>
              <p>{formData.name}</p>
            </div>
            <div>
              <h4 className="font-medium">Email</h4>
              <p>{formData.email}</p>
            </div>
            <div>
              <h4 className="font-medium">Phone</h4>
              <p>{formData.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Installation Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <p>{formData.streetAddress}</p>
            {formData.addressLine2 && <p>{formData.addressLine2}</p>}
            <p>
              {formData.city}, {formData.state} {formData.zipCode}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm space-y-2">
        <p>
          By clicking "Confirm Booking", you agree to our <a href="/terms" className="text-primary underline">Terms of Service</a> and acknowledge our <a href="/privacy" className="text-primary underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
);

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
  const [timeSlotAvailability, setTimeSlotAvailability] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const { toast } = useToast();
  const steps = [
    "Service Selection",
    "Date & Time",
    "Your Details",
    "Review & Book"
  ];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const timeSlots = [
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
    "5:00 PM",
    "6:00 PM"
  ];

  const checkTimeSlotAvailability = useCallback(
    (date: string, time: string) => {
      const now = new Date();
      const selectedDateTime = new Date(`${date}T${time.replace(/AM|PM/, '')}`);

      selectedDateTime.setHours(
        time.includes("PM") && !time.startsWith("12") 
          ? selectedDateTime.getHours() + 12 
          : time.includes("AM") && time.startsWith("12")
          ? 0
          : selectedDateTime.getHours()
      );

      const bufferTime = new Date(now.getTime() + 30 * 60 * 1000);

      if (selectedDateTime <= bufferTime) {
        return false;
      }

      if (existingBookings && existingBookings.length > 0) {
        const isBooked = existingBookings.some(booking => {
          const bookingDate = booking.preferredDate ? 
            new Date(booking.preferredDate).toISOString().split('T')[0] : null;
          return bookingDate === date && booking.appointmentTime === time && booking.status === 'active';
        });
        return !isBooked;
      }

      return true;
    },
    [existingBookings]
  );

  useEffect(() => {
    if (!selectedDate) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const updatedAvailability: Record<string, boolean> = {};
    const dateStrFinal = dateStr; 

    timeSlots.forEach(time => {
      const key = `${dateStrFinal}-${time}`;
      updatedAvailability[key] = checkTimeSlotAvailability(dateStrFinal, time);
    });

    setTimeSlotAvailability(prev => {
      let isDifferent = false;
      Object.entries(updatedAvailability).forEach(([key, value]) => {
        if (prev[key] !== value) {
          isDifferent = true;
        }
      });

      return isDifferent ? { ...prev, ...updatedAvailability } : prev;
    });
  }, [selectedDate, timeSlots, checkTimeSlotAvailability]);

  const isTimeSlotAvailable = useCallback(
    (date: string, time: string) => {
      const key = `${date}-${time}`;

      if (timeSlotAvailability[key] !== undefined) {
        return timeSlotAvailability[key];
      }

      return checkTimeSlotAvailability(date, time);
    },
    [timeSlotAvailability, checkTimeSlotAvailability]
  );

  const handleServiceSelect = (
    type: "tv" | "smartHome",
    service: TVInstallation | SmartHomeInstallation
  ) => {
    if (type === "tv") {
      setTvInstallations(prev => [...prev, service as TVInstallation]);
    } else {
      setSmartHomeInstallations(prev => [...prev, service as SmartHomeInstallation]);
    }
  };

  const handleRemoveService = (type: "tv" | "smartHome", id: string) => {
    if (type === "tv") {
      setTvInstallations(prev => prev.filter(service => service.id !== id));
    } else {
      setSmartHomeInstallations(prev => prev.filter(service => service.id !== id));
    }
  };

  const handleAddService = () => {
    setCurrentStep(0); 
  };

  const handlePricingUpdate = useCallback((total: number, breakdown: any) => {
    setPricingTotal(total);
  }, []);

  const validateCustomerDetails = useCallback(() => {
    const errors: Record<string, string[]> = {};

    if (!formData.name.trim()) {
      errors.name = ["Name is required"];
    }

    if (!formData.email.trim()) {
      errors.email = ["Email is required"];
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = ["Please enter a valid email address"];
    }

    if (!formData.phone.trim()) {
      errors.phone = ["Phone number is required"];
    }

    if (!formData.streetAddress.trim()) {
      errors.streetAddress = ["Street address is required"];
    }

    if (!formData.city.trim()) {
      errors.city = ["City is required"];
    }

    if (!formData.state) {
      errors.state = ["State is required"];
    }

    if (!formData.zipCode.trim()) {
      errors.zipCode = ["ZIP code is required"];
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode.trim())) {
      errors.zipCode = ["Please enter a valid ZIP code"];
    }

    const errorsString = JSON.stringify(errors);
    const currentErrorsString = JSON.stringify(validationErrors);

    if (errorsString !== currentErrorsString) {
      setValidationErrors(errors);
    }

    return Object.keys(errors).length === 0;
  }, [formData, validationErrors]);

  const checkBasicProceedEligibility = (step: number, 
    tvs: TVInstallation[], 
    smartHomes: SmartHomeInstallation[], 
    date?: Date, 
    time?: string) => {

    switch (step) {
      case 0: 
        return tvs.length > 0 || smartHomes.length > 0;
      case 1: 
        return date !== undefined && time !== undefined;
      case 2: 
        return true;
      default:
        return true;
    }
  };

  const canProceedBasicValue = useMemo(() => {
    return checkBasicProceedEligibility(
      currentStep, 
      tvInstallations, 
      smartHomeInstallations, 
      selectedDate, 
      selectedTime
    );
  }, [currentStep, tvInstallations, smartHomeInstallations, selectedDate, selectedTime]);

  const canProceed = useCallback(() => {
    if (currentStep === 2) {
      return validateCustomerDetails();
    }

    return canProceedBasicValue;
  }, [currentStep, canProceedBasicValue, validateCustomerDetails]);

  const handleSubmit = useCallback(async () => {
    if (!canProceed()) {
      toast({
        title: "Please complete all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const allServices = [...tvInstallations, ...smartHomeInstallations];
      const serviceType = allServices.map(service => service.name).join('; ');

      const bookingData = {
        ...formData,
        serviceType,
        preferredDate: selectedDate?.toISOString(),
        appointmentTime: selectedTime,
        status: 'active',
        pricingTotal,
        pricingBreakdown: {
          services: allServices.map(service => ({
            name: service.name,
            price: service.basePrice
          })),
          total: pricingTotal
        }
      };

      await onSubmit(bookingData);
    } catch (error) {
      console.error("Error submitting booking:", error);
      toast({
        title: "Error submitting booking",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  }, [
    canProceed,
    formData,
    tvInstallations,
    smartHomeInstallations,
    selectedDate,
    selectedTime,
    pricingTotal,
    onSubmit,
    toast
  ]);

  const handleNextClick = useCallback(() => {
    if (currentStep === 2) {
      if (validateCustomerDetails()) {
        setCurrentStep(3);
      }
    } else if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  }, [currentStep, handleSubmit, validateCustomerDetails, steps.length]);

  const allBookings = existingBookings.length > 0 ? existingBookings : [];
  const isBookingsLoading = isLoadingBookings || false;

  const isCalendarLoading = false; 

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="w-full booking-wizard-container mx-auto">
      <div className="space-y-6">
        <StepIndicator currentStep={currentStep} totalSteps={steps.length} />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial="initial"
            animate="in"
            exit="exit"
            variants={pageVariants}
            transition={{ duration: 0.3 }}
          >
            <div className="booking-step-grid grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card className="md:col-span-3 p-6 wizard-step">
                {currentStep === 0 && (
                  <ServiceWizard
                    onComplete={handleServiceSelection}
                  />
                )}

                {currentStep === 1 && (
                  <DateTimeStep
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
                  distance={0} 
                  onUpdate={handlePricingUpdate}
                  onRemoveService={handleRemoveService}
                  onAddService={handleAddService}
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
                    disabled={isSubmitting || (currentStep < steps.length - 1 && !canProceed())}
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
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}