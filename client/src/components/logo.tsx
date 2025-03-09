import React from 'react';
import { cn } from '@/lib/utils';

export interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  variant?: 'default' | 'simple';
}

export function Logo({ 
  className, 
  size = 'md', 
  withText = true, 
  variant = 'default' 
}: LogoProps) {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
    xl: 'h-16',
  };

  // SVG filter for subtle shadow effect
  const filterId = React.useId();

  return (
    <div className={cn('flex items-center', className)}>
      <svg 
        className={cn(sizeClasses[size], 'w-auto transition-transform hover:scale-105', 
          variant === 'default' ? 'drop-shadow-sm' : ''
        )}
        viewBox="0 0 300 300" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Filters for shadow effects */}
        <defs>
          <filter id={`glow-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          {/* Light effect */}
          <radialGradient id="lightEffect" cx="30%" cy="30%" r="70%" fx="30%" fy="30%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          
          {/* TV screen pattern definition */}
          <pattern id="tvScreenPattern" patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="scale(0.5)">
            <rect width="20" height="20" fill="#4b71b4" />
            <rect width="10" height="10" fill="#6f9cf5" />
            <rect x="10" y="10" width="10" height="10" fill="#6f9cf5" />
          </pattern>

          {/* Pattern with TV shows images simulation */}
          <pattern id="tvShowsPattern" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="scale(0.2)">
            <rect width="20" height="20" fill="#304f8c" />
            <rect x="20" y="0" width="20" height="20" fill="#466bc2" />
            <rect x="0" y="20" width="20" height="20" fill="#466bc2" />
            <rect x="20" y="20" width="20" height="20" fill="#304f8c" />
          </pattern>

          {/* Clip paths for proper tv shows appearance */}
          <clipPath id="firstPClip">
            <path d="M70 85 L70 215 L100 215 L100 170 L110 170 C130 170 145 155 145 130 C145 105 130 85 110 85 Z" />
          </clipPath>
          <clipPath id="secondPClip">
            <path d="M115 85 L115 215 L145 215 L145 170 L155 170 C175 170 190 155 190 130 C190 105 175 85 155 85 Z" />
          </clipPath>
        </defs>

        {/* Background circle */}
        <circle cx="150" cy="150" r="150" fill="#000" />
        
        {/* Light effect overlay */}
        <circle cx="150" cy="150" r="150" fill="url(#lightEffect)" />
        
        {/* First P with TV screens */}
        <g clipPath="url(#firstPClip)">
          <path 
            d="M70 85 L70 215 L100 215 L100 170 L110 170 C130 170 145 155 145 130 C145 105 130 85 110 85 Z" 
            fill="#243b78"
          />
          
          {/* TV screen pattern inside first P */}
          <rect x="70" y="85" width="75" height="130" fill="url(#tvShowsPattern)" />
          
          {/* Subtle highlight */}
          <path 
            d="M100 115 L100 140 L110 140 C115 140 120 135 120 128 C120 120 115 115 110 115 Z" 
            fill="none" 
            stroke="rgba(255,255,255,0.4)" 
            strokeWidth="1"
          />
        </g>
        
        {/* Second P */}
        <g clipPath="url(#secondPClip)">
          <path 
            d="M115 85 L115 215 L145 215 L145 170 L155 170 C175 170 190 155 190 130 C190 105 175 85 155 85 Z" 
            fill="#243b78" 
          />
          
          {/* TV screen pattern inside second P */}
          <rect x="115" y="85" width="75" height="130" fill="url(#tvShowsPattern)" />
          
          {/* Subtle highlight */}
          <path 
            d="M145 115 L145 140 L155 140 C160 140 165 135 165 128 C165 120 160 115 155 115 Z" 
            fill="none" 
            stroke="rgba(255,255,255,0.4)" 
            strokeWidth="1"
          />
        </g>
        
        {/* TV text with filter applied for glow effect */}
        <text 
          x="195" 
          y="170" 
          fontSize="60" 
          fontWeight="bold" 
          fill="#e53935" 
          filter={variant === 'default' ? `url(#glow-${filterId})` : ''}
        >
          TV
        </text>
        
        {/* Light reflection */}
        <circle cx="70" cy="70" r="15" fill="rgba(255,255,255,0.2)" />
      </svg>
      
      {withText && (
        <span className="ml-2 text-xl font-bold tracking-tight">
          Picture Perfect
        </span>
      )}
    </div>
  );
}