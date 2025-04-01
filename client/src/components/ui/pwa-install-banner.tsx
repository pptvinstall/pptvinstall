import React, { useState, useEffect } from 'react';
import { X, Download, Phone, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface PWAInstallBannerProps {
  className?: string;
}

export function PWAInstallBanner({ className }: PWAInstallBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installType, setInstallType] = useState<'android' | 'ios' | null>(null);

  // Check if the banner should be shown (mobile only)
  useEffect(() => {
    // Only show on mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Check if it's been dismissed before
    const hasDismissed = localStorage.getItem('pwa-install-banner-dismissed') === 'true';
    
    // Check if already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Determine device type
    if (isMobile && !hasDismissed && !isStandalone) {
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        setInstallType('ios');
      } else if (/Android/i.test(navigator.userAgent)) {
        setInstallType('android');
      }
      
      // Set a timeout to show the banner after a delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-banner-dismissed', 'true');
  };

  if (!isVisible || dismissed || !installType) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed bottom-0 left-0 right-0 z-50 p-4 ${className}`}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-white rounded-lg shadow-lg border-2 border-blue-200 p-4 relative">
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-2 text-blue-500 hover:text-blue-700"
            aria-label="Dismiss banner"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
              {installType === 'android' ? (
                <Smartphone className="h-6 w-6 text-blue-600" />
              ) : (
                <Phone className="h-6 w-6 text-blue-600" />
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-blue-700">
                Add to Home Screen
              </h3>
              
              {installType === 'android' ? (
                <p className="text-sm text-blue-600 mt-1">
                  Install our app for easier booking and offline access. Tap the menu icon
                  <span className="inline-block px-1">⋮</span>
                  then "Add to Home Screen"
                </p>
              ) : (
                <p className="text-sm text-blue-600 mt-1">
                  Install our app for easier booking and offline access. Tap the share icon
                  <span className="inline-block px-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                      <polyline points="16 6 12 2 8 6"></polyline>
                      <line x1="12" y1="2" x2="12" y2="15"></line>
                    </svg>
                  </span>
                  then "Add to Home Screen"
                </p>
              )}
              
              <Button
                variant="default"
                size="sm"
                className="mt-2 bg-blue-600 hover:bg-blue-700"
                onClick={handleDismiss}
              >
                <Download className="mr-1 h-4 w-4" />
                Install Now
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}