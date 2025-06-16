
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PencilIcon, XCircle, AlertTriangle, UserPlus, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RescheduleDialog } from "@/components/ui/reschedule-dialog";

interface ReviewBookingStepProps {
  tvInstallations: any[];
  tvDeinstallations: any[];
  smartHomeInstallations: any[];
  handymanService: any;
  selectedDate: Date | undefined;
  selectedTime: string | undefined;
  formData: any;
  pricingTotal: number;
  pricingBreakdown?: {
    subtotal: number;
    discounts: number;
    appliedDiscounts: Array<{name: string; amount: number; description: string}>;
    total: number;
  };
  onEditServices?: () => void;
  onRemoveService?: (type: 'tv' | 'smartHome' | 'tvDeinstallation', id: string) => void;
  onReschedule?: (date: Date, time: string) => void;
  bookingId?: number | string;
  noServicesMessage?: string;
}

export function ReviewBookingStep({
  tvInstallations,
  tvDeinstallations,
  smartHomeInstallations,
  handymanService,
  selectedDate,
  selectedTime,
  formData,
  pricingTotal,
  pricingBreakdown,
  onEditServices,
  onRemoveService,
  onReschedule,
  bookingId,
  noServicesMessage = "No services selected. Please add at least one service before confirming."
}: ReviewBookingStepProps) {
  const [serviceToRemove, setServiceToRemove] = useState<{type: 'tv' | 'smartHome' | 'tvDeinstallation', id: string} | null>(null);
  const hasServices = tvInstallations.length > 0 || smartHomeInstallations.length > 0 || tvDeinstallations.length > 0;

  const handleRemoveClick = (type: 'tv' | 'smartHome' | 'tvDeinstallation', id: string) => {
    setServiceToRemove({ type, id });
  };

  const confirmRemoval = () => {
    if (serviceToRemove && onRemoveService) {
      onRemoveService(serviceToRemove.type, serviceToRemove.id);
    }
    setServiceToRemove(null);
  };

  return (
    <div className="space-y-5 relative px-1">
      <div>
        <h3 className="text-base sm:text-lg font-medium">Review Your Booking</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Please review your booking details before confirming
        </p>
      </div>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={!!serviceToRemove} onOpenChange={(open) => !open && setServiceToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Service?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this service? This will update your estimated total.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoval} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Services Summary */}
      <div className="relative">
        <h4 className="text-sm font-medium mb-2">Services</h4>
        
        {/* No Services Warning */}
        {!hasServices && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{noServicesMessage}</p>
          </div>
        )}
        
        <div className="space-y-3">
          {/* TV Installations */}
          {tvInstallations.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h5 className="text-sm font-medium">TV Installations:</h5>
                {onEditServices && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs flex items-center gap-1"
                    onClick={onEditServices}
                  >
                    <PencilIcon className="h-3 w-3" /> Edit Services
                  </Button>
                )}
              </div>
              <ul className="text-xs sm:text-sm space-y-2">
                <AnimatePresence>
                  {tvInstallations.map((tv, index) => (
                    <motion.li 
                      key={tv.id} 
                      initial={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
                      transition={{ duration: 0.2 }}
                      className="relative flex flex-col p-2 bg-muted rounded-md pr-8"
                    >
                      {onRemoveService && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 p-0 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          onClick={() => handleRemoveClick('tv', tv.id)}
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      )}
                      <span className="font-medium">TV {index + 1}:</span>
                      <span>Size: {tv.size === 'large' ? '56" or larger' : '32"-55"'}</span>
                      <span>Location: {tv.location === 'fireplace' ? 'Over Fireplace' : 'Standard Wall'}</span>
                      <span className="line-clamp-2">
                        Mount: {tv.mountType === 'fixed' 
                          ? `Fixed Mount (${tv.size === 'large' ? '56"+ size' : '32"-55" size'}) - Included` 
                          : tv.mountType === 'tilting' 
                          ? `Tilting Mount (${tv.size === 'large' ? '56"+ size' : '32"-55" size'}) - Included` 
                          : tv.mountType === 'full_motion' 
                          ? `Full Motion Mount (${tv.size === 'large' ? '56"+ size' : '32"-55" size'}) - Included` 
                          : tv.mountType === 'customer' 
                          ? 'Customer-Provided Mount' 
                          : 'No Mount Required'}
                      </span>
                      {tv.masonryWall && <span>Non-Drywall Surface (Brick/Masonry)</span>}
                      {tv.highRise && <span>High-Rise/Steel Studs</span>}
                      {tv.outletNeeded && <span>With Wire Concealment & Outlet</span>}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          )}
          
          {/* TV De-Installation Services */}
          {tvDeinstallations.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">TV De-Installation:</h5>
              <ul className="text-xs sm:text-sm space-y-2">
                <AnimatePresence>
                  {tvDeinstallations.map((service, index) => (
                    <motion.li
                      key={service.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start justify-between p-2 bg-muted rounded-md"
                    >
                      <div>
                        <p className="font-medium">TV De-Installation Service</p>
                        <p className="text-xs text-muted-foreground">Remove TV and mount from wall - $50</p>
                      </div>
                      {onRemoveService && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveClick('tvDeinstallation', service.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          )}
          
          {/* Smart Home Devices */}
          {smartHomeInstallations.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Smart Home Installations:</h5>
              <ul className="text-xs sm:text-sm space-y-2">
                <AnimatePresence>
                  {smartHomeInstallations.map((device) => (
                    <motion.li 
                      key={device.id} 
                      initial={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
                      transition={{ duration: 0.2 }}
                      className="relative p-2 bg-muted rounded-md pr-8"
                    >
                      {onRemoveService && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 p-0 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          onClick={() => handleRemoveClick('smartHome', device.id)}
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      )}
                      {device.type === 'camera' && `Smart Security Camera (Qty: ${device.count})`}
                      {device.type === 'doorbell' && `Smart Doorbell (Qty: ${device.count})`}
                      {device.type === 'floodlight' && `Smart Floodlight (Qty: ${device.count})${device.hasExistingWiring ? ' - Existing Wiring' : ' - Requires Assessment'}`}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          )}
          
          {/* Handyman Services */}
          {handymanService && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Handyman Services:</h5>
              <div className="text-xs sm:text-sm p-2 bg-muted rounded-md">
                <p>General Handyman Work ({handymanService.hours} hour{handymanService.hours > 1 ? 's' : ''})</p>
                {handymanService.description && (
                  <p className="mt-1">{handymanService.description}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Separator />
      
      {/* Appointment Details */}
      <div className="relative">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium">Appointment</h4>
          {bookingId && onReschedule && (
            <RescheduleDialog 
              bookingId={bookingId}
              currentDate={selectedDate}
              currentTime={selectedTime}
              onRescheduleSuccess={(newDate, newTime) => onReschedule(newDate, newTime)}
              trigger={
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs gap-1.5"
                >
                  <CalendarDays className="h-3 w-3" />
                  Reschedule
                </Button>
              }
            />
          )}
        </div>
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
          {formData.createAccount && (
            <div className="mt-2 p-2 bg-primary/10 rounded-md">
              <span className="font-medium flex items-center">
                <UserPlus className="mr-1.5 h-4 w-4" />
                Account Creation Requested
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                An account will be created with your email address
              </p>
            </div>
          )}
        </div>
      </div>
      
      <Separator />
      
      {/* Pricing */}
      <div className="relative">
        <h4 className="text-sm font-medium mb-2">Pricing</h4>
        <div className="bg-muted p-3 rounded-md space-y-2">
          {/* Show detailed breakdown if available */}
          {pricingBreakdown && pricingBreakdown.appliedDiscounts.length > 0 ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm">Subtotal:</span>
                <span className="text-sm">${pricingBreakdown.subtotal}</span>
              </div>
              
              {/* Show applied discounts */}
              {pricingBreakdown.appliedDiscounts.map((discount, index) => (
                <div key={index} className="flex justify-between items-center text-green-600">
                  <span className="text-sm">{discount.name}:</span>
                  <span className="text-sm">-${discount.amount}</span>
                </div>
              ))}
              
              <Separator className="my-2" />
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Final Total:</span>
                <span className="text-xl font-bold">${pricingBreakdown.total}</span>
              </div>
              
              {/* Show discount descriptions */}
              {pricingBreakdown.appliedDiscounts.length > 0 && (
                <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
                  {pricingBreakdown.appliedDiscounts.map((discount, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <span>✓</span>
                      <span>{discount.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-between items-center">
              <span className="font-medium">Estimated Total:</span>
              <span className="text-xl font-bold">${pricingTotal}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Payment will be collected after installation. Cash, Zelle, and Apple Pay accepted.
        </p>
      </div>
    </div>
  );
}
