import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Check if the app is already installed
  useEffect(() => {
    // Check if running in standalone mode (PWA is installed)
    const isRunningStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    setIsStandalone(isRunningStandalone);
    
    // Hide banner if app is already installed
    if (isRunningStandalone) {
      setShowBanner(false);
    }
  }, []);

  // Listen for the beforeinstallprompt event (Android/Chrome)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      
      // Store the event for later use
      setInstallPrompt(e as BeforeInstallPromptEvent);
      
      // Show banner if on mobile and not already installed
      if (isMobile && !isStandalone) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isMobile, isStandalone]);

  // Detect iOS Safari and show custom install instructions
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    
    // Only show iOS instructions if on iOS Safari and not already in standalone mode
    if (isIOS && isSafari && !isStandalone && isMobile) {
      // Delay showing the banner to avoid interrupting initial user experience
      const timer = setTimeout(() => {
        setShowIOSInstructions(true);
        setShowBanner(true);
      }, 5000); // Show after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [isMobile, isStandalone]);

  const handleInstallClick = useCallback(async () => {
    if (!installPrompt) return;
    
    // Show the install prompt
    await installPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const choiceResult = await installPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // Clear the saved prompt as it can't be used again
    setInstallPrompt(null);
    setShowBanner(false);
  }, [installPrompt]);

  const closeBanner = useCallback(() => {
    setShowBanner(false);
    
    // Save to localStorage that user dismissed the banner
    localStorage.setItem('pwa-install-banner-dismissed', 'true');
  }, []);

  // Don't show anything if not mobile or already installed
  if (!isMobile || isStandalone || !showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 px-4 mx-auto max-w-md">
      <Toast className="relative flex flex-col w-full p-4 shadow-lg border bg-card text-card-foreground">
        <button 
          onClick={closeBanner}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200"
          aria-label="Close banner"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="mb-2 font-semibold">Install PPTV App</div>
        
        {showIOSInstructions ? (
          <>
            <p className="text-sm mb-3">
              Add Picture Perfect TV to your Home Screen for a better experience:
            </p>
            <ol className="text-sm list-decimal pl-5 mb-3">
              <li>Tap the Share icon <span className="inline-block">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                  <polyline points="16 6 12 2 8 6"></polyline>
                  <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
              </span> in your browser</li>
              <li>Scroll to and tap "Add to Home Screen"</li>
              <li>Tap "Add" to confirm</li>
            </ol>
          </>
        ) : (
          <>
            <p className="text-sm mb-3">
              Install our app for a better experience with offline access and faster loading.
            </p>
            <Button 
              onClick={handleInstallClick}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Install App
            </Button>
          </>
        )}
      </Toast>
    </div>
  );
}