
import React from "react";
import { AlertTriangle, Tool, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaintenanceModeProps {
  message?: string;
  estimatedTime?: string;
  onRetry?: () => void;
}

const MaintenanceMode: React.FC<MaintenanceModeProps> = ({
  message = "Our site is currently undergoing scheduled maintenance.",
  estimatedTime = "We'll be back shortly",
  onRetry
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
          <Tool className="h-8 w-8 text-yellow-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Site Maintenance</h1>
        
        <p className="text-gray-600 mb-6">{message}</p>
        
        {estimatedTime && (
          <div className="bg-blue-50 text-blue-700 py-3 px-4 rounded-md flex items-center justify-center space-x-2 mb-6">
            <Clock className="h-5 w-5" />
            <span>{estimatedTime}</span>
          </div>
        )}
        
        {onRetry && (
          <Button
            onClick={onRetry}
            className="inline-flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default MaintenanceMode;
