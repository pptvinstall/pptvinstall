import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, XCircle, LucideIcon, User, Calendar, ClipboardList, CheckSquare } from "lucide-react";

const ASSISTANT_CONTENT = [
  {
    title: "Choose Your Services",
    description: "In this step, select which services you need. You can add multiple TV installations and smart home devices.",
    tips: [
      "The 'TV Size' refers to the diagonal measurement of your TV screen.",
      "If you're unsure about the mount type, choose 'Customer-Provided Mount' and our technician will advise you during installation.",
      "Select 'Power Outlet Installation' if you need a new power outlet installed behind your TV.",
    ],
    icon: User
  },
  {
    title: "Select Date & Time",
    description: "Choose when you'd like us to come for the installation. White dates on the calendar are available. Gray dates are unavailable.",
    tips: [
      "You can use the 'Find Next Available Slot' button to quickly find the next open appointment.",
      "Our appointments typically last 2-3 hours, so make sure you'll be available during that time.",
      "Our technicians will call you 24 hours before your appointment to confirm.",
    ],
    icon: Calendar
  },
  {
    title: "Your Contact Information",
    description: "Please provide accurate contact details so we can reach you about your appointment.",
    tips: [
      "Make sure your phone number is correct as we'll send text notifications to it.",
      "Double-check your address details, including apartment/unit numbers if applicable.",
      "Include any special instructions like gate codes or parking information in the notes section.",
    ],
    icon: ClipboardList
  },
  {
    title: "Review Your Booking",
    description: "Take a moment to review all the details of your booking before confirming.",
    tips: [
      "Check that all services you want are listed correctly.",
      "Verify the appointment date and time match your availability.",
      "Confirm your contact information and address are accurate.",
      "You'll receive an email confirmation after submitting your booking.",
    ],
    icon: CheckSquare
  }
];

interface BookingAssistantProps {
  currentStep: number;
  onClose: () => void;
}

export function BookingAssistant({ currentStep, onClose }: BookingAssistantProps) {
  const content = ASSISTANT_CONTENT[currentStep];
  const Icon = content.icon;
  
  return (
    <Card className="mb-4 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Icon className="h-5 w-5 mr-2 text-blue-500" />
            <CardTitle className="text-blue-700 text-lg">{content.title}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <XCircle className="h-4 w-4" />
            <span className="sr-only">Close assistance</span>
          </Button>
        </div>
        <CardDescription className="text-blue-700/70 mt-1">
          {content.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-blue-700">Helpful Tips:</h4>
          <ul className="list-disc list-inside text-sm text-blue-700/90 space-y-1">
            {content.tips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

interface BookingAssistantButtonProps {
  onClick: () => void;
}

export function BookingAssistantButton({ onClick }: BookingAssistantButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="flex items-center bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
    >
      <HelpCircle className="mr-2 h-4 w-4" />
      Show Step Guidance
    </Button>
  );
}