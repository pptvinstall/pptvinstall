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
      {/* Authentic PPTV Logo */}
      <div className={`${logoSizes[size]} rounded-lg bg-white shadow-lg flex items-center justify-center relative overflow-hidden border border-gray-200`}>
        <img 
          src="/attached_assets/IMG_0032_1750000108185.jpg" 
          alt="Picture Perfect TV Install Logo"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Company Name */}
      {showText && (
        <div className="flex flex-col">
          <h1 className={`font-bold leading-tight ${textSizes[size]} ${
            variant === 'light' ? 'text-white' : 
            variant === 'dark' ? 'text-gray-900' : 
            'text-blue-900'
          }`}>
            Picture Perfect TV Install
          </h1>
          <p className={`text-xs ${
            variant === 'light' ? 'text-blue-100' : 
            variant === 'dark' ? 'text-gray-600' : 
            'text-blue-600'
          } font-semibold tracking-wide uppercase`}>
            Professional TV Mounting & Smart Home
          </p>
        </div>
      )}
    </div>
  );
}

export default Logo;