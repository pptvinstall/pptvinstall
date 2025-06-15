import { useState } from 'react';
import { TestTube, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TestModeToggleProps {
  isTestMode: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}

export function TestModeToggle({ isTestMode, onToggle, className }: TestModeToggleProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toggle Control */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-3">
          <TestTube className={cn(
            "h-5 w-5",
            isTestMode ? "text-orange-500" : "text-muted-foreground"
          )} />
          <div>
            <Label htmlFor="test-mode" className="text-sm font-medium cursor-pointer">
              Test Mode
            </Label>
            <p className="text-xs text-muted-foreground">
              Simulate bookings without creating real entries
            </p>
          </div>
          {isTestMode && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              Testing
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 hover:bg-muted rounded text-muted-foreground"
            title={showDetails ? "Hide details" : "Show details"}
          >
            {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <Switch
            id="test-mode"
            checked={isTestMode}
            onCheckedChange={onToggle}
          />
        </div>
      </div>

      {/* Test Mode Warning */}
      {isTestMode && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Test Mode Active:</strong> Bookings will be simulated and marked as test entries. 
            No real appointments will be created and no emails will be sent to customers.
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Information */}
      {showDetails && (
        <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg space-y-2">
          <h4 className="font-medium text-foreground">Test Mode Features:</h4>
          <ul className="space-y-1 list-disc list-inside">
            <li>Bookings are marked with "TEST" prefix</li>
            <li>Customer emails are not sent</li>
            <li>Admin notifications still work (for testing)</li>
            <li>Calendar exports still function</li>
            <li>Easy to identify and filter test entries</li>
            <li>Can be deleted in bulk from admin panel</li>
          </ul>
          <p className="text-xs italic mt-2">
            Perfect for training staff or testing the booking flow without affecting real customers.
          </p>
        </div>
      )}
    </div>
  );
}