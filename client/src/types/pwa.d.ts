/**
 * Custom type definition for BeforeInstallPromptEvent
 * This event is fired when a PWA can be installed
 */
interface BeforeInstallPromptEvent extends Event {
  /**
   * List of compatible platforms
   */
  readonly platforms: string[];
  
  /**
   * Returns a Promise that resolves with an object containing
   * outcome (accepted/dismissed) and platform
   */
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  
  /**
   * Shows the install prompt
   */
  prompt(): Promise<void>;
}