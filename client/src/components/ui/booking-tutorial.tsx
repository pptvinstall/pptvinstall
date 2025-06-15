import React, { useState } from 'react';
import { X, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BookingTutorialProps {
  onClose: () => void;
  onEnable: () => void;
}

interface TutorialSlide {
  title: string;
  description: string;
  image: string;
}

// Create SVG illustrations for the tutorial slides
const tutorialSlides: TutorialSlide[] = [
  {
    title: "Welcome to Easy Booking",
    description: "Our booking system is designed for simplicity. This quick guide will help you navigate the process.",
    image: `<svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" rx="8" fill="#EBF5FF"/>
      <rect x="40" y="40" width="220" height="120" rx="6" fill="white" stroke="#4B91F7" stroke-width="2"/>
      <rect x="60" y="60" width="80" height="10" rx="5" fill="#4B91F7"/>
      <rect x="60" y="80" width="180" height="6" rx="3" fill="#D1E5FE"/>
      <rect x="60" y="96" width="140" height="6" rx="3" fill="#D1E5FE"/>
      <rect x="60" y="112" width="160" height="6" rx="3" fill="#D1E5FE"/>
      <rect x="60" y="128" width="100" height="20" rx="4" fill="#4B91F7"/>
      <text x="110" y="142" font-family="Arial" font-size="10" fill="white">Get Started</text>
      <circle cx="240" cy="60" r="20" fill="#E6F1FE" stroke="#4B91F7" stroke-width="2"/>
      <path d="M232 60L238 66L248 54" stroke="#4B91F7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  },
  {
    title: "Choose Your Services",
    description: "Select the type and number of TVs to be mounted or smart home devices to be installed.",
    image: `<svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" rx="8" fill="#EBF5FF"/>
      <rect x="40" y="30" width="220" height="140" rx="6" fill="white" stroke="#4B91F7" stroke-width="2"/>
      <rect x="60" y="50" width="180" height="15" rx="3" fill="#4B91F7" opacity="0.2"/>
      <rect x="62" y="52" width="11" height="11" rx="2" fill="#4B91F7"/>
      <text x="80" y="62" font-family="Arial" font-size="10" fill="#2563EB">TV Installation (32"-55")</text>
      <rect x="60" y="75" width="180" height="15" rx="3" fill="#4B91F7" opacity="0.1"/>
      <rect x="62" y="77" width="11" height="11" rx="2" fill="#D1E5FE" stroke="#4B91F7"/>
      <text x="80" y="87" font-family="Arial" font-size="10" fill="#4B5563">TV Installation (56" or larger)</text>
      <rect x="60" y="100" width="180" height="15" rx="3" fill="#4B91F7" opacity="0.1"/>
      <rect x="62" y="102" width="11" height="11" rx="2" fill="#D1E5FE" stroke="#4B91F7"/>
      <text x="80" y="112" font-family="Arial" font-size="10" fill="#4B5563">Smart Doorbell Installation</text>
      <rect x="60" y="125" width="180" height="15" rx="3" fill="#4B91F7" opacity="0.1"/>
      <rect x="62" y="127" width="11" height="11" rx="2" fill="#D1E5FE" stroke="#4B91F7"/>
      <text x="80" y="137" font-family="Arial" font-size="10" fill="#4B5563">Smart Camera Installation</text>
    </svg>`
  },
  {
    title: "Select Date & Time",
    description: "Pick a convenient date from the calendar and choose an available time slot.",
    image: `<svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" rx="8" fill="#EBF5FF"/>
      <rect x="40" y="30" width="140" height="140" rx="6" fill="white" stroke="#4B91F7" stroke-width="2"/>
      <rect x="50" y="40" width="120" height="20" rx="2" fill="#4B91F7" opacity="0.2"/>
      <text x="80" y="55" font-family="Arial" font-size="10" fill="#2563EB">April 2025</text>
      <line x1="50" y1="70" x2="170" y2="70" stroke="#D1E5FE" stroke-width="1"/>
      <text x="55" y="85" font-family="Arial" font-size="9" fill="#4B5563">Su</text>
      <text x="75" y="85" font-family="Arial" font-size="9" fill="#4B5563">Mo</text>
      <text x="95" y="85" font-family="Arial" font-size="9" fill="#4B5563">Tu</text>
      <text x="115" y="85" font-family="Arial" font-size="9" fill="#4B5563">We</text>
      <text x="135" y="85" font-family="Arial" font-size="9" fill="#4B5563">Th</text>
      <text x="155" y="85" font-family="Arial" font-size="9" fill="#4B5563">Fr</text>
      <text x="55" y="105" font-family="Arial" font-size="9" fill="#4B5563">1</text>
      <text x="75" y="105" font-family="Arial" font-size="9" fill="#4B5563">2</text>
      <text x="95" y="105" font-family="Arial" font-size="9" fill="#4B5563">3</text>
      <circle cx="115" cy="102" r="10" fill="#4B91F7" opacity="0.7"/>
      <text x="115" y="105" font-family="Arial" font-size="9" fill="white">4</text>
      <text x="135" y="105" font-family="Arial" font-size="9" fill="#4B5563">5</text>
      <rect x="190" y="30" width="70" height="140" rx="6" fill="white" stroke="#4B91F7" stroke-width="2"/>
      <text x="205" y="50" font-family="Arial" font-size="10" font-weight="bold" fill="#2563EB">Time Slots</text>
      <rect x="195" y="60" width="60" height="20" rx="4" fill="#4B91F7" opacity="0.2"/>
      <text x="210" y="75" font-family="Arial" font-size="10" fill="#2563EB">9:00 AM</text>
      <rect x="195" y="85" width="60" height="20" rx="4" fill="#4B91F7"/>
      <text x="210" y="100" font-family="Arial" font-size="10" fill="white">10:00 AM</text>
      <rect x="195" y="110" width="60" height="20" rx="4" fill="#4B91F7" opacity="0.2"/>
      <text x="210" y="125" font-family="Arial" font-size="10" fill="#2563EB">11:00 AM</text>
    </svg>`
  },
  {
    title: "Enter Your Details",
    description: "Provide your contact information so we can confirm your booking and reach out if needed.",
    image: `<svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" rx="8" fill="#EBF5FF"/>
      <rect x="40" y="30" width="220" height="140" rx="6" fill="white" stroke="#4B91F7" stroke-width="2"/>
      <text x="60" y="50" font-family="Arial" font-size="10" font-weight="bold" fill="#2563EB">Your Information</text>
      <rect x="60" y="60" width="180" height="24" rx="4" fill="#F9FAFB" stroke="#D1E5FE"/>
      <text x="70" y="76" font-family="Arial" font-size="9" fill="#9CA3AF">John Smith</text>
      <text x="60" y="100" font-family="Arial" font-size="9" fill="#4B5563">Email</text>
      <rect x="60" y="110" width="180" height="24" rx="4" fill="#F9FAFB" stroke="#D1E5FE"/>
      <text x="70" y="126" font-family="Arial" font-size="9" fill="#9CA3AF">john.smith@example.com</text>
      <rect x="60" y="140" width="180" height="20" rx="4" fill="#4B91F7"/>
      <text x="125" y="155" font-family="Arial" font-size="10" fill="white">Continue</text>
    </svg>`
  },
  {
    title: "Confirm Your Booking",
    description: "Review all details and confirm your booking. You'll receive a confirmation email immediately.",
    image: `<svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" rx="8" fill="#EBF5FF"/>
      <rect x="40" y="30" width="220" height="140" rx="6" fill="white" stroke="#4B91F7" stroke-width="2"/>
      <circle cx="150" cy="70" r="25" fill="#34D399" opacity="0.2"/>
      <path d="M140 70L147 77L160 64" stroke="#34D399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="115" y="110" font-family="Arial" font-size="12" font-weight="bold" fill="#2563EB">Booking Confirmed!</text>
      <text x="65" y="130" font-family="Arial" font-size="10" fill="#4B5563">Your appointment is scheduled for:</text>
      <text x="100" y="150" font-family="Arial" font-size="10" font-weight="bold" fill="#2563EB">April 4, 2025 at 10:00 AM</text>
    </svg>`
  },
  {
    title: "Need Help?",
    description: "You can always access guidance by clicking the Help button at any step during the booking process.",
    image: `<svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" rx="8" fill="#EBF5FF"/>
      <rect x="40" y="40" width="220" height="120" rx="6" fill="white" stroke="#4B91F7" stroke-width="2"/>
      <circle cx="150" cy="80" r="25" fill="#4B91F7" opacity="0.2"/>
      <text x="146" y="84" font-family="Arial" font-size="18" font-weight="bold" fill="#2563EB">?</text>
      <rect x="90" y="120" width="120" height="24" rx="4" fill="#4B91F7"/>
      <path d="M110 132H115" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <circle cx="125" cy="132" r="5" fill="white"/>
      <text x="135" y="135" font-family="Arial" font-size="10" fill="white">Help Button</text>
      <path d="M60 30L80 20L75 35" stroke="#4B91F7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="85" y="27" font-family="Arial" font-size="9" fill="#2563EB">Click this anytime for help</text>
    </svg>`
  }
];

export function BookingTutorial({ onClose, onEnable }: BookingTutorialProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = tutorialSlides.length;
  
  const previousSlide = () => {
    setCurrentSlide(prev => (prev > 0 ? prev - 1 : prev));
  };
  
  const nextSlide = () => {
    setCurrentSlide(prev => (prev < totalSlides - 1 ? prev + 1 : prev));
  };
  
  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === totalSlides - 1;
  
  return (
    <div className="tutorial-overlay">
      <div className="tutorial-content">
        <div className="tutorial-header">
          <h2 className="text-xl font-bold text-primary">Booking Guide</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-5 w-5" />
            <span className="sr-only">Close tutorial</span>
          </Button>
        </div>
        
        <div className="tutorial-slide">
          <div 
            className="tutorial-image" 
            dangerouslySetInnerHTML={{ __html: tutorialSlides[currentSlide].image }} 
          />
          <h3 className="text-lg font-semibold mb-2">{tutorialSlides[currentSlide].title}</h3>
          <p className="text-center text-muted-foreground">{tutorialSlides[currentSlide].description}</p>
        </div>
        
        <div className="flex justify-center gap-1 mt-4">
          {tutorialSlides.map((_, index) => (
            <div 
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === currentSlide 
                  ? 'bg-primary w-6' 
                  : 'bg-primary/30 w-2'
              }`}
            />
          ))}
        </div>
        
        <div className="tutorial-footer">
          <Button 
            variant="outline"
            onClick={previousSlide}
            disabled={isFirstSlide}
            className="flex items-center"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          
          {isLastSlide ? (
            <Button onClick={() => {
              onEnable();  // Enable guidance mode
              onClose();   // Close the tutorial
            }} className="flex items-center">
              <Check className="mr-1 h-4 w-4" />
              Get Started
            </Button>
          ) : (
            <Button onClick={nextSlide} className="flex items-center">
              Next
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}