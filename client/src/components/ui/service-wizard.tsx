import * as React from "react"
import { Button } from "./button"
import { motion } from "framer-motion"
import { Plus, Minus } from "lucide-react"

export type TVInstallation = {
  size: 'small' | 'large';
  location: 'standard' | 'fireplace' | 'ceiling';
  mountType: 'fixed' | 'tilt' | 'fullMotion' | 'none';
};

interface ServiceWizardProps {
  onServiceSelect: (installations: TVInstallation[]) => void;
  onClose: () => void;
}

export function ServiceWizard({ onServiceSelect, onClose }: ServiceWizardProps) {
  const [installations, setInstallations] = React.useState<TVInstallation[]>([{
    size: 'small',
    location: 'standard',
    mountType: 'none'
  }]);

  const addInstallation = () => {
    setInstallations(prev => [...prev, {
      size: 'small',
      location: 'standard',
      mountType: 'none'
    }]);
  };

  const removeInstallation = (index: number) => {
    setInstallations(prev => prev.filter((_, i) => i !== index));
  };

  const updateInstallation = (index: number, updates: Partial<TVInstallation>) => {
    setInstallations(prev => prev.map((inst, i) =>
      i === index ? { ...inst, ...updates } : inst
    ));
  };

  return (
    <div className="space-y-6">
      {installations.map((installation, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border rounded-lg p-6 space-y-6"
        >
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold">TV {index + 1}</h4>
            {installations.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeInstallation(index)}
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
                  onClick={() => updateInstallation(index, { size: 'small' })}
                  className="h-auto py-3 px-4"
                >
                  <div className="text-center">
                    <div className="font-medium">32" - 55"</div>
                    <div className="text-xs text-muted-foreground mt-1">Small TV</div>
                  </div>
                </Button>
                <Button
                  variant={installation.size === 'large' ? 'default' : 'outline'}
                  onClick={() => updateInstallation(index, { size: 'large' })}
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
                  onClick={() => updateInstallation(index, { location: 'standard' })}
                  className="h-auto py-3 px-4"
                >
                  <div className="text-center">
                    <div className="font-medium">Standard Wall</div>
                    <div className="text-xs text-muted-foreground mt-1">$100</div>
                  </div>
                </Button>
                <Button
                  variant={installation.location === 'fireplace' ? 'default' : 'outline'}
                  onClick={() => updateInstallation(index, { location: 'fireplace' })}
                  className="h-auto py-3 px-4"
                >
                  <div className="text-center">
                    <div className="font-medium">Above Fireplace</div>
                    <div className="text-xs text-muted-foreground mt-1">+$100</div>
                  </div>
                </Button>
                <Button
                  variant={installation.location === 'ceiling' ? 'default' : 'outline'}
                  onClick={() => updateInstallation(index, { location: 'ceiling' })}
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
                  onClick={() => updateInstallation(index, { mountType: 'fixed' })}
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
                  onClick={() => updateInstallation(index, { mountType: 'tilt' })}
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
                  onClick={() => updateInstallation(index, { mountType: 'fullMotion' })}
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
                  onClick={() => updateInstallation(index, { mountType: 'none' })}
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

      <Button
        variant="outline"
        onClick={addInstallation}
        className="w-full py-6"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Another TV
      </Button>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onServiceSelect(installations)}>
          Confirm Selection
        </Button>
      </div>
    </div>
  );
}