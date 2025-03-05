import * as React from "react"
import { Button } from "./button"
import { motion } from "framer-motion"
import { Plus, Minus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"
import { Switch } from "./switch"
import { Label } from "./label"
import { Input } from "./input"
import { Card } from "./card"
import { Separator } from "./separator"

export type TVInstallation = {
  size: 'small' | 'large';
  location: 'standard' | 'fireplace' | 'ceiling';
  mountType: 'fixed' | 'tilt' | 'fullMotion' | 'none';
  masonryWall: boolean;
  outletRelocation: boolean;
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
    // Only notify parent if we have any selections
    if (tvInstallations.length > 0 || smartHomeInstallations.length > 0) {
      onServiceSelect({
        tvs: tvInstallations,
        smartHome: smartHomeInstallations
      });
    }
  }, [tvInstallations, smartHomeInstallations, onServiceSelect]);

  const addTvInstallation = () => {
    setTvInstallations(prev => [...prev, {
      size: 'small',
      location: 'standard',
      mountType: 'none',
      masonryWall: false,
      outletRelocation: false
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
      ...(type === 'doorbell' ? { brickInstallation: false } : {}),
      ...(type === 'camera' ? { mountHeight: 8 } : {})
    }]);
  };

  const removeSmartHomeInstallation = (index: number) => {
    setSmartHomeInstallations(prev => prev.filter((_, i) => i !== index));
  };

  const updateSmartHomeInstallation = (index: number, updates: Partial<SmartHomeInstallation>) => {
    setSmartHomeInstallations(prev => prev.map((inst, i) =>
      i === index ? { ...inst, ...updates } : inst
    ));
  };

  // Whether we have any services selected
  const hasSelectionsToConfirm = tvInstallations.length > 0 || smartHomeInstallations.length > 0;

  return (
    <div className="space-y-6">
      {(tvInstallations.length > 0 || smartHomeInstallations.length > 0) && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Selected Services</h3>
          <div className="space-y-2 text-sm">
            {tvInstallations.map((tv, index) => (
              <div key={`tv-${index}`} className="flex justify-between items-center">
                <span>
                  TV {index + 1}: {tv.size === 'large' ? '56"+' : '32"-55"'} - {tv.location} Mount
                  {tv.mountType !== 'none' && ` (${tv.mountType})`}
                  {tv.masonryWall && ' (Masonry)'}
                  {tv.outletRelocation && ' (Outlet Relocation)'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTvInstallation(index)}
                  className="h-6 w-6 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="space-y-3">
            {smartHomeInstallations.map((device, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-muted/60 hover:bg-muted/80 border border-muted rounded-md transition-colors">
                <div className="flex items-center gap-3">
                  {device.type === 'doorbell' && (
                    <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M17 13V7M17 7V1M17 7H11M17 7H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {device.type === 'floodlight' && (
                    <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 3V5M5.64 5.64L7.05 7.05M18.36 5.64L16.95 7.05M12 21V18M4 13H2M22 13H20M6 13C6 9.68629 8.68629 7 12 7C15.3137 7 18 9.68629 18 13C18 14.6569 17.3284 16.1569 16.2426 17.2426L15 20H9L7.75736 17.2426C6.67157 16.1569 6 14.6569 6 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {device.type === 'camera' && (
                    <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M23 19V8C23 6.89543 22.1046 6 21 6H3C1.89543 6 1 6.89543 1 8V19C1 20.1046 1.89543 21 3 21H21C22.1046 21 23 20.1046 23 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  <div>
                    <span className="font-medium">
                      {device.type === 'doorbell' ? 'Smart Doorbell' : 
                      device.type === 'floodlight' ? 'Floodlight Camera' : 
                      'Smart Camera'}
                      {device.quantity > 1 && ` (${device.quantity})`}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      {device.type === 'camera' && device.mountHeight && device.mountHeight > 8 &&
                        `Mount height: ${device.mountHeight}ft`}
                      {device.type === 'doorbell' && device.brickInstallation && 'Brick installation'}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSmartHomeInstallation(index)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          </div>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="services">Add TV Mounting</TabsTrigger>
          <TabsTrigger value="smarthome">Add Smart Home</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-6">
          <Button
            variant="outline"
            onClick={addTvInstallation}
            className="w-full py-6"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add a TV to Mount
          </Button>

          {tvInstallations.map((installation, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border rounded-lg p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold">TV {index + 1}</h4>
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
                        <div className="text-xs text-muted-foreground mt-1">+$100</div>
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
                      <Label>Non-Drywall Installation (+$50)<br/>
                        <span className="text-sm text-muted-foreground">
                          Includes brick, concrete, stone, tile, or siding
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
                        <Label>Outlet Relocation (+$100)</Label>
                      </div>
                    )}

                    {installation.location === 'fireplace' && (
                      <div className="text-sm text-muted-foreground mt-2 p-3 bg-muted rounded-lg">
                        Note: For outlet relocation above fireplaces, please send photos of your fireplace and nearby outlets for a custom quote.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="smarthome" className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={() => addSmartHomeInstallation('doorbell')}
              className="h-auto py-3 px-4"
            >
              <div className="text-center">
                <div className="font-medium">Smart Doorbell</div>
                <div className="text-xs text-muted-foreground mt-1">From $75</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => addSmartHomeInstallation('floodlight')}
              className="h-auto py-3 px-4"
            >
              <div className="text-center">
                <div className="font-medium">Floodlight</div>
                <div className="text-xs text-muted-foreground mt-1">$100</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => addSmartHomeInstallation('camera')}
              className="h-auto py-3 px-4"
            >
              <div className="text-center">
                <div className="font-medium">Smart Camera</div>
                <div className="text-xs text-muted-foreground mt-1">From $75</div>
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
                    installation.type === 'floodlight' ? 'Floodlight' :
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
                  <Label>Quantity:</Label>
                  <Input
                    type="number"
                    min="1"
                    value={installation.quantity}
                    onChange={(e) => updateSmartHomeInstallation(index, { quantity: parseInt(e.target.value) || 1 })}
                    className="w-20"
                  />
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

                {installation.type === 'camera' && (
                  <div className="space-y-2">
                    <Label>Mount Height (feet)</Label>
                    <Input
                      type="number"
                      min="8"
                      step="1"
                      value={installation.mountHeight}
                      onChange={(e) => updateSmartHomeInstallation(index, {
                        mountHeight: Math.max(8, parseInt(e.target.value) || 8)
                      })}
                      className="w-full"
                    />
                    <p className="text-sm text-muted-foreground">
                      +$25 per additional 4 feet above 8 feet
                      <span className="ml-1 cursor-help" 
                            title="Each additional 4 feet of height incurs a $25 charge for additional hardware and safety measures">ⓘ</span>
                    </p>
                  </div>
                )}

                <div className="text-sm text-muted-foreground mt-2">
                  Base Price: {
                    installation.type === 'doorbell' ? '$75' :
                      installation.type === 'floodlight' ? '$100' :
                        '$75'
                  }
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
        {/* Replaced the Confirm Selection button with a Next button that auto-proceeds */}
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