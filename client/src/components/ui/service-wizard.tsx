
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Button } from "./button";
import { pricing } from "@/lib/pricing";
import { Separator } from "./separator";
import { cn } from "@/lib/utils";

interface TVInstallation {
  id: string;
  size: 'small' | 'large';
  location: 'standard' | 'fireplace';
  mountType: 'fixed' | 'tilting' | 'full_motion' | 'none' | 'customer';
  masonryWall: boolean;
  highRise: boolean;
  outletNeeded: boolean;
}

interface TVRemovalService {
  id: string;
  isUnmountOnly: boolean;
  isRemountOnly: boolean;
  count: number;
}

interface SmartHomeDevice {
  id: string;
  type: 'doorbell' | 'camera' | 'floodlight';
  count: number;
  hasExistingWiring?: boolean;
}

interface HandymanService {
  id: string;
  hours: number;
  description: string;
}

export interface ServiceWizardProps {
  onComplete: (services: {
    tvInstallations: TVInstallation[];
    tvRemoval: TVRemovalService | null;
    smartHomeDevices: SmartHomeDevice[];
    handymanService: HandymanService | null;
    estimatedTotal: number;
  }) => void;
}

export function ServiceWizard({ onComplete }: ServiceWizardProps) {
  // State for step management
  const [currentStep, setCurrentStep] = useState(0);
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  
  // State for TV installations
  const [tvInstallations, setTvInstallations] = useState<TVInstallation[]>([]);
  const [newTvSize, setNewTvSize] = useState<'small' | 'large'>('small');
  const [newTvLocation, setNewTvLocation] = useState<'standard' | 'fireplace'>('standard');
  const [newTvMountType, setNewTvMountType] = useState<'fixed' | 'tilting' | 'full_motion' | 'none' | 'customer'>('customer');
  const [newTvMasonryWall, setNewTvMasonryWall] = useState(false);
  const [newTvHighRise, setNewTvHighRise] = useState(false);
  const [newTvOutletNeeded, setNewTvOutletNeeded] = useState(false);
  
  // State for TV removal (unmount/remount)
  const [needsTvRemoval, setNeedsTvRemoval] = useState(false);
  const [tvRemovalType, setTvRemovalType] = useState<'unmount' | 'remount'>('unmount');
  const [tvRemovalCount, setTvRemovalCount] = useState(1);
  
  // State for smart home devices
  const [smartHomeDevices, setSmartHomeDevices] = useState<SmartHomeDevice[]>([]);
  const [newDeviceType, setNewDeviceType] = useState<'doorbell' | 'camera' | 'floodlight'>('camera');
  const [newDeviceCount, setNewDeviceCount] = useState(1);
  const [hasExistingWiring, setHasExistingWiring] = useState(true);
  
  // State for handyman services
  const [needsHandyman, setNeedsHandyman] = useState(false);
  const [handymanHours, setHandymanHours] = useState(1);
  const [handymanDescription, setHandymanDescription] = useState('');

  // Calculate an estimated total whenever services change
  useEffect(() => {
    let total = 0;
    
    // TV Installations
    tvInstallations.forEach(tv => {
      // Base TV mounting price
      if (tv.location === 'standard') {
        total += pricing.tvMounting.standard.price;
      } else if (tv.location === 'fireplace') {
        total += pricing.tvMounting.fireplace.price;
      }
      
      // Add-ons
      if (tv.masonryWall) {
        total += pricing.tvMounting.nonDrywall.price;
      }
      
      if (tv.highRise) {
        total += pricing.tvMounting.highRise.price;
      }
      
      // Mount purchases
      if (tv.mountType !== 'none' && tv.mountType !== 'customer') {
        const sizeKey = tv.size === 'large' ? 'big' : 'small';
        const mountKey = `${tv.mountType}${sizeKey.charAt(0).toUpperCase() + sizeKey.slice(1)}` as keyof typeof pricing.tvMounts;
        total += pricing.tvMounts[mountKey]?.price || 0;
      }
      
      // Outlet installation
      if (tv.outletNeeded) {
        total += pricing.wireConcealment.standard.price;
      }
    });
    
    // No discount calculation as requested
    
    // TV Removal services
    if (needsTvRemoval) {
      if (tvRemovalType === 'unmount') {
        total += tvRemovalCount * pricing.tvMounting.unmount.price;
      } else {
        total += tvRemovalCount * pricing.tvMounting.remount.price;
      }
    }
    
    // Smart Home devices
    smartHomeDevices.forEach(device => {
      if (device.type === 'camera') {
        // Camera price: $75
        total += device.count * pricing.smartHome.securityCamera.price;
      } else if (device.type === 'doorbell') {
        // Doorbell price: $85
        total += device.count * pricing.smartHome.doorbell.price;
      } else if (device.type === 'floodlight' && device.hasExistingWiring) {
        // Floodlight price: $125
        total += device.count * pricing.smartHome.floodlight.price;
      }
    });
    
    // Handyman services
    if (needsHandyman) {
      const handymanBasePrice = pricing.customServices.handyman.price;
      const additionalHalfHours = Math.ceil((handymanHours - 1) * 2);
      const halfHourRate = pricing.customServices.handyman.halfHourRate || 50; // Fallback to 50 if not defined
      const additionalFee = additionalHalfHours * halfHourRate;
      total += handymanBasePrice + additionalFee;
    }
    
    setEstimatedTotal(total);
  }, [tvInstallations, needsTvRemoval, tvRemovalType, tvRemovalCount, smartHomeDevices, needsHandyman, handymanHours]);

  // Handle adding a new TV installation
  const handleAddTv = () => {
    const newTv: TVInstallation = {
      id: `tv-${Date.now()}`,
      size: newTvSize,
      location: newTvLocation,
      mountType: newTvMountType,
      masonryWall: newTvMasonryWall,
      highRise: newTvHighRise,
      outletNeeded: newTvOutletNeeded
    };
    
    setTvInstallations([...tvInstallations, newTv]);
    
    // Reset form
    setNewTvSize('small');
    setNewTvLocation('standard');
    setNewTvMountType('customer');
    setNewTvMasonryWall(false);
    setNewTvHighRise(false);
    setNewTvOutletNeeded(false);
  };
  
  // Handle removing a TV installation
  const handleRemoveTv = (id: string) => {
    setTvInstallations(tvInstallations.filter(tv => tv.id !== id));
  };
  
  // Handle adding a smart home device
  const handleAddSmartDevice = () => {
    const newDevice: SmartHomeDevice = {
      id: `device-${Date.now()}`,
      type: newDeviceType,
      count: newDeviceCount,
      hasExistingWiring: newDeviceType === 'floodlight' ? hasExistingWiring : undefined
    };
    
    setSmartHomeDevices([...smartHomeDevices, newDevice]);
    
    // Reset form
    setNewDeviceType('camera');
    setNewDeviceCount(1);
    setHasExistingWiring(true);
  };
  
  // Handle removing a smart home device
  const handleRemoveSmartDevice = (id: string) => {
    setSmartHomeDevices(smartHomeDevices.filter(device => device.id !== id));
  };
  
  // Navigate to next step
  const handleNextStep = () => {
    setCurrentStep(currentStep + 1);
  };
  
  // Navigate to previous step
  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };
  
  // Complete the wizard
  const handleComplete = () => {
    // Create TV removal service if selected
    let tvRemoval = null;
    if (needsTvRemoval) {
      tvRemoval = {
        id: `removal-${Date.now()}`,
        isUnmountOnly: tvRemovalType === 'unmount',
        isRemountOnly: tvRemovalType === 'remount',
        count: tvRemovalCount
      };
    }
    
    // Create handyman service if selected
    let handymanService = null;
    if (needsHandyman) {
      handymanService = {
        id: `handyman-${Date.now()}`,
        hours: handymanHours,
        description: handymanDescription
      };
    }
    
    onComplete({
      tvInstallations,
      tvRemoval,
      smartHomeDevices,
      handymanService,
      estimatedTotal
    });
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Select Your Services</CardTitle>
        <CardDescription>
          Choose the services you need for your TV installation
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Step 1: TV Mounting Services */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">TV Mounting Services</h3>
              
              {/* List of already added TVs */}
              {tvInstallations.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-2">Your TVs:</h4>
                  <ul className="space-y-2">
                    {tvInstallations.map((tv, index) => (
                      <li key={tv.id} className="flex justify-between items-center p-3 bg-muted rounded-md">
                        <div>
                          <span className="font-medium">TV {index + 1}:</span>{' '}
                          <span>{tv.size === 'large' ? '56" or larger' : '32"-55"'}</span>{' '}
                          <span>({tv.location === 'fireplace' ? 'Over Fireplace' : 'Standard Wall'})</span>
                          {tv.mountType !== 'customer' && tv.mountType !== 'none' && (
                            <span className="block text-sm">
                              + {tv.mountType === 'fixed' ? 'Fixed' : tv.mountType === 'tilting' ? 'Tilting' : 'Full Motion'} Mount
                            </span>
                          )}
                          {tv.masonryWall && <span className="block text-sm">+ Non-Drywall Surface</span>}
                          {tv.highRise && <span className="block text-sm">+ High-Rise/Steel Studs</span>}
                          {tv.outletNeeded && <span className="block text-sm">+ Wire Concealment & Outlet</span>}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRemoveTv(tv.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* TV Form */}
              <div className="border rounded-md p-4 space-y-4">
                <h4 className="text-sm font-medium">Add a TV Installation:</h4>
                
                {/* TV Size */}
                <div>
                  <Label htmlFor="tv-size">TV Size</Label>
                  <RadioGroup 
                    id="tv-size" 
                    className="flex gap-4 mt-2"
                    value={newTvSize}
                    onValueChange={(value) => setNewTvSize(value as 'small' | 'large')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="small" id="size-small" />
                      <Label htmlFor="size-small">32" - 55"</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="large" id="size-large" />
                      <Label htmlFor="size-large">56" or larger</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* TV Location */}
                <div>
                  <Label htmlFor="tv-location">Mounting Location</Label>
                  <RadioGroup 
                    id="tv-location" 
                    className="flex gap-4 mt-2"
                    value={newTvLocation}
                    onValueChange={(value) => setNewTvLocation(value as 'standard' | 'fireplace')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="standard" id="location-standard" />
                      <Label htmlFor="location-standard">Standard Wall (${pricing.tvMounting.standard.price})</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fireplace" id="location-fireplace" />
                      <Label htmlFor="location-fireplace">Over Fireplace (${pricing.tvMounting.fireplace.price})</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* TV Mount Type */}
                <div>
                  <Label htmlFor="tv-mount">Wall Mount</Label>
                  <RadioGroup 
                    id="tv-mount" 
                    className="grid grid-cols-2 gap-4 mt-2"
                    value={newTvMountType}
                    onValueChange={(value) => setNewTvMountType(value as any)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="customer" id="mount-customer" />
                      <Label htmlFor="mount-customer">Customer's Mount</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="none" id="mount-none" />
                      <Label htmlFor="mount-none">No Mount Needed</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fixed" id="mount-fixed" />
                      <Label htmlFor="mount-fixed">
                        Fixed Mount
                        <span className="block text-xs text-muted-foreground">
                          (${newTvSize === 'small' ? pricing.tvMounts.fixedSmall.price : pricing.tvMounts.fixedBig.price})
                        </span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="tilting" id="mount-tilting" />
                      <Label htmlFor="mount-tilting">
                        Tilting Mount
                        <span className="block text-xs text-muted-foreground">
                          (${newTvSize === 'small' ? pricing.tvMounts.tiltingSmall.price : pricing.tvMounts.tiltingBig.price})
                        </span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 col-span-2">
                      <RadioGroupItem value="full_motion" id="mount-full-motion" />
                      <Label htmlFor="mount-full-motion">
                        Full Motion Mount
                        <span className="block text-xs text-muted-foreground">
                          (${newTvSize === 'small' ? pricing.tvMounts.fullMotionSmall.price : pricing.tvMounts.fullMotionBig.price})
                        </span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Additional Options */}
                <div className="space-y-2">
                  <Label>Additional Options</Label>
                  <div className="flex items-start space-x-2">
                    <Checkbox 
                      id="masonry-wall" 
                      checked={newTvMasonryWall}
                      onCheckedChange={(checked) => setNewTvMasonryWall(checked === true)}
                    />
                    <div className="grid gap-1">
                      <Label 
                        htmlFor="masonry-wall"
                        className="cursor-pointer"
                      >
                        Non-Drywall Surface (Brick, Masonry, etc.)
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        Additional ${pricing.tvMounting.nonDrywall.price}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox 
                      id="high-rise" 
                      checked={newTvHighRise}
                      onCheckedChange={(checked) => setNewTvHighRise(checked === true)}
                    />
                    <div className="grid gap-1">
                      <Label 
                        htmlFor="high-rise"
                        className="cursor-pointer"
                      >
                        High-Rise/Steel Stud Mounting
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        Additional ${pricing.tvMounting.highRise.price}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox 
                      id="outlet-needed" 
                      checked={newTvOutletNeeded}
                      onCheckedChange={(checked) => setNewTvOutletNeeded(checked === true)}
                      disabled={newTvLocation === 'fireplace'}
                    />
                    <div className="grid gap-1">
                      <Label 
                        htmlFor="outlet-needed"
                        className={cn(
                          "cursor-pointer",
                          newTvLocation === 'fireplace' && "text-muted-foreground"
                        )}
                      >
                        Wire Concealment & New Outlet Behind TV
                      </Label>
                      {newTvLocation === 'fireplace' ? (
                        <span className="text-xs text-amber-600">
                          For fireplace installations, contact us first for assessment
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Additional ${pricing.wireConcealment.standard.price}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button 
                  type="button" 
                  onClick={handleAddTv}
                >
                  Add TV to Order
                </Button>
              </div>
              
              {/* TV Removal Services */}
              <div className="mt-8">
                <h4 className="text-sm font-medium mb-2">TV Removal Services</h4>
                
                <div className="flex items-start space-x-2 mb-4">
                  <Checkbox 
                    id="tv-removal-needed" 
                    checked={needsTvRemoval}
                    onCheckedChange={(checked) => setNeedsTvRemoval(checked === true)}
                  />
                  <Label 
                    htmlFor="tv-removal-needed"
                    className="cursor-pointer"
                  >
                    I need a TV unmounted or remounted separately
                  </Label>
                </div>
                
                {needsTvRemoval && (
                  <div className="border rounded-md p-4 space-y-4">
                    <RadioGroup 
                      value={tvRemovalType}
                      onValueChange={(value) => setTvRemovalType(value as 'unmount' | 'remount')}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="unmount" id="removal-unmount" />
                        <Label htmlFor="removal-unmount">
                          Unmount TV from Wall (${pricing.tvMounting.unmount.price}/TV)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="remount" id="removal-remount" />
                        <Label htmlFor="removal-remount">
                          Remount TV on Existing Mount (${pricing.tvMounting.remount.price}/TV)
                        </Label>
                      </div>
                    </RadioGroup>
                    
                    <div>
                      <Label htmlFor="removal-count">Number of TVs</Label>
                      <Input 
                        id="removal-count"
                        type="number"
                        min="1"
                        max="10"
                        value={tvRemovalCount}
                        onChange={(e) => setTvRemovalCount(parseInt(e.target.value) || 1)}
                        className="mt-1 w-20"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Step 2: Smart Home Installations */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Smart Home Installations</h3>
              
              {/* List of already added devices */}
              {smartHomeDevices.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-2">Your Smart Home Devices:</h4>
                  <ul className="space-y-2">
                    {smartHomeDevices.map((device, index) => (
                      <li key={device.id} className="flex justify-between items-center p-3 bg-muted rounded-md">
                        <div>
                          <span className="font-medium">
                            {device.type === 'camera' ? 'Smart Security Camera' : 
                             device.type === 'doorbell' ? 'Smart Doorbell' : 
                             'Smart Floodlight'}
                          </span>
                          <span className="ml-1">
                            (Qty: {device.count})
                          </span>
                          {device.type === 'floodlight' && (
                            <span className="block text-sm">
                              {device.hasExistingWiring ? 'With existing wiring' : 'No existing wiring (requires assessment)'}
                            </span>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRemoveSmartDevice(device.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Smart Home Device Form */}
              <div className="border rounded-md p-4 space-y-4">
                <h4 className="text-sm font-medium">Add a Smart Home Device:</h4>
                
                {/* Device Type */}
                <div>
                  <Label htmlFor="device-type">Device Type</Label>
                  <RadioGroup 
                    id="device-type" 
                    className="grid gap-2 mt-2"
                    value={newDeviceType}
                    onValueChange={(value) => setNewDeviceType(value as 'doorbell' | 'camera' | 'floodlight')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="camera" id="device-camera" />
                      <Label htmlFor="device-camera">
                        Smart Security Camera Installation (${pricing.smartHome.securityCamera.price})
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="doorbell" id="device-doorbell" />
                      <Label htmlFor="device-doorbell">
                        Smart Doorbell Installation (${pricing.smartHome.doorbell.price})
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="floodlight" id="device-floodlight" />
                      <Label htmlFor="device-floodlight">
                        Smart Floodlight Installation (${pricing.smartHome.floodlight.price})
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* Quantity */}
                <div>
                  <Label htmlFor="device-count">Quantity</Label>
                  <Input 
                    id="device-count"
                    type="number"
                    min="1"
                    max="10"
                    value={newDeviceCount}
                    onChange={(e) => setNewDeviceCount(parseInt(e.target.value) || 1)}
                    className="mt-1 w-20"
                  />
                </div>
                
                {/* Existing Wiring (for floodlights) */}
                {newDeviceType === 'floodlight' && (
                  <div>
                    <Label>Existing Wiring</Label>
                    <RadioGroup 
                      value={hasExistingWiring ? 'yes' : 'no'}
                      onValueChange={(value) => setHasExistingWiring(value === 'yes')}
                      className="space-y-2 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="wiring-yes" />
                        <Label htmlFor="wiring-yes">
                          Yes, there is existing wiring
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="wiring-no" />
                        <Label htmlFor="wiring-no">
                          No existing wiring (requires assessment)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
                
                <Button 
                  type="button" 
                  onClick={handleAddSmartDevice}
                  disabled={newDeviceType === 'floodlight' && !hasExistingWiring}
                >
                  Add Device to Order
                </Button>
                
                {newDeviceType === 'floodlight' && !hasExistingWiring && (
                  <p className="text-sm text-amber-600">
                    Floodlights without existing wiring require an assessment. Please contact us directly.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Step 3: Handyman Services */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Handyman Services</h3>
              
              <div className="flex items-start space-x-2 mb-4">
                <Checkbox 
                  id="handyman-needed" 
                  checked={needsHandyman}
                  onCheckedChange={(checked) => setNeedsHandyman(checked === true)}
                />
                <Label 
                  htmlFor="handyman-needed"
                  className="cursor-pointer"
                >
                  I need general handyman work (shelves, mirrors, furniture assembly, etc.)
                </Label>
              </div>
              
              {needsHandyman && (
                <div className="border rounded-md p-4 space-y-4">
                  <div>
                    <Label htmlFor="handyman-hours">Estimated Hours</Label>
                    <div className="flex items-center mt-1">
                      <Input 
                        id="handyman-hours"
                        type="number"
                        min="1"
                        step="0.5"
                        max="8"
                        value={handymanHours}
                        onChange={(e) => setHandymanHours(parseFloat(e.target.value) || 1)}
                        className="w-20"
                      />
                      <span className="ml-2 text-sm text-muted-foreground">
                        First hour: ${pricing.customServices.handyman.price}, 
                        then ${pricing.customServices.handyman.halfHourRate}/30 min
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="handyman-description">Description of Work Needed</Label>
                    <Input 
                      id="handyman-description"
                      placeholder="Brief description of handyman work needed"
                      value={handymanDescription}
                      onChange={(e) => setHandymanDescription(e.target.value)}
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
              <h3 className="text-lg font-medium mb-4">Review Your Services</h3>
              
              {/* Services Summary */}
              <div className="space-y-4">
                {/* TV Installations */}
                {tvInstallations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">TV Installations:</h4>
                    <ul className="space-y-2">
                      {tvInstallations.map((tv, index) => (
                        <li key={tv.id} className="p-3 bg-muted rounded-md">
                          <div className="font-medium">TV {index + 1}</div>
                          <div className="text-sm">
                            Size: {tv.size === 'large' ? '56" or larger' : '32"-55"'}
                          </div>
                          <div className="text-sm">
                            Location: {tv.location === 'fireplace' ? 'Over Fireplace' : 'Standard Wall'}
                          </div>
                          {tv.mountType !== 'customer' && tv.mountType !== 'none' && (
                            <div className="text-sm">
                              Mount: {tv.mountType === 'fixed' ? 'Fixed' : tv.mountType === 'tilting' ? 'Tilting' : 'Full Motion'}
                            </div>
                          )}
                          {tv.masonryWall && <div className="text-sm">Non-Drywall Surface: Yes</div>}
                          {tv.highRise && <div className="text-sm">High-Rise/Steel Studs: Yes</div>}
                          {tv.outletNeeded && <div className="text-sm">Wire Concealment & Outlet: Yes</div>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* TV Removal */}
                {needsTvRemoval && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">TV Removal:</h4>
                    <div className="p-3 bg-muted rounded-md">
                      <div className="text-sm">
                        Service: {tvRemovalType === 'unmount' ? 'Unmount TV from Wall' : 'Remount TV on Existing Mount'}
                      </div>
                      <div className="text-sm">
                        Number of TVs: {tvRemovalCount}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Smart Home Devices */}
                {smartHomeDevices.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Smart Home Installations:</h4>
                    <ul className="space-y-2">
                      {smartHomeDevices.map((device) => (
                        <li key={device.id} className="p-3 bg-muted rounded-md">
                          <div className="font-medium">
                            {device.type === 'camera' ? 'Smart Security Camera' : 
                             device.type === 'doorbell' ? 'Smart Doorbell' : 
                             'Smart Floodlight'}
                          </div>
                          <div className="text-sm">
                            Quantity: {device.count}
                          </div>
                          {device.type === 'floodlight' && (
                            <div className="text-sm">
                              Existing Wiring: {device.hasExistingWiring ? 'Yes' : 'No (requires assessment)'}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Handyman Services */}
                {needsHandyman && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Handyman Services:</h4>
                    <div className="p-3 bg-muted rounded-md">
                      <div className="text-sm">
                        Estimated Hours: {handymanHours}
                      </div>
                      <div className="text-sm">
                        Description: {handymanDescription || 'Not provided'}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Service Restrictions */}
                {(tvInstallations.some(tv => tv.location === 'fireplace' && tv.outletNeeded) || 
                  smartHomeDevices.some(device => device.type === 'floodlight' && !device.hasExistingWiring)) && (
                  <div className="p-3 bg-amber-50 text-amber-800 rounded-md">
                    <h4 className="font-medium mb-1">Important Note:</h4>
                    <ul className="text-sm space-y-1 list-disc pl-4">
                      {tvInstallations.some(tv => tv.location === 'fireplace' && tv.outletNeeded) && (
                        <li>Wire concealment above a fireplace requires an outlet assessment.</li>
                      )}
                      {smartHomeDevices.some(device => device.type === 'floodlight' && !device.hasExistingWiring) && (
                        <li>Smart floodlights without existing wiring need an assessment.</li>
                      )}
                      <li>Someone will contact you about these services separately.</li>
                    </ul>
                  </div>
                )}
                
                {/* Estimated Total */}
                <div className="p-4 bg-primary/10 rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Estimated Total:</span>
                    <span className="text-xl font-bold">${estimatedTotal}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Final price may vary based on assessment. Payment due after installation.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {currentStep > 0 ? (
          <Button 
            type="button" 
            variant="outline" 
            onClick={handlePreviousStep}
          >
            Back
          </Button>
        ) : (
          <div></div>
        )}
        
        {currentStep < 3 ? (
          <Button 
            type="button" 
            onClick={handleNextStep}
          >
            Continue
          </Button>
        ) : (
          <Button 
            type="button" 
            onClick={handleComplete}
          >
            Complete
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
