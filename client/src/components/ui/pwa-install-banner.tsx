import React, { useState, useEffect } from 'react';
import { X, Download, Phone, Smartphone, Info, Check, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '../../hooks/use-media-query';

interface PWAInstallBannerProps {
  className?: string;
}

export function PWAInstallBanner({ className }: PWAInstallBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installType, setInstallType] = useState<'android' | 'ios' | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Detect PWA installation event (for Chrome/Android)
  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the default browser mini-infobar
      e.preventDefault();
      // Store the event for later use
      setInstallEvent(e as unknown as BeforeInstallPromptEvent);
      // Show our custom UI
      if (!localStorage.getItem('pwa-install-banner-dismissed')) {
        setInstallType('android');
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Check if the banner should be shown (mobile only)
  useEffect(() => {
    // Check if it's been dismissed before
    const hasDismissed = localStorage.getItem('pwa-install-banner-dismissed') === 'true';
    
    // Check if already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    
    // If we've already captured an install event, we don't need this check
    if (installEvent) return;
    
    // Determine device type for non-Chrome browsers
    if (isMobile && !hasDismissed && !isStandalone) {
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        setInstallType('ios');
        
        // Set a timeout to show the banner after a delay on iOS
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 5000);
        
        return () => clearTimeout(timer);
      } else if (!installEvent) {
        // For Android devices without install event (e.g., Firefox)
        setInstallType('android');
        
        // Set a timeout to show the banner after a delay on Android
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isMobile, installEvent]);

  // Get the installation steps based on device type
  const getInstallSteps = () => {
    if (installType === 'ios') {
      return [
        { text: "Tap the share icon", icon: "share" },
        { text: "Scroll down and tap Add to Home Screen", icon: "plus" },
        { text: "Tap Add in the top-right corner", icon: "confirm" }
      ];
    } else {
      return [
        { text: "Tap the menu icon (⋮)", icon: "menu" },
        { text: "Tap Install App or Add to Home Screen", icon: "plus" },
        { text: "Tap Install on the confirmation dialog", icon: "confirm" }
      ];
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-banner-dismissed', 'true');
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
    // Reset step when expanding
    if (!expanded) {
      setActiveStep(0);
    }
  };

  const nextStep = () => {
    const steps = getInstallSteps();
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      // At last step, we'll close and mark as dismissed
      handleDismiss();
    }
  };
  
  // This handles the actual installation on Chrome/Android
  const handleInstall = async () => {
    if (installEvent) {
      try {
        // Show the native installation prompt
        await installEvent.prompt();
        
        // Wait for the user action
        const choiceResult = await installEvent.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA installation');
          // If accepted, we can dismiss our banner
          handleDismiss();
        } else {
          console.log('User dismissed the PWA installation');
        }
      } catch (error) {
        console.error('Error during installation:', error);
        // If error, fall back to showing instructions
        toggleExpanded();
      }
    } else {
      // If we don't have an install event (iOS or Firefox), show instructions
      toggleExpanded();
    }
  };

  // Render the appropriate icon for steps
  const renderStepIcon = (iconType: string) => {
    switch (iconType) {
      case 'share':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
        );
      case 'menu':
        return <div className="text-xl font-bold">⋮</div>;
      case 'plus':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        );
      case 'confirm':
        return <Check size={20} />;
      default:
        return <Info size={20} />;
    }
  };

  if (!isVisible || dismissed || !installType) return null;

  const steps = getInstallSteps();

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed bottom-0 left-0 right-0 z-50 p-4 ${className}`}
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <motion.div 
          className="bg-white rounded-lg shadow-xl border-2 border-blue-200 overflow-hidden"
          initial={{ height: 'auto' }}
          animate={{ height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          {/* Header section */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-4 border-b border-blue-100 relative text-white">
            <button
              onClick={handleDismiss}
              className="absolute right-2 top-2 text-white hover:text-gray-100 bg-blue-600/50 hover:bg-blue-600/70 rounded-full p-1 shadow-sm transition-colors"
              aria-label="Dismiss banner"
            >
              <X size={18} />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 bg-white rounded-full p-2.5 shadow-md">
                <img 
                  src="/icons/pptv/pptv-icon.svg" 
                  alt="PPTVInstall" 
                  className="h-7 w-7" 
                  onError={(e) => {
                    // Fallback to device icon if image fails to load
                    e.currentTarget.style.display = 'none';
                    const fallbackIcon = document.getElementById('fallback-icon');
                    if (fallbackIcon) {
                      fallbackIcon.style.display = 'block';
                    }
                  }}
                />
                <div id="fallback-icon" style={{ display: 'none' }}>
                  {installType === 'android' ? (
                    <Smartphone className="h-6 w-6 text-blue-600" />
                  ) : (
                    <Phone className="h-6 w-6 text-blue-600" />
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-white text-lg">
                  PPTVInstall
                </h3>
                <p className="text-sm text-blue-100">
                  Install our app for faster booking
                </p>
              </div>
            </div>
          </div>
          
          {/* Content section */}
          <div className="p-4">
            {!expanded ? (
              <>
                <p className="text-blue-700 mb-3 text-sm">
                  Install our app on your {installType === 'ios' ? 'iPhone/iPad' : 'phone'} for a better experience, even when offline!
                </p>
                
                <div className="flex flex-col w-full space-y-3">
                  
                  <Button
                    variant="default"
                    size="default"
                    className="bg-blue-600 hover:bg-blue-700 w-full"
                    onClick={handleInstall}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Add PPTVInstall to Home Screen
                  </Button>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-200 text-blue-600 flex-1"
                      onClick={toggleExpanded}
                    >
                      Show Steps
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500"
                      onClick={handleDismiss}
                    >
                      Not Now
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Steps display */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-blue-800 font-medium">Step {activeStep + 1} of {steps.length}</p>
                    <div className="flex space-x-1">
                      {steps.map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`h-2 w-6 rounded-full transition-colors ${idx === activeStep ? 'bg-blue-500' : 'bg-blue-100'}`}
                        ></div>
                      ))}
                    </div>
                  </div>
                  
                  <motion.div 
                    className="bg-blue-50 rounded-lg p-4 flex items-center space-x-3"
                    key={activeStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="bg-white p-2 rounded-full shadow-sm text-blue-600">
                      {renderStepIcon(steps[activeStep].icon)}
                    </div>
                    <p className="text-blue-700 flex-1">{steps[activeStep].text}</p>
                  </motion.div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 flex-1"
                    onClick={nextStep}
                  >
                    {activeStep < steps.length - 1 ? 'Next Step' : 'Finish'}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-200 text-blue-600"
                    onClick={toggleExpanded}
                  >
                    Hide Steps
                  </Button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}