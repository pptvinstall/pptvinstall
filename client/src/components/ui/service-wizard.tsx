import * as React from "react"
import { Button } from "./button"
import { motion } from "framer-motion"
import { Plus, Minus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"
import { Switch } from "./switch"
import { Label } from "./label"
import { Input } from "./input"

export type TVInstallation = {
  size: 'small' | 'large';
  location: 'standard' | 'fireplace' | 'ceiling';
  mountType: 'fixed' | 'tilt' | 'fullMotion' | 'none';
};

export type SmartHomeInstallation = {
  type: 'doorbell' | 'floodlight' | 'camera';
  quantity: number;
  brickInstallation?: boolean; // for doorbell
  mountHeight?: number; // for camera
};

interface ServiceWizardProps {
  onServiceSelect: (services: { tvs: TVInstallation[], smartHome: SmartHomeInstallation[] }) => void;
  onClose: () => void;
}

export function ServiceWizard({ onServiceSelect, onClose }: ServiceWizardProps) {
  const [activeTab, setActiveTab] = React.useState('tv');
  const [tvInstallations, setTvInstallations] = React.useState<TVInstallation[]>([]);
  const [smartHomeInstallations, setSmartHomeInstallations] = React.useState<SmartHomeInstallation[]>([]);

  const addTvInstallation = () => {
    setTvInstallations(prev => [...prev, {
      size: 'small',
      location: 'standard',
      mountType: 'none'
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

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="tv">TV Installation</TabsTrigger>
        <TabsTrigger value="smarthome">Smart Home</TabsTrigger>
      </TabsList>

      <TabsContent value="tv" className="space-y-6">
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
            </div>
          </motion.div>
        ))}

        {tvInstallations.length === 0 ? (
          <Button
            variant="outline"
            onClick={addTvInstallation}
            className="w-full py-6"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add TV Installation
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={addTvInstallation}
            className="w-full py-6"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another TV
          </Button>
        )}
      </TabsContent>

      <TabsContent value="smarthome" className="space-y-6">
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
      </TabsContent>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onServiceSelect({ 
          tvs: tvInstallations,
          smartHome: smartHomeInstallations
        })}>
          Confirm Selection
        </Button>
      </div>
    </Tabs>
  );
}