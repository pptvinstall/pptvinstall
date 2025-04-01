import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { XCircle, ArrowRight, Check } from "lucide-react";

// Custom hook to check if this is the user's first time visiting
export function useFirstTimeUser() {
  const [isFirstTime, setIsFirstTime] = useState(true);

  useEffect(() => {
    const hasVisitedBefore = localStorage.getItem('hasVisitedBookingPage');
    setIsFirstTime(hasVisitedBefore !== 'true');
  }, []);

  const markAsReturningUser = () => {
    localStorage.setItem('hasVisitedBookingPage', 'true');
    setIsFirstTime(false);
  };

  return { isFirstTime, markAsReturningUser };
}

// Tutorial steps data
const tutorialSteps = [
  {
    title: "Welcome to Our Booking System",
    description: "Let's walk through how to book your service in a few simple steps.",
    image: "/images/tutorial/welcome.svg",
  },
  {
    title: "Step 1: Select Your Services",
    description: "Choose from TV mounting, smart home installations, or both. You can add multiple items.",
    image: "/images/tutorial/service.svg",
  },
  {
    title: "Step 2: Pick Your Appointment Time",
    description: "Select a date from the calendar, then choose an available time slot.",
    image: "/images/tutorial/calendar.svg",
  },
  {
    title: "Step 3: Provide Contact Details",
    description: "Fill in your contact information and installation address where our technicians will meet you.",
    image: "/images/tutorial/contact.svg",
  },
  {
    title: "Step 4: Review and Confirm",
    description: "Check that all your information is correct before submitting your booking.",
    image: "/images/tutorial/confirm.svg",
  },
  {
    title: "Need Help at Any Time?",
    description: "Click the Help button if you need assistance during the booking process.",
    image: "/images/tutorial/help.svg",
  }
];

type BookingTutorialProps = {
  onClose: () => void;
  onEnable: () => void;
};

export function BookingTutorial({ onClose, onEnable }: BookingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [open, setOpen] = useState(true);
  
  const handleClose = () => {
    setOpen(false);
    onClose();
  };
  
  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleEnableAssistance = () => {
    onEnable();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md md:max-w-xl">
        <DialogHeader>
          <DialogTitle>{tutorialSteps[currentStep].title}</DialogTitle>
          <DialogDescription>
            Step {currentStep + 1} of {tutorialSteps.length}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-4">
          <img 
            src={tutorialSteps[currentStep].image} 
            alt={tutorialSteps[currentStep].title}
            className="w-full max-w-md h-auto mb-4 rounded-md border"
          />
          <p className="text-center text-muted-foreground">
            {tutorialSteps[currentStep].description}
          </p>
        </div>
        
        <DialogFooter className="flex sm:justify-between">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <Button onClick={handleNext}>
              {currentStep < tutorialSteps.length - 1 ? (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Got it
                  <Check className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          
          {currentStep === tutorialSteps.length - 1 && (
            <Button variant="secondary" onClick={handleEnableAssistance}>
              Enable Assistance
            </Button>
          )}
          
          <Button variant="ghost" size="icon" onClick={handleClose} className="absolute right-4 top-4">
            <XCircle className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}