import * as React from "react"
import { Button } from "./button"
import { motion } from "framer-motion"
import { Plus, Minus, MinusCircle, PlusCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"
import { Switch } from "./switch"
import { Label } from "./label"
import { Card } from "./card"
import { Separator } from "./separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu"

export type TVInstallation = {
  size: 'small' | 'large';
  location: 'standard' | 'fireplace' | 'ceiling';
  mountType: 'fixed' | 'tilt' | 'fullMotion' | 'none';
  masonryWall: boolean;
  outletRelocation: boolean;
  highRise: boolean;
  unmount: boolean;
  remount: boolean;
  isUnmountOnly?: boolean;
  isRemountOnly?: boolean;
  isOutletOnly?: boolean;
};

export type SmartHomeInstallation = {
  type: 'doorbell' | 'floodlight' | 'camera';
  quantity: number;
  brickInstallation?: boolean;
  mountHeight?: number;
};

interface ServiceWizardProps {
  onServiceSelect: (services: { tvs: TVInstallation[], smartHome: SmartHomeInstallation[] }) => void;
  onClose: () => void;
}

export function ServiceWizard({ onServiceSelect, onClose }: ServiceWizardProps) {
  const [activeTab, setActiveTab] = React.useState('services');
  const [tvInstallations, setTvInstallations] = React.useState<TVInstallation[]>([]);
  const [smartHomeInstallations, setSmartHomeInstallations] = React.useState<SmartHomeInstallation[]>([]);

  // Auto-save selections whenever they change
  React.useEffect(() => {
    if (tvInstallations.length > 0 || smartHomeInstallations.length > 0) {
      onServiceSelect({
        tvs: tvInstallations,
        smartHome: smartHomeInstallations.map(installation => ({
          ...installation,
          quantity: installation.quantity || 1,
          brickInstallation: installation.type === 'doorbell' ? (installation.brickInstallation || false) : undefined
        }))
      });
    }
  }, [tvInstallations, smartHomeInstallations, onServiceSelect]);

  const addTvInstallation = () => {
    setTvInstallations(prev => [...prev, {
      size: 'small',
      location: 'standard',
      mountType: 'none',
      masonryWall: false,
      outletRelocation: false,
      highRise: false,
      unmount: false,
      remount: false,
      isUnmountOnly: false,
      isRemountOnly: false
    }]);
  };

  const removeTvInstallation = (index: number) => {
    setTvInstallations(prev => prev.filter((_, i) => i !== index));
  };

  const updateTvInstallation = (index: number, updates: Partial<TVInstallation>) => {
    setTvInstallations(prev => prev.map((inst, i) =>
      i === index ? { ...inst, ...updates } : inst
    ));
  };

  const addSmartHomeInstallation = (type: SmartHomeInstallation['type']) => {
    setSmartHomeInstallations(prev => [...prev, {
      type,
      quantity: 1,
      ...(type === 'doorbell' ? { brickInstallation: false } : {})
    }]);
  };

  const removeSmartHomeInstallation = (index: number) => {
    setSmartHomeInstallations(prev => prev.filter((_, i) => i !== index));
  };

  const updateSmartHomeInstallation = (index: number, updates: Partial<SmartHomeInstallation>) => {
    setSmartHomeInstallations(prev => prev.map((inst, i) => {
      if (i !== index) return inst;
      const updated = { ...inst, ...updates };

      // Ensure quantity is always at least 1
      if (updated.quantity < 1) updated.quantity = 1;

      return updated;
    }));
  };

  const addTVUnmountingOnly = () => {
    setTvInstallations(prev => [...prev, {
      size: 'small',
      location: 'standard',
      mountType: 'none',
      masonryWall: false,
      outletRelocation: false,
      highRise: false,
      unmount: true,
      remount: false,
      isUnmountOnly: true,
      isRemountOnly: false
    }]);
  };

  const addTVRemountingOnly = () => {
    setTvInstallations(prev => [...prev, {
      size: 'small',
      location: 'standard',
      mountType: 'none',
      masonryWall: false,
      outletRelocation: false,
      highRise: false,
      unmount: false,
      remount: true,
      isUnmountOnly: false,
      isRemountOnly: true
    }]);
  };
  
  const addOutletOnly = () => {
    setTvInstallations(prev => [...prev, {
      size: 'small',
      location: 'standard',
      mountType: 'none',
      masonryWall: false,
      outletRelocation: true,
      highRise: false,
      unmount: false,
      remount: false,
      isUnmountOnly: false,
      isRemountOnly: false,
      isOutletOnly: true
    }]);
  };

  const hasSelectionsToConfirm = tvInstallations.length > 0 || smartHomeInstallations.length > 0;

  return (
    <div className="space-y-6">
      {hasSelectionsToConfirm && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Selected Services</h3>
          <div className="space-y-3 text-sm">
            {tvInstallations.map((tv, index) => (
              <div key={`tv-${index}`} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                <span>
                  {tv.isUnmountOnly ? 'TV Unmounting Only' :
                    tv.isRemountOnly ? 'TV Remounting Only' :
                      tv.isOutletOnly ? 'Outlet Installation Only' :
                        `TV ${index + 1}: ${tv.size === 'large' ? '56" or larger' : '32"-55"'} - ${tv.location === 'standard' ? 'Standard' : tv.location === 'fireplace' ? 'Fireplace' : 'Ceiling'} ${tv.mountType !== 'none' ? ` (${tv.mountType === 'fixed' ? 'Fixed' : tv.mountType === 'tilt' ? 'Tilt' : 'Full Motion'})` : ''}`}
                  {tv.masonryWall && ' • Non-Drywall Surface'}
                  {tv.highRise && ' • High-Rise/Steel Studs'}
                  {tv.outletRelocation && !tv.isOutletOnly && ' • Outlet Installation'}
                  {tv.unmount && !tv.isUnmountOnly && ' • With Unmounting'}
                  {tv.remount && !tv.isRemountOnly && ' • With Remounting'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTvInstallation(index)}
                  className="h-7 w-7 p-0 ml-2"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {smartHomeInstallations.map((device, index) => (
              <div key={`smart-${index}`} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {device.type === 'doorbell' ? 'Smart Doorbell' :
                      device.type === 'floodlight' ? 'Smart Floodlight' :
                        'Smart Camera'}
                    {device.quantity > 1 && ` (×${device.quantity})`}
                  </span>
                  {device.type === 'doorbell' && device.brickInstallation && (
                    <span className="text-xs text-muted-foreground">• Brick installation</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSmartHomeInstallation(index)}
                  className="h-7 w-7 p-0 ml-2"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="services">Add TV Mounting</TabsTrigger>
          <TabsTrigger value="smarthome">Add Smart Home</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full py-4 flex items-center justify-center gap-2 rounded-xl bg-gray-50 border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-all shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span className="text-center font-medium">Add TV Mounting</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={addTvInstallation}>Add TV Mounting</DropdownMenuItem>
              <DropdownMenuItem onClick={addTVUnmountingOnly}>Add TV Unmounting Only</DropdownMenuItem>
              <DropdownMenuItem onClick={addTVRemountingOnly}>Add TV Remounting Only</DropdownMenuItem>
              <DropdownMenuItem onClick={addOutletOnly}>Add Outlet Installation Only</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {tvInstallations.map((installation, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border rounded-lg p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold">
                  {installation.isUnmountOnly ?
                    'TV Unmounting Only' :
                    installation.isRemountOnly ?
                      'TV Remounting Only' :
                      installation.isOutletOnly ?
                        'Outlet Installation Only' :
                        `TV ${index + 1}`}
                </h4>
                {tvInstallations.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTvInstallation(index)}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {!installation.isUnmountOnly && !installation.isRemountOnly && !installation.isOutletOnly && (
                <div className="space-y-6">
                  <div>
                    <h5 className="text-sm font-medium mb-3">TV Size</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={installation.size === 'small' ? 'default' : 'outline'}
                        onClick={() => updateTvInstallation(index, { size: 'small' })}
                        className="h-auto py-3 px-4"
                      >
                        <div className="text-center">
                          <div className="font-medium">32" - 55"</div>
                          <div className="text-xs text-muted-foreground mt-1">Small TV</div>
                        </div>
                      </Button>
                      <Button
                        variant={installation.size === 'large' ? 'default' : 'outline'}
                        onClick={() => updateTvInstallation(index, { size: 'large' })}
                        className="h-auto py-3 px-4"
                      >
                        <div className="text-center">
                          <div className="font-medium">56" or larger</div>
                          <div className="text-xs text-muted-foreground mt-1">Large TV</div>
                        </div>
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium mb-3">Mounting Location</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Button
                        variant={installation.location === 'standard' ? 'default' : 'outline'}
                        onClick={() => updateTvInstallation(index, { location: 'standard' })}
                        className="h-auto py-3 px-4"
                      >
                        <div className="text-center">
                          <div className="font-medium">Standard Wall</div>
                          <div className="text-xs text-muted-foreground mt-1">$100</div>
                        </div>
                      </Button>
                      <Button
                        variant={installation.location === 'fireplace' ? 'default' : 'outline'}
                        onClick={() => updateTvInstallation(index, { location: 'fireplace' })}
                        className="h-auto py-3 px-4"
                      >
                        <div className="text-center">
                          <div className="font-medium">Above Fireplace</div>
                          <div className="text-xs text-muted-foreground mt-1">$200</div>
                        </div>
                      </Button>
                      <Button
                        variant={installation.location === 'ceiling' ? 'default' : 'outline'}
                        onClick={() => updateTvInstallation(index, { location: 'ceiling' })}
                        className="h-auto py-3 px-4"
                      >
                        <div className="text-center">
                          <div className="font-medium">Ceiling Mount</div>
                          <div className="text-xs text-muted-foreground mt-1">$175</div>
                        </div>
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium mb-3">Mount Type (Optional)</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={installation.mountType === 'fixed' ? 'default' : 'outline'}
                        onClick={() => updateTvInstallation(index, { mountType: 'fixed' })}
                        className="h-auto py-3 px-4"
                      >
                        <div className="text-center">
                          <div className="font-medium">Fixed Mount</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {installation.size === 'small' ? '$40' : '$60'}
                          </div>
                        </div>
                      </Button>
                      <Button
                        variant={installation.mountType === 'tilt' ? 'default' : 'outline'}
                        onClick={() => updateTvInstallation(index, { mountType: 'tilt' })}
                        className="h-auto py-3 px-4"
                      >
                        <div className="text-center">
                          <div className="font-medium">Tilt Mount</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {installation.size === 'small' ? '$50' : '$70'}
                          </div>
                        </div>
                      </Button>
                      <Button
                        variant={installation.mountType === 'fullMotion' ? 'default' : 'outline'}
                        onClick={() => updateTvInstallation(index, { mountType: 'fullMotion' })}
                        className="h-auto py-3 px-4"
                      >
                        <div className="text-center">
                          <div className="font-medium">Full Motion</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {installation.size === 'small' ? '$80' : '$100'}
                          </div>
                        </div>
                      </Button>
                      <Button
                        variant={installation.mountType === 'none' ? 'default' : 'outline'}
                        onClick={() => updateTvInstallation(index, { mountType: 'none' })}
                        className="h-auto py-3 px-4"
                      >
                        <div className="text-center">
                          <div className="font-medium">No Mount</div>
                          <div className="text-xs text-muted-foreground mt-1">Customer Provided</div>
                        </div>
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium mb-3">Additional Options</h5>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={installation.masonryWall}
                          onCheckedChange={(checked) =>
                            updateTvInstallation(index, { masonryWall: checked })
                          }
                        />
                        <Label>Non-Drywall Installation (+$50)<br />
                          <span className="text-xs text-muted-foreground">
                            Includes brick, concrete, stone, tile, or siding
                          </span>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={installation.highRise}
                          onCheckedChange={(checked) =>
                            updateTvInstallation(index, { highRise: checked })
                          }
                        />
                        <Label>High-Rise Building / Steel Studs (+$25)<br />
                          <span className="text-xs text-muted-foreground">
                            Additional fee for specialized anchors and drill bits
                          </span>
                        </Label>
                      </div>

                      {installation.location !== 'fireplace' && (
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={installation.outletRelocation}
                            onCheckedChange={(checked) =>
                              updateTvInstallation(index, { outletRelocation: checked })
                            }
                          />
                          <Label>Outlet Installation (+$100)</Label>
                        </div>
                      )}

                      {installation.location === 'fireplace' && (
                        <div className="text-sm text-muted-foreground mt-2 p-3 bg-muted rounded-lg">
                          Note: For outlet installation above fireplaces, please send photos of your fireplace and nearby outlets for a custom quote.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!installation.isUnmountOnly && !installation.isRemountOnly && !installation.isOutletOnly && (
                <div>
                  <h5 className="text-sm font-medium mb-3">Service Add-ons</h5>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={installation.unmount}
                        onCheckedChange={(checked) =>
                          updateTvInstallation(index, { unmount: checked })
                        }
                      />
                      <Label>TV Unmounting (+$50)<br />
                        <span className="text-xs text-muted-foreground">
                          Remove your existing TV from its current location
                        </span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={installation.remount}
                        onCheckedChange={(checked) =>
                          updateTvInstallation(index, { remount: checked })
                        }
                      />
                      <Label>TV Remounting (+$50)<br />
                        <span className="text-xs text-muted-foreground">
                          If the mount is already on the wall and matching arms are provided
                        </span>
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {installation.isUnmountOnly && (
                <div className="text-sm p-4 bg-muted rounded-lg">
                  <p className="font-medium mb-2">TV Unmounting Only Service</p>
                  <p className="text-muted-foreground">$50 per TV - Our team will safely remove your TV from its current mount or stand.</p>
                </div>
              )}

              {installation.isRemountOnly && (
                <div className="text-sm p-4 bg-muted rounded-lg">
                  <p className="font-medium mb-2">TV Remounting Only Service</p>
                  <p className="text-muted-foreground">$50 per TV - Our team will mount your TV to an existing bracket on the wall (matching arms must be provided).</p>
                </div>
              )}
              
              {installation.isOutletOnly && (
                <div className="text-sm p-4 bg-muted rounded-lg">
                  <p className="font-medium mb-2">Outlet Installation Only Service</p>
                  <p className="text-muted-foreground">$100 per outlet - Our team will install a new power outlet behind your TV location or anywhere in your home.</p>
                </div>
              )}
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="smarthome" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={() => addSmartHomeInstallation('doorbell')}
              className="h-auto py-4 px-4 flex flex-col items-center rounded-xl bg-gray-50 border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-all shadow-sm"
            >
              <div className="text-center">
                <div className="font-medium">Smart Doorbell</div>
                <div className="text-xs text-muted-foreground mt-1">$85</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => addSmartHomeInstallation('floodlight')}
              className="h-auto py-4 px-4 flex flex-col items-center rounded-xl bg-gray-50 border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-all shadow-sm"
            >
              <div className="text-center">
                <div className="font-medium">Smart Floodlight</div>
                <div className="text-xs text-muted-foreground mt-1">$125</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => addSmartHomeInstallation('camera')}
              className="h-auto py-4 px-4 flex flex-col items-center rounded-xl bg-gray-50 border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-all shadow-sm"
            >
              <div className="text-center">
                <div className="font-medium">Smart Camera</div>
                <div className="text-xs text-muted-foreground mt-1">$75</div>
              </div>
            </Button>
          </div>

          {smartHomeInstallations.map((installation, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border rounded-lg p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold">
                  {installation.type === 'doorbell' ? 'Smart Doorbell' :
                    installation.type === 'floodlight' ? 'Smart Floodlight' :
                      'Smart Camera'} Installation
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSmartHomeInstallation(index)}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Label htmlFor={`quantity-${index}`} className="w-20">Quantity:</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateSmartHomeInstallation(index, {
                        quantity: Math.max(1, installation.quantity - 1)
                      })}
                    >
                      <MinusCircle className="h-4 w-4" />
                    </Button>
                    <div className="w-12 text-center font-medium">
                      {installation.quantity}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateSmartHomeInstallation(index, {
                        quantity: Math.min(10, installation.quantity + 1)
                      })}
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {installation.type === 'doorbell' && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={installation.brickInstallation}
                      onCheckedChange={(checked) =>
                        updateSmartHomeInstallation(index, { brickInstallation: checked })
                      }
                    />
                    <Label>Brick Installation (+$10)</Label>
                  </div>
                )}

                <div className="mt-4 p-3 bg-muted rounded-md">
                  <h5 className="font-medium text-sm mb-1">Base Price</h5>
                  <p className="text-lg font-semibold">
                    {installation.type === 'doorbell' ? '$85' :
                      installation.type === 'floodlight' ? '$125' :
                        '$75'}{installation.quantity > 1 ? ` × ${installation.quantity}` : ''}
                  </p>

                  {installation.type === 'doorbell' && installation.brickInstallation && (
                    <div className="text-xs text-muted-foreground mt-1">
                      + $10{installation.quantity > 1 ? ` × ${installation.quantity}` : ''} (Brick Installation)
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </TabsContent>
      </Tabs>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={onClose}
          disabled={!hasSelectionsToConfirm}
        >
          Next
        </Button>
      </div>
    </div>
  );
}