import React, { useState, useEffect, useRef } from 'react';
import { X, Tag, ArrowRight, Timer, Gift } from 'lucide-react';
import { Link } from 'wouter';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface Promotion {
  id: string;
  title: string;
  description?: string;
  linkText?: string;
  linkUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  startDate?: string;
  endDate?: string;
  priority?: number;
  isActive?: boolean;
}

interface PromotionBannerProps {
  promotion: Promotion;
  className?: string;
  onClose?: () => void;
}

export function PromotionBanner({
  promotion,
  className,
  onClose
}: PromotionBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Check if user has dismissed this specific promotion
  useEffect(() => {
    const dismissedPromotions = JSON.parse(localStorage.getItem('dismissedPromotions') || '[]');
    if (dismissedPromotions.includes(promotion.id)) {
      setIsVisible(false);
    }
  }, [promotion.id]);

  const handleClose = () => {
    setIsVisible(false);
    
    // Store the dismissed promotion ID in localStorage
    const dismissedPromotions = JSON.parse(localStorage.getItem('dismissedPromotions') || '[]');
    dismissedPromotions.push(promotion.id);
    localStorage.setItem('dismissedPromotions', JSON.stringify(dismissedPromotions));
    
    if (onClose) onClose();
  };

  // Define background color based on promotion or default to blue
  const bgColor = promotion.backgroundColor || 'bg-blue-600';
  const txtColor = promotion.textColor || 'text-white';

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          bgColor,
          txtColor,
          'relative w-full py-3 px-4 sm:px-6 transition-all duration-300',
          'hover:saturate-110 hover:brightness-105',
          className
        )}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center space-x-2 mb-2 sm:mb-0">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, 0, -5, 0] 
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 5
              }}
            >
              {promotion.id.includes('spring') ? (
                <Gift className="h-4 w-4" />
              ) : promotion.id.includes('summer') ? (
                <Timer className="h-4 w-4" />
              ) : promotion.id.includes('holiday') ? (
                <Gift className="h-4 w-4" />
              ) : (
                <Tag className="h-4 w-4" />
              )}
            </motion.div>
            <span className="font-semibold">{promotion.title}</span>
            {promotion.description && (
              <span className="hidden sm:inline ml-2 text-white/90">{promotion.description}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {promotion.linkUrl && (
              <Link href={promotion.linkUrl}>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className={cn(
                    "border border-white/30 bg-white/20 hover:bg-white/30 transition-colors",
                    "text-white hover:text-white font-medium shadow-sm"
                  )}
                >
                  {promotion.linkText || 'Learn More'} 
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            )}
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors focus:outline-none"
              aria-label="Close promotion"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function PromotionBannerGroup() {
  // This would typically come from an API or CMS
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch promotions data or use default
  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        // First try to get promotions from API
        const response = await fetch('/api/promotions');
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && Array.isArray(data.promotions)) {
            const filteredPromotions = data.promotions.filter((promo: Promotion) => promo.isActive);
            
            if (filteredPromotions.length > 0) {
              setActivePromotions(filteredPromotions);
            } else {
              // No active promotions from API, fallback to default
              setActivePromotions(defaultPromotions.filter(promo => promo.isActive));
            }
          } else {
            // Invalid response format, fallback to default
            console.warn('Invalid promotions data format from API', data);
            setActivePromotions(defaultPromotions.filter(promo => promo.isActive));
          }
        } else {
          // Error response, fallback to default
          console.warn('Error response from promotions API:', response.status);
          setActivePromotions(defaultPromotions.filter(promo => promo.isActive));
        }
      } catch (error) {
        // Network or parsing error, fallback to default
        console.error('Error fetching promotions:', error);
        setActivePromotions(defaultPromotions.filter(promo => promo.isActive));
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  const handleClosePromotion = (id: string) => {
    setActivePromotions(prevPromotions => 
      prevPromotions.filter(promo => promo.id !== id)
    );
  };

  if (loading || activePromotions.length === 0) return null;

  // Sort by priority and show the highest priority promotion
  const sortedPromotions = [...activePromotions].sort((a, b) => 
    (b.priority || 0) - (a.priority || 0)
  );
  
  // Only show highest priority promotion
  const topPromotion = sortedPromotions[0];

  return (
    <PromotionBanner
      promotion={topPromotion}
      onClose={() => handleClosePromotion(topPromotion.id)}
    />
  );
}

// Default promotions in case API is not available - currently all disabled
const defaultPromotions: Promotion[] = [
  {
    id: 'spring2025',
    title: 'Spring Special: 15% Off Any Installation',
    description: 'Valid through April 30, 2025',
    linkText: 'Book Now',
    linkUrl: '/booking',
    backgroundColor: 'bg-green-600',
    textColor: 'text-white',
    startDate: '2025-03-01',
    endDate: '2025-04-30',
    priority: 10,
    isActive: false // Disabled as requested
  },
  {
    id: 'newcustomer',
    title: 'New Customer? Get $25 off your first service',
    linkText: 'Claim Offer',
    linkUrl: '/booking',
    backgroundColor: 'bg-blue-600',
    textColor: 'text-white',
    priority: 5,
    isActive: false // Disabled as requested
  },
  {
    id: 'summer2025',
    title: 'Summer Special: Free TV Calibration with Installation',
    description: 'Valid June 1 - August 31, 2025',
    linkText: 'Book Now',
    linkUrl: '/booking',
    backgroundColor: 'bg-orange-500',
    textColor: 'text-white',
    startDate: '2025-06-01',
    endDate: '2025-08-31',
    priority: 8,
    isActive: false // Not active yet
  },
  {
    id: 'holiday2025',
    title: 'Holiday Special: $50 Off Home Theater Installation',
    description: 'Valid November 15 - December 31, 2025',
    linkText: 'Learn More',
    linkUrl: '/services/home-theater',
    backgroundColor: 'bg-red-600',
    textColor: 'text-white',
    startDate: '2025-11-15',
    endDate: '2025-12-31',
    priority: 9,
    isActive: false // Not active yet
  }
];