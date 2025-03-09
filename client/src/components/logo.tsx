import React from 'react';
import { cn } from '@/lib/utils';

export interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
}

export function Logo({ className, size = 'md', withText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
    xl: 'h-16',
  };

  return (
    <div className={cn('flex items-center', className)}>
      <svg 
        className={cn(sizeClasses[size], 'w-auto')}
        viewBox="0 0 300 300" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="150" cy="150" r="150" fill="#000" />
        
        {/* First P with TV screens */}
        <path 
          d="M70 85 L70 215 L100 215 L100 170 L110 170 C130 170 145 155 145 130 C145 105 130 85 110 85 Z" 
          fill="#243b78" 
        />
        <path 
          d="M100 115 L100 140 L110 140 C115 140 120 135 120 128 C120 120 115 115 110 115 Z" 
          fill="#243b78" 
          stroke="#fff" 
          strokeWidth="1"
        />
        
        {/* TV screen effect inside first P */}
        <rect x="75" y="95" width="60" height="40" rx="2" fill="url(#tvScreenPattern)" />
        <rect x="75" y="145" width="25" height="60" rx="2" fill="url(#tvScreenPattern)" />
        
        {/* Second P */}
        <path 
          d="M115 85 L115 215 L145 215 L145 170 L155 170 C175 170 190 155 190 130 C190 105 175 85 155 85 Z" 
          fill="#243b78" 
        />
        <path 
          d="M145 115 L145 140 L155 140 C160 140 165 135 165 128 C165 120 160 115 155 115 Z" 
          fill="#243b78" 
          stroke="#fff" 
          strokeWidth="1"
        />
        
        {/* TV screen effect inside second P */}
        <rect x="120" y="95" width="60" height="40" rx="2" fill="url(#tvScreenPattern)" />
        <rect x="120" y="145" width="25" height="60" rx="2" fill="url(#tvScreenPattern)" />
        
        {/* TV text */}
        <text x="195" y="170" fontSize="60" fontWeight="bold" fill="#e53935">TV</text>
        
        {/* TV screen pattern definition */}
        <defs>
          <pattern id="tvScreenPattern" patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="scale(0.5)">
            <rect width="20" height="20" fill="#4b71b4" />
            <rect width="10" height="10" fill="#6f9cf5" />
            <rect x="10" y="10" width="10" height="10" fill="#6f9cf5" />
          </pattern>
        </defs>
      </svg>
      
      {withText && (
        <span className="ml-2 text-xl font-bold">
          Picture Perfect
        </span>
      )}
    </div>
  );
}