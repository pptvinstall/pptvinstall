import { Loader2 } from "lucide-react";

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default LoadingSpinner;
import React from "react";

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-full w-full py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue-500"></div>
    </div>
  );
};

export default LoadingSpinner;
