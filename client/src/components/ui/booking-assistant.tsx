import React from 'react';
import { X, HelpCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BookingAssistantProps {
  currentStep: number;
  onClose: () => void;
}

// Main assistant component that shows contextual help based on the current step
export function BookingAssistant({ currentStep, onClose }: BookingAssistantProps) {
  const assistanceContent = getAssistanceContentForStep(currentStep);
  
  return (
    <div className="booking-assistant">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          <HelpCircle className="h-5 w-5" />
          Booking Assistant
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
      
      <div className="booking-assistant-content mt-3">
        {assistanceContent.title && (
          <p className="font-medium mb-2">{assistanceContent.title}</p>
        )}
        <p>{assistanceContent.description}</p>
        
        {assistanceContent.tips && (
          <div className="mt-3 p-3 bg-muted rounded-md">
            <div className="flex items-center gap-2 mb-1.5">
              <Info className="h-4 w-4 text-primary" />
              <span className="font-medium">Helpful Tips</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {assistanceContent.tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple button to expand the full assistant
export function BookingAssistantButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="booking-assistant-button" onClick={onClick}>
      <HelpCircle className="h-5 w-5" />
      <span>Need help with this step?</span>
    </button>
  );
}

// Helper function to get step-specific content
function getAssistanceContentForStep(step: number) {
  switch (step) {
    case 0:
      return {
        title: "Selecting Your Services",
        description: "On this screen, you can choose the services you need. You can add multiple TVs and smart home devices.",
        tips: [
          "For each TV, select its size, installation location, and mount type.",
          "For over-fireplace installations, please note the additional fee.",
          "If you have your own mount, select 'Customer-Provided' to save on mount costs.",
          "For brick or stone walls, be sure to check the 'Brick/Stone Surface' option.",
          "You can add multiple TVs by filling out the options and clicking 'Add TV'."
        ]
      };
    case 1:
      return {
        title: "Choosing Your Date & Time",
        description: "Select a date from the calendar that works for you, then pick an available time slot.",
        tips: [
          "Dates with limited availability are shown in a different color.",
          "Gray time slots are already booked and unavailable.",
          "We require at least 2 hours notice for new bookings.",
          "Weekend appointments fill up quickly, so book early if possible.",
          "If you don't see a time that works, try another date."
        ]
      };
    case 2:
      return {
        title: "Your Contact Information",
        description: "Please provide your accurate contact details so we can reach you about your appointment.",
        tips: [
          "Your phone number is important for day-of coordination.",
          "Double-check your email as we'll send a confirmation there.",
          "The address should be where the service will be performed.",
          "If you have building access instructions, include them in the notes.",
          "By checking the consent box, we can send you appointment reminders."
        ]
      };
    case 3:
      return {
        title: "Review & Confirm",
        description: "Please review all your information before finalizing your booking.",
        tips: [
          "Check that all services selected are correct.",
          "Verify the appointment date and time works for you.",
          "Ensure your contact information is accurate.",
          "Note the estimated total for your services.",
          "If anything needs changing, use the back button to edit."
        ]
      };
    default:
      return {
        description: "If you need assistance with any part of the booking process, please click the Help button."
      };
  }
}