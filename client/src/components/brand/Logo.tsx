import { Monitor, Zap, Play } from "lucide-react";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'color';
  showText?: boolean;
  className?: string;
  style?: 'modern' | 'entertainment' | 'professional';
}

export function Logo({ 
  size = 'md', 
  variant = 'color', 
  showText = true, 
  className = '',
  style = 'entertainment'
}: LogoProps) {
  const sizeClasses = {
    sm: showText ? 'h-8' : 'h-8 w-8',
    md: showText ? 'h-10' : 'h-10 w-10',  
    lg: showText ? 'h-12' : 'h-12 w-12',
    xl: showText ? 'h-16' : 'h-16 w-16'
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

  if (style === 'entertainment' && showText) {
    return (
      <div className={`flex items-center ${className}`}>
        {/* PPTV Style Logo */}
        <div className="relative">
          {/* PP Letters with TV content pattern */}
          <div className="flex items-center">
            <div className="relative">
              {/* First P */}
              <div className={`${size === 'sm' ? 'text-3xl' : size === 'md' ? 'text-4xl' : size === 'lg' ? 'text-5xl' : 'text-6xl'} font-black relative`}>
                <span className="absolute inset-0 bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 bg-clip-text text-transparent opacity-90">
                  P
                </span>
                <span className="relative bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
                  P
                </span>
              </div>
            </div>
            
            {/* TV Letters */}
            <div className="relative ml-1">
              <div className={`${size === 'sm' ? 'text-3xl' : size === 'md' ? 'text-4xl' : size === 'lg' ? 'text-5xl' : 'text-6xl'} font-black`}>
                <span className="bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                  TV
                </span>
              </div>
            </div>
          </div>
          
          {/* Subtitle */}
          <div className={`${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-lg'} font-semibold text-gray-600 mt-1 tracking-wider`}>
            INSTALL
          </div>
        </div>
      </div>
    );
  }

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