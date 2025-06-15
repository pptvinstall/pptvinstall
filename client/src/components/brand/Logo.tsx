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
  const logoSizes = {
    sm: showText ? 'w-8 h-8' : 'w-8 h-8',
    md: showText ? 'w-12 h-12' : 'w-10 h-10',  
    lg: showText ? 'w-16 h-16' : 'w-12 h-12',
    xl: showText ? 'w-20 h-20' : 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
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
      {/* Modern PPTV Logo */}
      <div className={`${logoSizes[size]} flex items-center justify-center relative`}>
        {/* PPTV Text Logo */}
        <div className="flex items-baseline font-bold tracking-tight">
          <span className={`${
            size === 'sm' ? 'text-xl' :
            size === 'md' ? 'text-2xl' :
            size === 'lg' ? 'text-3xl' :
            'text-4xl'
          } text-[#1e293b] font-black`}>PP</span>
          <span className={`${
            size === 'sm' ? 'text-xl' :
            size === 'md' ? 'text-2xl' :
            size === 'lg' ? 'text-3xl' :
            'text-4xl'
          } text-[#dc2626] font-black`}>TV</span>
        </div>
      </div>

      {/* Company Name */}
      {showText && (
        <div className="flex flex-col">
          <h1 className={`font-bold leading-tight ${textSizes[size]} ${
            variant === 'light' ? 'text-white' : 
            variant === 'dark' ? 'text-gray-900' : 
            'text-gray-900'
          }`}>
            Picture Perfect TV Install
          </h1>
          <p className={`text-xs ${
            variant === 'light' ? 'text-blue-200' : 
            variant === 'dark' ? 'text-gray-600' : 
            'text-gray-600'
          } font-medium tracking-wide`}>
            PREMIUM TV MOUNTING & SMART HOME
          </p>
        </div>
      )}
    </div>
  );
}

export default Logo;