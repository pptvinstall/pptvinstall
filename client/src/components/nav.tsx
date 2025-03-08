import React from 'react';
import { Link } from 'wouter';
import { Button } from "@/components/ui/button";
import { PhoneCall } from "lucide-react";

// Main navigation component
export default function Nav() {
  const navigationLinks = [
    { href: '/', name: 'Home' },
    { href: '/services', name: 'Services' },
    { href: '/booking', name: 'Book Now' },
    { href: '/contact', name: 'Contact' },
    { href: '/faq', name: 'FAQ' }
  ];

  return (
    <nav className="bg-background border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Picture Perfect TV Install
        </Link>
        <div className="hidden md:flex items-center space-x-4">
          {navigationLinks.map((link) => (
            <Link key={link.href} href={link.href} className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground">
              {link.name}
            </Link>
          ))}
        </div>
        <div className="md:hidden">
          {/* Mobile menu button would go here */}
        </div>
        <Button onClick={() => window.location.href = "tel:+16782632859"}>
          <PhoneCall className="mr-2 h-4 w-4" />
          Call Now
        </Button>
      </div>
    </nav>
  );
}