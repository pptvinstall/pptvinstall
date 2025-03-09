import React from 'react';
import { cn } from '@/lib/utils';

export interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
}

export function Logo({ 
  className, 
  size = 'md', 
  withText = true
}: LogoProps) {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
    xl: 'h-16',
  };

  return (
    <div className={cn('flex items-center', className)}>
      <img 
        src="/images/logo.png" 
        alt="Picture Perfect TV Logo" 
        className={cn(
          sizeClasses[size], 
          'w-auto object-contain transition-transform hover:scale-105',
          'rounded-full shadow-sm'
        )} 
      />
      
      {withText && (
        <span className="ml-2 text-lg font-bold tracking-tight">
          Picture Perfect TV Install
        </span>
      )}
    </div>
  );
}