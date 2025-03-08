
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface ReviewBookingStepProps {
  tvInstallations: any[];
  tvRemovalService: any;
  smartHomeInstallations: any[];
  handymanService: any;
  selectedDate: Date | undefined;
  selectedTime: string | undefined;
  formData: any;
  pricingTotal: number;
}

export function ReviewBookingStep({
  tvInstallations,
  tvRemovalService,
  smartHomeInstallations,
  handymanService,
  selectedDate,
  selectedTime,
  formData,
  pricingTotal
}: ReviewBookingStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Review Your Booking</h3>
        <p className="text-sm text-muted-foreground">
          Please review your booking details before confirming
        </p>
      </div>
      
      {/* Services Summary */}
      <div>
        <h4 className="text-sm font-medium mb-2">Services</h4>
        <div className="space-y-3">
          {/* TV Installations */}
          {tvInstallations.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">TV Installations:</h5>
              <ul className="text-sm space-y-1">
                {tvInstallations.map((tv, index) => (
                  <li key={tv.id} className="flex flex-col p-2 bg-muted rounded-md">
                    <span className="font-medium">TV {index + 1}:</span>
                    <span>Size: {tv.size === 'large' ? '56" or larger' : '32"-55"'}</span>
                    <span>Location: {tv.location === 'fireplace' ? 'Over Fireplace' : 'Standard Wall'}</span>
                    {tv.mountType !== 'customer' && tv.mountType !== 'none' && (
                      <span>Mount: {tv.mountType === 'fixed' ? 'Fixed' : tv.mountType === 'tilting' ? 'Tilting' : 'Full Motion'}</span>
                    )}
                    {tv.masonryWall && <span>Non-Drywall Surface (Brick/Masonry)</span>}
                    {tv.highRise && <span>High-Rise/Steel Studs</span>}
                    {tv.outletNeeded && <span>With Wire Concealment & Outlet</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* TV Removal Services */}
          {tvRemovalService && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">TV Removal:</h5>
              <div className="text-sm p-2 bg-muted rounded-md">
                <p>
                  {tvRemovalService.isUnmountOnly ? 'TV Unmounting' : 'TV Remounting'} 
                  {tvRemovalService.count > 1 ? ` (${tvRemovalService.count} TVs)` : ''}
                </p>
              </div>
            </div>
          )}
          
          {/* Smart Home Devices */}
          {smartHomeInstallations.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Smart Home Installations:</h5>
              <ul className="text-sm space-y-1">
                {smartHomeInstallations.map((device) => (
                  <li key={device.id} className="p-2 bg-muted rounded-md">
                    {device.type === 'camera' && `Smart Security Camera (Qty: ${device.count})`}
                    {device.type === 'doorbell' && `Smart Doorbell (Qty: ${device.count})`}
                    {device.type === 'floodlight' && `Smart Floodlight (Qty: ${device.count})${device.hasExistingWiring ? ' - Existing Wiring' : ' - Requires Assessment'}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Handyman Services */}
          {handymanService && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Handyman Services:</h5>
              <div className="text-sm p-2 bg-muted rounded-md">
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
      <div>
        <h4 className="text-sm font-medium mb-2">Appointment</h4>
        <div className="text-sm grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">Date:</span>{' '}
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Not selected'}
          </div>
          <div>
            <span className="font-medium">Time:</span>{' '}
            {selectedTime || 'Not selected'}
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Customer Details */}
      <div>
        <h4 className="text-sm font-medium mb-2">Customer Information</h4>
        <div className="text-sm space-y-2">
          <p>
            <span className="font-medium">Name:</span> {formData.name}
          </p>
          <p>
            <span className="font-medium">Contact:</span> {formData.email}, {formData.phone}
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
              <p className="mt-1">{formData.notes}</p>
            </div>
          )}
        </div>
      </div>
      
      <Separator />
      
      {/* Pricing */}
      <div>
        <h4 className="text-sm font-medium mb-2">Pricing</h4>
        <div className="bg-muted p-3 rounded-md flex justify-between items-center">
          <span className="font-medium">Estimated Total:</span>
          <span className="text-xl font-bold">${pricingTotal}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Payment will be collected after installation. Cash, Zelle, and Apple Pay accepted.
        </p>
      </div>
    </div>
  );
}
