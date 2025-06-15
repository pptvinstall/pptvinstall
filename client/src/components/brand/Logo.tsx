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
      {/* Circular Logo with PPTV Image */}
      <div className={`${logoSizes[size]} rounded-full bg-gradient-to-br from-gray-900 via-gray-800 to-black shadow-lg flex items-center justify-center relative overflow-hidden border-2 border-gray-700`}>
        {/* PPTV Logo Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
          style={{
            backgroundImage: `url('/attached_assets/018935ae0ebdae1e5f51794af428a79cc04c836b25_1749998390623.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        
        {/* Subtle overlay for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/10 to-black/20 rounded-full" />
      </div>

      {/* Company Name */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizes[size]} font-bold ${getTextColor()} leading-tight`}>
            Picture Perfect
          </span>
          <span className={`${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-lg'} font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent leading-tight`}>
            TV Install
          </span>
        </div>
      )}
    </div>
  );
}

export default Logo;