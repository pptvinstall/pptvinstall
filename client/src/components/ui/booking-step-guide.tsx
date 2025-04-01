import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  LightbulbIcon, 
  CalendarIcon, 
  FileTextIcon, 
  ClipboardCheckIcon,
  AccessibilityIcon
} from "lucide-react";

export function ServiceSelectionGuide() {
  return (
    <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
      <LightbulbIcon className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-700">Service Selection Tips</AlertTitle>
      <AlertDescription className="text-blue-600">
        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
          <li>For TV mounting, first select the size of your TV.</li>
          <li>If installing above a fireplace, choose "Above Fireplace" option.</li>
          <li>Not sure about mount type? Your technician can help you decide during installation.</li>
          <li>For smart home devices, specify if you have existing wiring for accurate pricing.</li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export function DateTimeGuide() {
  return (
    <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
      <CalendarIcon className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-700">Appointment Selection Tips</AlertTitle>
      <AlertDescription className="text-blue-600">
        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
          <li>Dates in <strong>gray</strong> are unavailable. Available dates are in white.</li>
          <li>Installation times are shown in 60-minute slots.</li>
          <li>Our installations typically take 2-3 hours to complete.</li>
          <li>For faster scheduling, use the "Find Next Available Slot" button.</li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export function ContactInfoGuide() {
  return (
    <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
      <FileTextIcon className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-700">Contact Information Tips</AlertTitle>
      <AlertDescription className="text-blue-600">
        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
          <li>Please provide an accurate phone number for appointment confirmations.</li>
          <li>Double-check your address details for correct installation location.</li>
          <li>If your building has special access instructions, include them in the notes.</li>
          <li>All fields marked with <span className="text-red-500">*</span> are required.</li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export function ReviewGuide() {
  return (
    <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
      <ClipboardCheckIcon className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-700">Review Your Booking</AlertTitle>
      <AlertDescription className="text-blue-600">
        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
          <li>Check that all selected services match what you need.</li>
          <li>Verify your appointment date and time are correct.</li>
          <li>Confirm your contact information is accurate.</li>
          <li>After submission, you'll receive a confirmation email with your booking details.</li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export function AccessibilityNote({ className }: { className?: string }) {
  return (
    <Alert className={`bg-amber-50 text-amber-800 border-amber-200 ${className}`}>
      <AccessibilityIcon className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-700">Need Additional Help?</AlertTitle>
      <AlertDescription className="text-amber-600">
        <p className="mt-2 text-sm">
          If you have difficulty completing this booking form, please call us at (404) 555-1234 
          for assistance. Our customer service team is available Monday-Friday from 9am to 5pm.
        </p>
      </AlertDescription>
    </Alert>
  );
}