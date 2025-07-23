// Consolidated UI Components - Optimized for smaller bundle size
import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Check, Clock, MapPin, Phone, Mail, Calendar, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

// Enhanced Loading Spinner with different sizes
export const OptimizedLoadingSpinner = memo(({ 
  size = 'md', 
  className = '',
  text = ''
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <div className={cn('animate-spin rounded-full border-2 border-gray-300 border-t-blue-600', sizeClasses[size])} />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );
});

// Optimized Feature Card Component
export const OptimizedFeatureCard = memo(({ 
  icon: Icon, 
  title, 
  description, 
  highlight = false,
  onClick,
  className = ''
}: {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  highlight?: boolean;
  onClick?: () => void;
  className?: string;
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'p-6 rounded-lg border transition-colors cursor-pointer',
        highlight 
          ? 'bg-blue-50 border-blue-200 shadow-md' 
          : 'bg-white border-gray-200 hover:border-gray-300',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          'p-2 rounded-lg',
          highlight ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
        )}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.div>
  );
});

// Consolidated Status Badge Component
export const StatusBadge = memo(({ 
  status, 
  className = '' 
}: { 
  status: string; 
  className?: string; 
}) => {
  const getStatusConfig = useMemo(() => {
    const configs = {
      'confirmed': { color: 'bg-green-100 text-green-800', icon: Check },
      'pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'cancelled': { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      'completed': { color: 'bg-blue-100 text-blue-800', icon: Check },
      'scheduled': { color: 'bg-purple-100 text-purple-800', icon: Calendar },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  }, [status]);

  const { color, icon: Icon } = getStatusConfig;

  return (
    <Badge className={cn('flex items-center gap-1', color, className)}>
      <Icon className="w-3 h-3" />
      {status}
    </Badge>
  );
});

// Optimized Contact Info Component
export const ContactInfo = memo(({ 
  phone, 
  email, 
  address, 
  compact = false 
}: {
  phone?: string;
  email?: string;
  address?: string;
  compact?: boolean;
}) => {
  const iconClass = compact ? 'w-3 h-3' : 'w-4 h-4';
  const textClass = compact ? 'text-xs' : 'text-sm';
  
  return (
    <div className={cn('space-y-2', compact && 'space-y-1')}>
      {phone && (
        <div className="flex items-center gap-2">
          <Phone className={cn('text-gray-500', iconClass)} />
          <span className={cn('text-gray-700', textClass)}>{phone}</span>
        </div>
      )}
      {email && (
        <div className="flex items-center gap-2">
          <Mail className={cn('text-gray-500', iconClass)} />
          <span className={cn('text-gray-700', textClass)}>{email}</span>
        </div>
      )}
      {address && (
        <div className="flex items-start gap-2">
          <MapPin className={cn('text-gray-500 mt-0.5', iconClass)} />
          <span className={cn('text-gray-700', textClass)}>{address}</span>
        </div>
      )}
    </div>
  );
});

// Optimized Star Rating Component
export const StarRating = memo(({ 
  rating, 
  maxRating = 5, 
  size = 'sm',
  showCount = false,
  count = 0
}: {
  rating: number;
  maxRating?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showCount?: boolean;
  count?: number;
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const stars = useMemo(() => {
    return Array.from({ length: maxRating }, (_, i) => (
      <Star
        key={i}
        className={cn(
          sizeClasses[size],
          i < rating 
            ? 'text-yellow-400 fill-yellow-400' 
            : 'text-gray-300'
        )}
      />
    ));
  }, [rating, maxRating, size]);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {stars}
      </div>
      {showCount && count > 0 && (
        <span className="text-sm text-gray-600 ml-1">({count})</span>
      )}
    </div>
  );
});

// Optimized Progress Indicator
export const ProgressIndicator = memo(({ 
  currentStep, 
  totalSteps, 
  labels = [],
  className = ''
}: {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  className?: string;
}) => {
  const steps = useMemo(() => {
    return Array.from({ length: totalSteps }, (_, i) => ({
      number: i + 1,
      completed: i < currentStep,
      current: i === currentStep - 1,
      label: labels[i] || `Step ${i + 1}`
    }));
  }, [currentStep, totalSteps, labels]);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                step.completed || step.current
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              )}>
                {step.completed ? <Check className="w-4 h-4" /> : step.number}
              </div>
              {labels.length > 0 && (
                <span className="text-xs text-gray-600 mt-1 text-center max-w-20 truncate">
                  {step.label}
                </span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-2',
                step.completed ? 'bg-blue-600' : 'bg-gray-200'
              )} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
});

// Optimized Image Gallery Component
export const OptimizedImageGallery = memo(({ 
  images, 
  className = '',
  autoPlay = false,
  interval = 3000
}: {
  images: Array<{ src: string; alt: string; caption?: string }>;
  className?: string;
  autoPlay?: boolean;
  interval?: number;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (autoPlay && images.length > 1) {
      const timer = setInterval(nextImage, interval);
      return () => clearInterval(timer);
    }
  }, [autoPlay, interval, nextImage, images.length]);

  if (images.length === 0) return null;

  return (
    <div className={cn('relative group', className)}>
      <div className="relative overflow-hidden rounded-lg bg-gray-100 aspect-video">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={images[currentIndex].src}
            alt={images[currentIndex].alt}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        </AnimatePresence>
        
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={prevImage}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={nextImage}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      
      {images[currentIndex].caption && (
        <p className="text-sm text-gray-600 mt-2 text-center">
          {images[currentIndex].caption}
        </p>
      )}
      
      {images.length > 1 && (
        <div className="flex justify-center mt-3 gap-1">
          {images.map((_, index) => (
            <button
              key={index}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
              )}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Quick Service Card Component
export const QuickServiceCard = memo(({ 
  title, 
  price, 
  description, 
  popular = false,
  onSelect,
  selected = false
}: {
  title: string;
  price: number;
  description: string;
  popular?: boolean;
  onSelect?: () => void;
  selected?: boolean;
}) => {
  return (
    <Card className={cn(
      'relative cursor-pointer transition-all duration-200 hover:shadow-md',
      selected && 'ring-2 ring-blue-500 bg-blue-50',
      popular && 'border-blue-500'
    )} onClick={onSelect}>
      {popular && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
          <Badge className="bg-blue-600 text-white">Most Popular</Badge>
        </div>
      )}
      <CardContent className="p-4">
        <div className="text-center">
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-2xl font-bold text-blue-600 mb-2">${price}</p>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        {selected && (
          <div className="absolute top-2 right-2">
            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Export all components for easy importing
export default {
  OptimizedLoadingSpinner,
  OptimizedFeatureCard,
  StatusBadge,
  ContactInfo,
  StarRating,
  ProgressIndicator,
  OptimizedImageGallery,
  QuickServiceCard
};