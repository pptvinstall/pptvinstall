import { Loader2 } from "lucide-react";

export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-full w-full">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default LoadingSpinner;
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-t-2 border-b-2 border-brand-blue-500 ${sizeClasses[size]}`}></div>
    </div>
  );
};

export default LoadingSpinner;
export { LoadingSpinner };
