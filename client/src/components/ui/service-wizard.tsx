import * as React from "react"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Minus } from "lucide-react"

export type TVInstallation = {
  size: 'small' | 'large';
  location: 'standard' | 'fireplace' | 'ceiling';
  mountType: 'fixed' | 'tilt' | 'fullMotion' | 'none';
};

export type ServiceQuestion = {
  id: string;
  question: string;
  options: {
    text: string;
    nextId?: string;
    service?: string;
  }[];
}

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
    <Card className="w-full max-w-lg mx-auto">
      <CardContent className="p-6">
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Configure Your TV Installation(s)</h3>

          {installations.map((installation, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 p-4 border rounded-lg"
            >
              <div className="flex justify-between items-center">
                <h4 className="font-medium">TV {index + 1}</h4>
                {installations.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInstallation(index)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-medium mb-2">TV Size</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={installation.size === 'small' ? 'default' : 'outline'}
                      onClick={() => updateInstallation(index, { size: 'small' })}
                    >
                      Under 55"
                    </Button>
                    <Button
                      variant={installation.size === 'large' ? 'default' : 'outline'}
                      onClick={() => updateInstallation(index, { size: 'large' })}
                    >
                      56" or larger
                    </Button>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium mb-2">Mounting Location</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={installation.location === 'standard' ? 'default' : 'outline'}
                      onClick={() => updateInstallation(index, { location: 'standard' })}
                    >
                      Standard Wall
                    </Button>
                    <Button
                      variant={installation.location === 'fireplace' ? 'default' : 'outline'}
                      onClick={() => updateInstallation(index, { location: 'fireplace' })}
                    >
                      Above Fireplace
                    </Button>
                    <Button
                      variant={installation.location === 'ceiling' ? 'default' : 'outline'}
                      onClick={() => updateInstallation(index, { location: 'ceiling' })}
                    >
                      Ceiling
                    </Button>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium mb-2">Mount Type (Optional)</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={installation.mountType === 'fixed' ? 'default' : 'outline'}
                      onClick={() => updateInstallation(index, { mountType: 'fixed' })}
                    >
                      Fixed ({installation.size === 'small' ? '$40' : '$60'})
                    </Button>
                    <Button
                      variant={installation.mountType === 'tilt' ? 'default' : 'outline'}
                      onClick={() => updateInstallation(index, { mountType: 'tilt' })}
                    >
                      Tilt ({installation.size === 'small' ? '$50' : '$70'})
                    </Button>
                    <Button
                      variant={installation.mountType === 'fullMotion' ? 'default' : 'outline'}
                      onClick={() => updateInstallation(index, { mountType: 'fullMotion' })}
                    >
                      Full Motion ({installation.size === 'small' ? '$80' : '$100'})
                    </Button>
                    <Button
                      variant={installation.mountType === 'none' ? 'default' : 'outline'}
                      onClick={() => updateInstallation(index, { mountType: 'none' })}
                    >
                      No Mount
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={addInstallation}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another TV
            </Button>
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onServiceSelect(installations)}>
              Confirm Selection
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}