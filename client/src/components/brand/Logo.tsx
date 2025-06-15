import { Monitor, Zap } from "lucide-react";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'color';
  showText?: boolean;
  className?: string;
}

export function Logo({ 
  size = 'md', 
  variant = 'color', 
  showText = true, 
  className = '' 
}: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const getLogoColors = () => {
    switch (variant) {
      case 'light':
        return 'from-white to-gray-100 text-gray-800';
      case 'dark':
        return 'from-gray-800 to-gray-900 text-white';
      case 'color':
      default:
        return 'from-blue-600 via-indigo-600 to-purple-600 text-white';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'light':
        return 'text-gray-800';
      case 'dark':
        return 'text-white';
      case 'color':
      default:
        return 'text-gray-900';
    }
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo Icon */}
      <div className={`${sizeClasses[size]} bg-gradient-to-br ${getLogoColors()} rounded-xl shadow-lg flex items-center justify-center relative overflow-hidden`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        
        {/* Main TV Icon */}
        <Monitor className={`${size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : size === 'lg' ? 'h-6 w-6' : 'h-8 w-8'} relative z-10`} />
        
        {/* Electric/Tech accent */}
        <Zap className={`${size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : size === 'lg' ? 'h-3 w-3' : 'h-4 w-4'} absolute bottom-0 right-0 transform translate-x-0.5 translate-y-0.5 text-yellow-300`} />
      </div>

      {/* Company Name */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizes[size]} font-bold ${getTextColor()} leading-tight`}>
            Picture Perfect
          </span>
          <span className={`${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : size === 'lg' ? 'text-lg' : 'text-xl'} font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent leading-tight`}>
            TV Install
          </span>
        </div>
      )}
    </div>
  );
}

export default Logo;