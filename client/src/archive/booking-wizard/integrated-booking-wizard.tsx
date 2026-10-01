import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, addDays } from "date-fns";
import { 
  Check, X, Tv, Zap, Wrench, MinusCircle, Plus, 
  Hammer, Speaker, Cable, Trash2,
  Video, Bell, Lightbulb, ChevronRight, MapPin, Calendar as CalendarIcon,
  Info, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Separator } from "@/components/ui/separator";
import { useBusinessHours } from "@/hooks/use-business-hours";
import { BookingAutofill } from "./booking-autofill";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { Checkbox } from "./checkbox";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Badge } from "./badge";
import { motion, AnimatePresence } from "framer-motion";
import { BookingConfirmationModal } from "@/components/ui/booking-confirmation-modal";

// --- INTERFACES ---
interface TVServiceOption {
  id: string;
  size: 'small' | 'large';
  location: 'standard' | 'fireplace';
  mountType: 'fixed' | 'tilting' | 'full_motion' | 'customer';
  masonryWall: boolean;
  highRise: boolean;
  outletNeeded: boolean;
  packageType?: 'basic' | 'hardware' | 'clean' | 'total';
  packageName?: string; 
  fireplaceSurface?: 'drywall' | 'masonry';
  fireplacePower?: 'behind' | 'nearby' | 'none';
  fireplaceImage?: File | null;
  addSoundbar: boolean;
  addHdmi: boolean;
}

interface SmartHomeDeviceOption {
  id: string;
  type: 'camera' | 'doorbell' | 'floodlight';
  count: number;
  hasExistingWiring?: boolean;
}

interface TVDeinstallationOption {
  id: string;
  type: 'deinstallation';
  quantity?: number;
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

// --- DYNAMIC TIME SLOT LOGIC ---
const getSlotsForDate = (date: Date) => {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = day === 0 || day === 6;

  if (isWeekend) {
    // Weekends: 10am - 10pm (Showing start times every 2 hours)
    return ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM"];
  } else {
    // Weekdays (M-F): 5:30pm - 9:30pm (Evening hours)
    return ["5:30 PM", "6:30 PM", "7:30 PM", "8:30 PM"];
  }
};

const StepIndicator = ({ currentStep }: { currentStep: number; totalSteps: number }) => {
  const steps = ["Services", "Date & Time", "Details", "Review"];
  return (
    <div className="w-full mb-8 px-4">
      <div className="flex items-center justify-between relative z-10 max-w-2xl mx-auto">
        {steps.map((label, i) => (
          <div key={i} className="flex flex-col items-center group">
            <div 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2 z-20 bg-white",
                currentStep >= i 
                  ? "border-blue-600 text-blue-600 shadow-md scale-110" 
                  : "border-slate-200 text-slate-300"
              )}
            >
              {currentStep > i ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn(
              "text-[10px] mt-2 font-bold uppercase tracking-wider transition-colors duration-300",
              currentStep >= i ? "text-blue-900" : "text-slate-300"
            )}>
              {label}
            </span>
          </div>
        ))}
        <div className="absolute top-4 left-0 w-full h-[2px] bg-slate-100 -z-10" />
        <div 
          className="absolute top-4 left-0 h-[2px] bg-blue-600 -z-10 transition-all duration-500 ease-out" 
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }} 
        />
      </div>
    </div>
  );
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const safeFormatDate = (date: Date | undefined, formatStr: string, fallback: string = 'Not selected') => {
  return date ? format(date, formatStr) : fallback;
};

const getMountPrice = (type: string, size: 'small' | 'large') => {
  if (type === 'customer') return 0;
  if (size === 'small') { 
    if (type === 'fixed') return 30;
    if (type === 'tilting') return 40;
    if (type === 'full_motion') return 60;
  } else { 
    if (type === 'fixed') return 40;
    if (type === 'tilting') return 50;
    if (type === 'full_motion') return 80;
  }
  return 0;
};

// --- MAIN COMPONENT ---
export function IntegratedBookingWizard({
  onSubmit,
  isSubmitting,
  existingBookings = [],
  isLoadingBookings = false
}: IntegratedBookingWizardProps) {
  
  const [currentStep, setCurrentStep] = useState(0);
  const [tvServices, setTvServices] = useState<TVServiceOption[]>([]);
  const [smartHomeServices, setSmartHomeServices] = useState<SmartHomeDeviceOption[]>([]);
  const [tvDeinstallations, setTvDeinstallations] = useState<TVDeinstallationOption[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [takenTimes, setTakenTimes] = useState<string[]>([]);
  const [pricingTotal, setPricingTotal] = useState(0);
  const [formData, setFormData] = useState<BookingFormData>({
    name: "", email: "", phone: "", streetAddress: "", addressLine2: "",
    city: "", state: "", zipCode: "", notes: "", 
    consentToContact: false, createAccount: false, password: "", confirmPassword: ""
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [isEditingTvId, setIsEditingTvId] = useState<string | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const { toast } = useToast();
  
  // Calculate specific time slots for the currently selected date
  const availableTimeSlots = useMemo(() => {
    return selectedDate ? getSlotsForDate(selectedDate) : [];
  }, [selectedDate]);

  // --- LOGIC ---
  const addTvPackage = (packageType: 'basic' | 'hardware' | 'clean' | 'total', packageName: string) => {
    const uniqueId = `tv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newTv: TVServiceOption = {
      id: uniqueId,
      packageType,
      packageName, 
      size: 'small',
      location: 'standard',
      mountType: (packageType === 'hardware' || packageType === 'total') ? 'fixed' : 'customer',
      masonryWall: false,
      highRise: false,
      outletNeeded: (packageType === 'clean' || packageType === 'total'),
      fireplaceSurface: 'drywall',
      fireplacePower: 'behind', 
      addSoundbar: false,
      addHdmi: false
    };
    setTvServices(prev => [...prev, newTv]);
    setIsEditingTvId(newTv.id);
  };

  const addSmartHome = (type: 'camera' | 'doorbell' | 'floodlight') => {
    const uniqueId = `sh-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setSmartHomeServices(prev => [...prev, { id: uniqueId, type, count: 1 }]);
    toast({ title: "Item Added", description: "Added to your services list." });
  };

  const addDeinstall = () => {
    const uniqueId = `de-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setTvDeinstallations(prev => [...prev, { id: uniqueId, type: 'deinstallation', quantity: 1 }]);
    toast({ title: "TV Removal Added", description: "Configure quantity below." });
  };

  const updateTvService = (id: string, updates: Partial<TVServiceOption>) => {
    setTvServices(prev => prev.map(tv => {
      if (tv.id !== id) return tv;
      const updatedTv = { ...tv, ...updates };
      if ((updatedTv.packageType === 'clean' || updatedTv.packageType === 'total') && updatedTv.masonryWall) {
        updatedTv.masonryWall = false; 
      }
      return updatedTv;
    }));
  };

  const calculatePricingTotal = useCallback(() => {
    let total = 0;
    tvServices.forEach(tv => {
      let price = 100;
      if (tv.packageType === 'clean') price = 200; 
      if (tv.packageType === 'total') price = 200; 
      if (tv.packageType === 'hardware' || tv.packageType === 'total') {
        price += getMountPrice(tv.mountType, tv.size);
      }
      if (tv.location === 'fireplace') {
        price += 100;
        if (tv.outletNeeded) {
          if (tv.fireplacePower === 'nearby') price += 100; 
          else if (tv.fireplacePower === 'none') price += 300; 
        }
      }
      if (tv.masonryWall) price += 50;
      if (tv.highRise) price += 25;
      if (tv.addSoundbar) price += 50;
      if (tv.addHdmi) price += 25;
      total += price;
    });
    smartHomeServices.forEach(device => {
      if (device.type === 'camera') total += 75 * device.count;
      if (device.type === 'doorbell') total += 85 * device.count;
      if (device.type === 'floodlight') total += 125 * device.count;
    });
    tvDeinstallations.forEach(d => {
      total += (d.quantity || 1) * 50;
    });
    setPricingTotal(total);
    return total;
  }, [tvServices, smartHomeServices, tvDeinstallations]);

  useEffect(() => {
    calculatePricingTotal();
  }, [calculatePricingTotal]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedDate) {
        setTakenTimes([]);
        return;
      }
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const res = await fetch(`/api/availability?date=${dateStr}`);
        if (res.ok) {
          const data = await res.json();
          setTakenTimes(Array.isArray(data) ? data : []);
        } else {
          setTakenTimes([]);
        }
      } catch {
        setTakenTimes([]);
      }
    };
    fetchAvailability();
  }, [selectedDate]);

  const findNextASAP = async () => {
    const today = new Date();
    toast({ title: "Checking schedule...", description: "Looking for the earliest opening." });

    for (let i = 0; i < 14; i++) {
      const checkDate = addDays(today, i);
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      
      // Get the correct slots for THIS specific day (Weekday vs Weekend)
      const slotsForDay = getSlotsForDate(checkDate);

      try {
        const res = await fetch(`/api/availability?date=${dateStr}`);
        const takenSlots: string[] = await res.json();
        const freeSlot = slotsForDay.find(slot => !takenSlots.includes(slot));

        if (freeSlot) {
          setSelectedDate(checkDate);
          setSelectedTime(freeSlot);
          toast({ 
            title: "Earliest Slot Found!", 
            description: `${format(checkDate, 'EEEE, MMM do')} @ ${freeSlot}`,
            className: "bg-green-50 border-green-200 text-green-800"
          });
          return;
        }
      } catch (err) {
        console.error("Skipping date due to error", err);
      }
    }
    toast({ title: "No ASAP slots found", description: "Please browse the calendar manually." });
  };

  const handleNext = () => {
    if (currentStep === 0 && tvServices.length === 0 && smartHomeServices.length === 0 && tvDeinstallations.length === 0) {
      toast({ title: "Please select a service", variant: "destructive" });
      return;
    }
    if (currentStep === 1 && (!selectedDate || !selectedTime)) {
      toast({ title: "Please select date & time", variant: "destructive" });
      return;
    }
    if (currentStep === 2) {
      const errors: any = {};
      if (!formData.name) errors.name = ["Required"];
      if (!formData.email || !formData.email.includes('@')) errors.email = ["Valid email required"];
      if (!formData.phone) errors.phone = ["Required"];
      if (!formData.streetAddress) errors.streetAddress = ["Required"];
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        toast({ title: "Please fill in all required fields", variant: "destructive" });
        return;
      }
    }
    if (currentStep === 3) {
      submitBooking();
      return;
    }
    setCurrentStep(c => c + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitBooking = async () => {
    const sanitizedTvs = tvServices.map(tv => {
      const { fireplaceImage, ...rest } = tv; 
      return {
        name: tv.packageName || `TV Install (${tv.packageType})`, 
        type: 'mount',
        ...rest,
        hasFireplaceImage: !!fireplaceImage 
      };
    });

    const payload = {
       ...formData,
       preferredDate: safeFormatDate(selectedDate, 'yyyy-MM-dd', ''),
       appointmentTime: selectedTime,
       serviceType: "TV Installation",
       pricingTotal,
       tvInstallations: sanitizedTvs,
       smartHomeInstallations: smartHomeServices,
       tvDeinstallationServices: tvDeinstallations,
       status: "active" 
    };

    try {
      await onSubmit(payload);
    } catch (e) {
      console.error("Submission Error in Wizard:", e);
    }
  };

  const generateScopeOfWork = () => {
    const parts = [];
    parts.push(`We will arrive on ${safeFormatDate(selectedDate, 'EEEE, MMMM do')} at ${selectedTime} at ${formData.streetAddress}.`);
    
    if (tvServices.length > 0) {
      parts.push("Installations:");
      const tvDesc = tvServices.map((tv, i) => {
         let d = `• TV ${i+1}: ${tv.size === 'small' ? '32"-55"' : '56"+'} (${tv.packageName})`;
         if(tv.mountType === 'customer') {
           d += " using Customer's Mount";
         } else {
           d += ` using our ${tv.mountType.replace('_', ' ').toUpperCase()} Mount`;
         }
         if (tv.location === 'fireplace') {
           d += " over Fireplace";
           if(tv.fireplaceSurface === 'masonry') d += " (Masonry)";
         } else {
           d += " on Standard Wall";
         }
         const extras = [];
         if(tv.packageType === 'clean' || tv.packageType === 'total') extras.push("Hidden Wires");
         if(tv.addSoundbar) extras.push("Soundbar");
         if(tv.addHdmi) extras.push("HDMI Cable");
         if(extras.length > 0) d += ` with ${extras.join(' & ')}`;
         return d;
      }).join("\n");
      parts.push(tvDesc);
    }
    
    if (smartHomeServices.length > 0) {
      const shDesc = smartHomeServices.map(s => `• ${s.count}x ${s.type}`).join("\n");
      parts.push(`Smart Home:\n${shDesc}`);
    }
    
    parts.push("Our tech will bring all necessary tools and hardware selected.");
    return parts.join("\n");
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-32">
      <StepIndicator currentStep={currentStep} totalSteps={4} />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* STEP 1: SERVICES */}
          {currentStep === 0 && (
            <div className="space-y-8">
              <div className="space-y-4">
                 <h2 className="text-xl font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                   <Tv className="h-5 w-5 text-blue-600"/>
                   TV Installation
                 </h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group h-full flex flex-col" onClick={() => addTvPackage('basic', 'Basic Mounting')}>
                    <div className="p-4 flex flex-col h-full text-center">
                      <div className="mx-auto bg-slate-100 p-2 rounded-full mb-3 group-hover:bg-blue-50 text-blue-600"><Tv className="h-5 w-5" /></div>
                      <h3 className="font-bold">Basic Mounting</h3>
                      <div className="text-xl font-bold text-blue-600 my-1">$100</div>
                      <p className="text-xs text-slate-500 mb-4 flex-grow font-medium">Customer provides TV & Mount.</p>
                      <Button variant="outline" size="sm" className="w-full mt-auto">Add</Button>
                    </div>
                  </Card>
                   <Card className="cursor-pointer hover:border-slate-800 hover:shadow-lg transition-all group h-full flex flex-col" onClick={() => addTvPackage('hardware', 'Hardware Bundle')}>
                    <div className="p-4 flex flex-col h-full text-center">
                      <div className="mx-auto bg-slate-100 p-2 rounded-full mb-3 group-hover:bg-slate-800 group-hover:text-white transition-colors text-slate-700"><Hammer className="h-5 w-5" /></div>
                      <h3 className="font-bold">Hardware Bundle</h3>
                      <div className="text-xl font-bold text-slate-800 my-1">$130+</div>
                      <p className="text-xs text-slate-500 mb-4 flex-grow font-medium">We provide the Mount. You provide the TV.</p>
                      <Button variant="outline" size="sm" className="w-full mt-auto">Add</Button>
                    </div>
                  </Card>
                  <Card className="cursor-pointer border-blue-500 shadow-md relative group bg-blue-50/30 h-full flex flex-col" onClick={() => addTvPackage('clean', 'Concealment Package')}>
                    <div className="absolute top-0 inset-x-0 h-1 bg-blue-500" />
                    <div className="p-4 flex flex-col h-full text-center">
                      <div className="mx-auto bg-blue-100 p-2 rounded-full mb-3 text-blue-600"><Zap className="h-5 w-5" /></div>
                      <h3 className="font-bold">Concealment Package</h3>
                      <div className="text-xl font-bold text-blue-600 my-1">$200</div>
                      <p className="text-xs text-slate-500 mb-4 flex-grow font-medium">Mounting + <span className="font-bold text-blue-700">Hidden Wires</span>. (Cust. Mount)</p>
                      <Button size="sm" className="w-full mt-auto bg-blue-600 hover:bg-blue-700">Add</Button>
                    </div>
                  </Card>
                  <Card className="cursor-pointer hover:border-slate-900 hover:shadow-lg transition-all group h-full flex flex-col" onClick={() => addTvPackage('total', 'Premium Package')}>
                    <div className="p-4 flex flex-col h-full text-center">
                      <div className="mx-auto bg-slate-900 p-2 rounded-full mb-3 text-white"><Wrench className="h-5 w-5" /></div>
                      <h3 className="font-bold">Premium Package</h3>
                      <div className="text-xl font-bold text-slate-900 my-1">$200 + Mnt</div>
                      <p className="text-xs text-slate-500 mb-4 flex-grow font-medium">Everything included. Mount + Hidden Wires.</p>
                      <Button variant="outline" size="sm" className="w-full mt-auto group-hover:bg-slate-900 group-hover:text-white">Add</Button>
                    </div>
                  </Card>
                </div>
              </div>
              <div className="space-y-4">
                 <h2 className="text-xl font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                   <Video className="h-5 w-5 text-blue-600"/>
                   Smart Home
                 </h2>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="cursor-pointer hover:border-blue-500 transition-all flex flex-col" onClick={() => addSmartHome('camera')}>
                       <div className="p-4 flex items-center gap-4">
                          <div className="bg-slate-100 p-2 rounded-full text-slate-700"><Video className="h-5 w-5"/></div>
                          <div><div className="font-bold">Security Camera</div><div className="text-blue-600 font-bold">$75</div></div>
                          <Plus className="ml-auto h-4 w-4 text-slate-400"/>
                       </div>
                    </Card>
                    <Card className="cursor-pointer hover:border-blue-500 transition-all flex flex-col" onClick={() => addSmartHome('doorbell')}>
                       <div className="p-4 flex items-center gap-4">
                          <div className="bg-slate-100 p-2 rounded-full text-slate-700"><Bell className="h-5 w-5"/></div>
                          <div><div className="font-bold">Video Doorbell</div><div className="text-blue-600 font-bold">$85</div></div>
                          <Plus className="ml-auto h-4 w-4 text-slate-400"/>
                       </div>
                    </Card>
                    <Card className="cursor-pointer hover:border-blue-500 transition-all flex flex-col" onClick={() => addSmartHome('floodlight')}>
                       <div className="p-4 flex items-center gap-4">
                          <div className="bg-slate-100 p-2 rounded-full text-slate-700"><Lightbulb className="h-5 w-5"/></div>
                          <div><div className="font-bold">Floodlight Cam</div><div className="text-blue-600 font-bold">$125</div></div>
                          <Plus className="ml-auto h-4 w-4 text-slate-400"/>
                       </div>
                    </Card>
                 </div>
              </div>
               <div className="space-y-4">
                 <h2 className="text-xl font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                   <Trash2 className="h-5 w-5 text-blue-600"/>
                   Removal
                 </h2>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="cursor-pointer hover:border-red-500 transition-all flex flex-col" onClick={addDeinstall}>
                       <div className="p-4 flex items-center gap-4">
                          <div className="bg-red-50 p-2 rounded-full text-red-500"><Trash2 className="h-5 w-5"/></div>
                          <div><div className="font-bold">TV De-Installation</div><div className="text-red-500 font-bold">$50</div></div>
                          <Plus className="ml-auto h-4 w-4 text-slate-400"/>
                       </div>
                    </Card>
                 </div>
               </div>
              {tvServices.length + smartHomeServices.length + tvDeinstallations.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 border space-y-4">
                   <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Your Selections</h3>
                   {tvServices.map((tv, idx) => (
                    <Card key={tv.id} className="p-4 relative">
                      {isEditingTvId === tv.id ? (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex justify-between items-center border-b pb-2">
                            <h4 className="font-bold text-blue-900">Configure TV {idx + 1}</h4>
                            <Button variant="ghost" size="sm" onClick={() => setIsEditingTvId(null)}><Check className="h-4 w-4 mr-1"/> Done</Button>
                          </div>
                          <div className="grid gap-2">
                             <Label className="font-bold">TV Size</Label>
                             <RadioGroup value={tv.size} onValueChange={(v: any) => updateTvService(tv.id, { size: v })} className="grid grid-cols-2 gap-3">
                               <label className={cn("flex items-center justify-between border-2 rounded-lg p-3 cursor-pointer hover:bg-slate-50", tv.size === 'small' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200')}><span className="text-sm font-medium">32" - 55"</span><RadioGroupItem value="small" id={`s-${tv.id}`} /></label>
                               <label className={cn("flex items-center justify-between border-2 rounded-lg p-3 cursor-pointer hover:bg-slate-50", tv.size === 'large' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200')}><span className="text-sm font-medium">56" or Larger</span><RadioGroupItem value="large" id={`l-${tv.id}`} /></label>
                             </RadioGroup>
                          </div>
                          {(tv.packageType === 'hardware' || tv.packageType === 'total') && (
                            <div className="grid gap-2">
                              <Label className="font-bold">Mount Type (Included)</Label>
                              <RadioGroup value={tv.mountType} onValueChange={(v: any) => updateTvService(tv.id, { mountType: v })} className="grid grid-cols-3 gap-2">
                                 {['fixed', 'tilting', 'full_motion'].map((type) => (
                                    <label key={type} className={cn("border-2 rounded-md p-2 cursor-pointer hover:bg-slate-50", tv.mountType === type && "border-blue-500 bg-blue-50")}>
                                      <RadioGroupItem value={type} className="sr-only"/>
                                      <div className="font-bold text-sm capitalize">{type.replace('_', ' ')}</div>
                                      <Badge variant="secondary" className="text-[10px] mt-1">+${getMountPrice(type, tv.size)}</Badge>
                                    </label>
                                 ))}
                              </RadioGroup>
                            </div>
                          )}
                          <div className="bg-slate-50 p-4 rounded-lg space-y-4">
                             <div className="flex items-center space-x-2">
                                <Checkbox id={`fp-${tv.id}`} checked={tv.location === 'fireplace'} onCheckedChange={(c) => updateTvService(tv.id, { location: c ? 'fireplace' : 'standard' })} />
                                <Label htmlFor={`fp-${tv.id}`} className="font-bold cursor-pointer">Over Fireplace? (+$100)</Label>
                             </div>
                             {tv.location === 'fireplace' && tv.outletNeeded && (
                               <div className="ml-6 space-y-2 pt-2 border-l-2 border-blue-200 pl-4">
                                  <Label className="text-xs font-bold text-blue-700">Power Outlet Situation?</Label>
                                  <RadioGroup value={tv.fireplacePower} onValueChange={(v:any) => updateTvService(tv.id, { fireplacePower: v })} className="space-y-2">
                                     <div className="flex items-center space-x-2"><RadioGroupItem value="behind" id={`pwr-b-${tv.id}`} /><Label htmlFor={`pwr-b-${tv.id}`}>Behind TV (+$0)</Label></div>
                                     <div className="flex items-center space-x-2"><RadioGroupItem value="nearby" id={`pwr-n-${tv.id}`} /><Label htmlFor={`pwr-n-${tv.id}`}>Nearby (+$100)</Label></div>
                                     <div className="flex items-center space-x-2"><RadioGroupItem value="none" id={`pwr-x-${tv.id}`} /><Label htmlFor={`pwr-x-${tv.id}`}>No Outlet (+$300)</Label></div>
                                  </RadioGroup>
                               </div>
                             )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className={cn("border rounded-md p-3 flex items-center gap-3 cursor-pointer", tv.addSoundbar ? "border-blue-500 bg-blue-50" : "hover:bg-slate-50")} onClick={() => updateTvService(tv.id, { addSoundbar: !tv.addSoundbar })}><Speaker className="h-5 w-5"/> <span className="text-sm font-bold">Soundbar (+$50)</span></div>
                             <div className={cn("border rounded-md p-3 flex items-center gap-3 cursor-pointer", tv.addHdmi ? "border-blue-500 bg-blue-50" : "hover:bg-slate-50")} onClick={() => updateTvService(tv.id, { addHdmi: !tv.addHdmi })}><Cable className="h-5 w-5"/> <span className="text-sm font-bold">HDMI Cable (+$25)</span></div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsEditingTvId(tv.id)}>
                          <div>
                             <div className="font-bold text-slate-900">TV {idx + 1} ({tv.packageName})</div>
                             <div className="text-xs text-slate-500 flex flex-wrap gap-2 mt-1">
                               {tv.mountType !== 'customer' && <Badge variant="secondary">{tv.mountType.toUpperCase()} MOUNT</Badge>}
                               {tv.location === 'fireplace' && <Badge variant="outline" className="border-amber-500 text-amber-600">FIREPLACE</Badge>}
                             </div>
                          </div>
                          <div className="flex gap-2">
                             <Button variant="outline" size="sm">Edit</Button>
                             <Button variant="ghost" size="sm" className="text-red-500" onClick={(e) => { e.stopPropagation(); setTvServices(prev => prev.filter(t => t.id !== tv.id)); }}><Trash2 className="h-4 w-4"/></Button>
                          </div>
                        </div>
                      )}
                    </Card>
                   ))}
                   {smartHomeServices.map((sh) => (
                    <div key={sh.id} className="flex justify-between items-center p-3 border rounded-lg bg-white">
                      <div className="flex items-center gap-3"><Video className="h-5 w-5 text-blue-500"/><div><div className="font-bold text-sm capitalize">{sh.type}</div></div></div>
                      <div className="flex items-center gap-3">
                         <div className="flex items-center gap-2 bg-slate-100 rounded-md p-1">
                            <button onClick={() => setSmartHomeServices(prev => prev.map(p => p.id === sh.id ? {...p, count: Math.max(1, p.count-1)} : p))} className="px-2 font-bold">-</button>
                            <span className="text-sm font-bold w-4 text-center">{sh.count}</span>
                            <button onClick={() => setSmartHomeServices(prev => prev.map(p => p.id === sh.id ? {...p, count: p.count+1} : p))} className="px-2 font-bold">+</button>
                         </div>
                         <Button variant="ghost" size="icon" onClick={() => setSmartHomeServices(prev => prev.filter(p => p.id !== sh.id))}><X className="h-4 w-4"/></Button>
                      </div>
                    </div>
                   ))}
                   {tvDeinstallations.map((de) => (
                    <div key={de.id} className="flex justify-between items-center p-3 border rounded-lg bg-white">
                      <div className="flex items-center gap-3"><MinusCircle className="h-5 w-5 text-red-500"/><div><div className="font-bold text-sm">TV Removal</div></div></div>
                      <div className="flex items-center gap-3">
                         <div className="flex items-center gap-2 bg-slate-100 rounded-md p-1">
                            <button onClick={() => setTvDeinstallations(prev => prev.map(p => p.id === de.id ? {...p, quantity: Math.max(1, (p.quantity||1)-1)} : p))} className="px-2 font-bold">-</button>
                            <span className="text-sm font-bold w-4 text-center">{de.quantity || 1}</span>
                            <button onClick={() => setTvDeinstallations(prev => prev.map(p => p.id === de.id ? {...p, quantity: (p.quantity||1)+1} : p))} className="px-2 font-bold">+</button>
                         </div>
                         <Button variant="ghost" size="icon" onClick={() => setTvDeinstallations(prev => prev.filter(p => p.id !== de.id))}><X className="h-4 w-4"/></Button>
                      </div>
                    </div>
                   ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: DATE & TIME */}
          {currentStep === 1 && (
            <div className="space-y-6">
               <div className="text-center">
                 <h3 className="text-xl font-bold">When should we arrive?</h3>
                 <p className="text-slate-500 text-sm">Select a date. We'll show you who else we're serving!</p>
               </div>
               
               <div className="flex justify-center mb-4">
                  <Button onClick={findNextASAP} className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold shadow-md animate-pulse">
                     <Zap className="h-4 w-4 mr-2"/> Find Earliest Slot (ASAP)
                  </Button>
               </div>

               <div className="bg-white border rounded-lg p-4 flex justify-center">
                 <Calendar
                   mode="single"
                   selected={selectedDate}
                   onSelect={setSelectedDate}
                   disabled={(date) => date < new Date()} 
                   className="rounded-md"
                 />
               </div>

               {selectedDate && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    {/* Time Slot Grid */}
                    <h4 className="font-bold text-center">Available Times</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {availableTimeSlots.map(time => {
                        // Check if time is taken
                        const isTaken = takenTimes.includes(time);
                        return (
                          <Button
                            key={time}
                            variant={selectedTime === time ? "default" : isTaken ? "ghost" : "outline"}
                            disabled={isTaken}
                            onClick={() => setSelectedTime(time)}
                            className={cn("w-full h-auto py-3 flex flex-col items-center", isTaken && "bg-slate-50 opacity-70")}
                          >
                            <span className={cn("text-base font-bold", isTaken && "text-slate-400 decoration-slate-400 line-through")}>{time}</span>
                            {isTaken && (
                              <span className="text-[10px] text-red-500 font-medium">Booked</span>
                            )}
                          </Button>
                        )
                      })}
                    </div>
                 </div>
               )}
            </div>
          )}

          {/* STEP 3 & 4 (Keep logic from previous steps) */}
          {currentStep === 2 && (
             <div className="space-y-6">
                <div className="text-center"><h3 className="text-xl font-bold">Contact Info</h3></div>
                <div className="space-y-4">
                   <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Full Name"/>
                   <BookingAutofill onAutofill={(data) => setFormData(prev => ({...prev, ...data}))} />
                   <Input value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="Email Address"/>
                   <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Phone Number"/>
                   <Input value={formData.streetAddress} onChange={(e) => setFormData({...formData, streetAddress: e.target.value})} placeholder="Street Address"/>
                   <div className="grid grid-cols-3 gap-2">
                     <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="City" />
                     <Input value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} placeholder="State" />
                     <Input value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} placeholder="Zip" />
                   </div>
                   <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Notes (Gate Code, Parking, etc.)"/>
                </div>
             </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <div className="bg-white p-6 rounded-lg space-y-6 border shadow-sm">
                  <div className="text-center">
                    <ShieldCheck className="h-12 w-12 text-green-500 mx-auto mb-2"/>
                    <h3 className="font-bold text-2xl text-slate-900">Final Review</h3>
                    <p className="text-slate-500">Please confirm your appointment details.</p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2"><Info className="h-4 w-4"/> Scope of Work</h4>
                    <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-line">
                      {generateScopeOfWork()}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wider mb-2">Service Location</h4>
                      <p className="font-medium">{formData.name}</p>
                      <p className="text-slate-600">{formData.streetAddress}</p>
                      <p className="text-slate-600">{formData.city}, {formData.state} {formData.zipCode}</p>
                      <p className="text-slate-600">{formData.phone}</p>
                      <p className="text-slate-600">{formData.email}</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wider mb-2">Cost Breakdown</h4>
                      <div className="space-y-1">
                        {tvServices.map((tv, i) => (
                           <div key={i} className="flex justify-between text-sm">
                             <span>TV {i+1} ({tv.packageName || tv.packageType})</span>
                             <span className="text-slate-400">Included</span>
                           </div>
                        ))}
                        {smartHomeServices.map((s, i) => (
                           <div key={i} className="flex justify-between text-sm">
                             <span>{s.type} (x{s.count})</span>
                             <span className="text-slate-400">Included</span>
                           </div>
                        ))}
                      </div>
                      <Separator className="my-2"/>
                      <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900">Total Estimate</span>
                          <span className="font-bold text-xl text-blue-600">{formatPrice(pricingTotal)}</span>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
         <div className="max-w-5xl mx-auto flex items-center justify-between">
           <div className="flex flex-col">
             <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Estimated Total</span>
             <span className="text-2xl font-black text-blue-600 leading-none">{formatPrice(pricingTotal)}</span>
           </div>
           <div className="flex gap-3">
             {currentStep > 0 && <Button variant="outline" size="lg" onClick={() => setCurrentStep(c => c - 1)} disabled={isSubmitting} className="px-3 sm:px-6">Back</Button>}
             <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-6 sm:px-10 text-lg shadow-lg shadow-blue-200" onClick={handleNext} disabled={isSubmitting}>
               {isSubmitting && <LoadingSpinner className="mr-2" />}
               {currentStep === 3 ? "Confirm Booking" : "Next"}
               {currentStep < 3 && <ChevronRight className="ml-2 h-5 w-5 opacity-50" />}
             </Button>
           </div>
         </div>
      </div>

      <BookingConfirmationModal isOpen={showConfirmationModal} onClose={() => setShowConfirmationModal(false)} bookingData={{...formData, preferredDate: '', appointmentTime: '', pricingTotal: 0}} onConfirm={() => {}} />
    </div>
  );
}