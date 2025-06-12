import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Eye } from "lucide-react";

interface EnvironmentIndicatorProps {
  className?: string;
}

export function EnvironmentIndicator({ className }: EnvironmentIndicatorProps) {
  // Detect environment based on URL and environment variables
  const isProduction = import.meta.env.PROD && 
    (window.location.hostname.includes('replit.app') || 
     window.location.hostname.includes('pictureperfe') ||
     !window.location.hostname.includes('localhost'));
     
  const isStaging = import.meta.env.VITE_ENVIRONMENT === 'staging' ||
    window.location.hostname.includes('staging') ||
    window.location.search.includes('preview=true');
    
  const isDevelopment = import.meta.env.DEV || 
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1');

  // Don't show indicator in production unless explicitly staging
  if (isProduction && !isStaging) {
    return null;
  }

  const getEnvironmentInfo = () => {
    if (isStaging) {
      return {
        label: 'STAGING',
        variant: 'secondary' as const,
        icon: Eye,
        color: 'bg-yellow-500 text-yellow-50'
      };
    }
    
    if (isDevelopment) {
      return {
        label: 'DEV',
        variant: 'outline' as const,
        icon: AlertTriangle,
        color: 'bg-blue-500 text-blue-50'
      };
    }
    
    return {
      label: 'PREVIEW',
      variant: 'secondary' as const,
      icon: Eye,
      color: 'bg-orange-500 text-orange-50'
    };
  };

  const envInfo = getEnvironmentInfo();
  const Icon = envInfo.icon;

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <Badge 
        variant={envInfo.variant}
        className={`${envInfo.color} font-medium shadow-lg animate-pulse`}
      >
        <Icon className="h-3 w-3 mr-1" />
        {envInfo.label}
      </Badge>
    </div>
  );
}