import { useState } from "react";
import { Button } from "./button";
import { Card, CardContent } from "./card";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Checkbox } from "./checkbox";
import { Icons } from "../icons";

interface SimpleTVFormProps {
  onServiceAdd: (service: any) => void;
}

export function SimpleTVForm({ onServiceAdd }: SimpleTVFormProps) {
  const [tvSize, setTvSize] = useState<"small" | "large">("small");
  const [location, setLocation] = useState<"standard" | "fireplace">("standard");
  const [mountType, setMountType] = useState<"fixed" | "tilting" | "full_motion" | "customer_provided">("fixed");
  const [masonryWall, setMasonryWall] = useState(false);
  const [highRise, setHighRise] = useState(false);
  const [outletNeeded, setOutletNeeded] = useState(false);

  const calculatePrice = () => {
    let basePrice = 100; // Base TV installation price
    
    // Mount type pricing
    if (mountType === "tilting") {
      basePrice += tvSize === "large" ? 50 : 40;
    } else if (mountType === "full_motion") {
      basePrice += tvSize === "large" ? 80 : 60;
    } else if (mountType === "fixed") {
      basePrice += tvSize === "large" ? 40 : 30;
    }
    // customer_provided mount adds $0
    
    // Location surcharge
    if (location === "fireplace") basePrice += 100;
    
    // Wall material surcharges
    if (masonryWall) basePrice += 50; // Brick/stone surface
    if (highRise) basePrice += 25; // High-rise/steel studs
    
    // Additional services
    if (outletNeeded) basePrice += 100; // Wire concealment & outlet
    
    return basePrice;
  };

  const handleAddService = () => {
    const service = {
      id: `tv-${Date.now()}`,
      type: "tv",
      size: tvSize,
      location,
      mountType,
      masonryWall,
      highRise,
      outletNeeded,
      basePrice: calculatePrice()
    };
    onServiceAdd(service);
  };

  return (
    <div className="space-y-6">
      {/* TV Size */}
      <div className="space-y-3">
        <Label className="text-base font-medium">TV Size</Label>
        <RadioGroup value={tvSize} onValueChange={(value: "small" | "large") => setTvSize(value)}>
          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="small" id="small" />
              <Label htmlFor="small" className="font-medium cursor-pointer">32" - 55" TV</Label>
            </div>
            <span className="text-green-600 font-semibold">Included</span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="large" id="large" />
              <Label htmlFor="large" className="font-medium cursor-pointer">56" or larger</Label>
            </div>
            <span className="text-green-600 font-semibold">Included</span>
          </div>
        </RadioGroup>
      </div>

      {/* Installation Location */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Installation Location</Label>
        <RadioGroup value={location} onValueChange={(value: "standard" | "fireplace") => setLocation(value)}>
          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="standard" id="standard" />
              <Label htmlFor="standard" className="font-medium">Standard Wall</Label>
            </div>
            <span className="text-green-600 font-semibold">+$0</span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fireplace" id="fireplace" />
              <Label htmlFor="fireplace" className="font-medium">Over Fireplace</Label>
            </div>
            <span className="text-blue-600 font-semibold">+$100</span>
          </div>
        </RadioGroup>
      </div>

      {/* Mount Type */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Select Your Mount</Label>
        <RadioGroup value={mountType} onValueChange={(value: "fixed" | "tilting" | "full_motion" | "customer_provided") => setMountType(value)}>
          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed" id="fixed" />
              <div>
                <Label htmlFor="fixed" className="font-medium cursor-pointer">Fixed Mount</Label>
                <p className="text-xs text-gray-500">Standard wall mounting</p>
              </div>
            </div>
            <span className="text-blue-600 font-semibold">
              +${tvSize === "large" ? "40" : "30"}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="tilting" id="tilting" />
              <div>
                <Label htmlFor="tilting" className="font-medium cursor-pointer">Tilting Mount</Label>
                <p className="text-xs text-gray-500">Up/down angle adjustment</p>
              </div>
            </div>
            <span className="text-blue-600 font-semibold">
              +${tvSize === "large" ? "50" : "40"}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="full_motion" id="full_motion" />
              <div>
                <Label htmlFor="full_motion" className="font-medium cursor-pointer">Full Motion Mount</Label>
                <p className="text-xs text-gray-500">Swivel, tilt, and extend</p>
              </div>
            </div>
            <span className="text-blue-600 font-semibold">
              +${tvSize === "large" ? "80" : "60"}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="customer_provided" id="customer_provided" />
              <div>
                <Label htmlFor="customer_provided" className="font-medium cursor-pointer">Customer-Provided Mount</Label>
                <p className="text-xs text-gray-500">You provide the mount, we install it</p>
              </div>
            </div>
            <span className="text-green-600 font-semibold">$0</span>
          </div>
        </RadioGroup>
      </div>

      {/* Add-ons */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Additional Services</Label>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="masonry" 
                checked={masonryWall} 
                onCheckedChange={(checked) => setMasonryWall(checked === true)}
              />
              <div>
                <Label htmlFor="masonry" className="font-medium cursor-pointer">Brick/Stone Surface</Label>
                <p className="text-xs text-gray-500">+$50 (includes specialized hardware for masonry)</p>
              </div>
            </div>
            <span className="text-blue-600 font-semibold">+$50</span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="highrise" 
                checked={highRise} 
                onCheckedChange={(checked) => setHighRise(checked === true)}
              />
              <div>
                <Label htmlFor="highrise" className="font-medium cursor-pointer">High-Rise/Steel Studs</Label>
                <p className="text-xs text-gray-500">+$25 (complex building access and steel stud mounting)</p>
              </div>
            </div>
            <span className="text-blue-600 font-semibold">+$25</span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="outlet" 
                checked={outletNeeded} 
                onCheckedChange={(checked) => setOutletNeeded(checked === true)}
              />
              <div>
                <Label htmlFor="outlet" className="font-medium cursor-pointer">Wire Concealment & Outlet</Label>
                <p className="text-xs text-gray-500">+$100 (includes outlet installation and wire hiding)</p>
              </div>
            </div>
            <span className="text-blue-600 font-semibold">+$100</span>
          </div>
        </div>
      </div>

      {/* Price Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Price:</span>
            <span className="text-2xl font-bold text-blue-600">${calculatePrice()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Add Service Button */}
      <Button onClick={handleAddService} className="w-full" size="lg">
        <Icons.tv className="mr-2 h-5 w-5" />
        Add TV Installation Service
      </Button>
    </div>
  );
}