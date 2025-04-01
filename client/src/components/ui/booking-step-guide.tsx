import React from 'react';
import { Info, Lightbulb } from 'lucide-react';

interface BookingStepGuideProps {
  currentStep: number;
}

export function BookingStepGuide({ currentStep }: BookingStepGuideProps) {
  const guide = getStepGuide(currentStep);
  
  return (
    <div className="step-guide">
      <h4 className="step-guide-title">
        <Info className="inline-block h-4 w-4 mr-1" />
        {guide.title}
      </h4>
      <div className="step-guide-content">
        <p>{guide.content}</p>
        
        {guide.tip && (
          <div className="step-guide-tip">
            <div className="flex items-start">
              <Lightbulb className="h-4 w-4 mt-0.5 mr-2 text-primary" />
              <span>{guide.tip}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getStepGuide(step: number) {
  switch(step) {
    case 0:
      return {
        title: "Service Selection Guide",
        content: "Select the services you need by adding TVs and smart home devices to your cart. You can add multiple items.",
        tip: "Remember that we provide all mounting hardware, but you can select 'customer-provided' if you have your own mount. For brick or stone walls, be sure to select that option for accurate pricing."
      };
    case 1:
      return {
        title: "Appointment Selection Guide",
        content: "Click on a date on the calendar to see available time slots. Gray time slots are unavailable.",
        tip: "We leave buffer time between appointments, so not all times will be available. Weekend times fill up quickly, so consider a weekday if possible."
      };
    case 2:
      return {
        title: "Contact Information Guide",
        content: "Provide your contact details so we can confirm your appointment and reach you on installation day.",
        tip: "If your address has special access instructions or gate codes, please include them in the notes section."
      };
    case 3:
      return {
        title: "Review Your Booking",
        content: "Check all your information before confirming. You'll receive a confirmation email with all details.",
        tip: "If something looks incorrect, you can use the Back button to make changes to any section."
      };
    default:
      return {
        title: "Booking Guide",
        content: "Follow each step to complete your booking. If you need help, click the Help button at any time.",
        tip: "You can adjust text size and contrast using the Accessibility options if needed."
      };
  }
}

// Hook for first-time user detection
export function useFirstTimeUser() {
  const [isFirstTime, setIsFirstTime] = React.useState<boolean>(() => {
    // Check if this is the first visit based on localStorage
    const hasVisitedBefore = localStorage.getItem('hasVisitedBookingPage');
    return hasVisitedBefore !== 'true';
  });
  
  // Mark user as returning
  const markAsReturningUser = () => {
    localStorage.setItem('hasVisitedBookingPage', 'true');
    setIsFirstTime(false);
  };
  
  return { isFirstTime, markAsReturningUser };
}