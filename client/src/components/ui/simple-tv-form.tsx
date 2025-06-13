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
  const [mountType, setMountType] = useState<"fixed" | "tilting" | "full_motion">("fixed");
  const [masonryWall, setMasonryWall] = useState(false);
  const [highRise, setHighRise] = useState(false);
  const [outletNeeded, setOutletNeeded] = useState(false);

  const calculatePrice = () => {
    let basePrice = 199;
    if (tvSize === "large") basePrice += 50;
    if (location === "fireplace") basePrice += 100;
    if (mountType === "tilting") basePrice += 25;
    if (mountType === "full_motion") basePrice += 50;
    if (masonryWall) basePrice += 75;
    if (highRise) basePrice += 50;
    if (outletNeeded) basePrice += 125;
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
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="small" id="small" />
            <Label htmlFor="small">32" - 55" TV (+$0)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="large" id="large" />
            <Label htmlFor="large">56" or larger (+$50)</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Installation Location */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Installation Location</Label>
        <RadioGroup value={location} onValueChange={(value: "standard" | "fireplace") => setLocation(value)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="standard" id="standard" />
            <Label htmlFor="standard">Standard Wall (+$0)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fireplace" id="fireplace" />
            <Label htmlFor="fireplace">Over Fireplace (+$100)</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Mount Type */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Mount Type</Label>
        <RadioGroup value={mountType} onValueChange={(value: "fixed" | "tilting" | "full_motion") => setMountType(value)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fixed" id="fixed" />
            <Label htmlFor="fixed">Fixed Mount (+$0)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="tilting" id="tilting" />
            <Label htmlFor="tilting">Tilting Mount (+$25)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="full_motion" id="full_motion" />
            <Label htmlFor="full_motion">Full Motion Mount (+$50)</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Add-ons */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Additional Services</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="masonry" 
              checked={masonryWall} 
              onCheckedChange={(checked) => setMasonryWall(checked === true)}
            />
            <Label htmlFor="masonry">Masonry/Brick Wall (+$75)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="highrise" 
              checked={highRise} 
              onCheckedChange={(checked) => setHighRise(checked === true)}
            />
            <Label htmlFor="highrise">High-Rise Installation (+$50)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="outlet" 
              checked={outletNeeded} 
              onCheckedChange={(checked) => setOutletNeeded(checked === true)}
            />
            <Label htmlFor="outlet">New Outlet Installation (+$125)</Label>
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