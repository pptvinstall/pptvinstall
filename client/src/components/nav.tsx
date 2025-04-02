import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { 
  PhoneCall, 
  Menu, 
  X, 
  Home, 
  Calendar, 
  MessagesSquare, 
  HelpCircle,
  MonitorSmartphone,
  ChevronDown,
  LucideIcon,
  User
} from "lucide-react";
import { ResponsiveImage } from '@/components/ui/responsive-image';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
// No longer using Sheet components
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface NavLink {
  href: string;
  name: string;
  icon: LucideIcon;
  badge?: string;
  children?: Array<{
    href: string;
    name: string;
  }>;
}

// Main navigation component
export default function Nav() {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
      setShowMobileMenu(window.scrollY > 300); // Show mobile menu button after scrolling down
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigation links with icons
  const navigationLinks: NavLink[] = [
    { href: '/', name: 'Home', icon: Home },
    { 
      href: '/services', 
      name: 'Services', 
      icon: MonitorSmartphone,
      children: [
        { href: '/services#tv-mounting', name: 'TV Mounting' },
        { href: '/services#smart-home', name: 'Smart Home' },
        { href: '/services#commercial', name: 'Commercial' },
      ]
    },
    { href: '/booking', name: 'Book Now', icon: Calendar, badge: 'Best Value' },
    { href: '/contact', name: 'Contact', icon: MessagesSquare },
    { href: '/faq', name: 'FAQ', icon: HelpCircle },
    { href: '/customer-login', name: 'Customer Portal', icon: User }
  ];

  // Check if a link is active
  const isActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <>
      <nav className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        isScrolled ? "bg-background/95 backdrop-blur shadow-sm" : "bg-background"
      )}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Logo size="md" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigationLinks.map((link) => (
              <div key={link.href}>
                {!link.children ? (
                  <Link href={link.href}>
                    <Button 
                      variant={isActive(link.href) ? "default" : "ghost"} 
                      size="sm"
                      className="relative"
                    >
                      <link.icon className="h-4 w-4 mr-1" />
                      {link.name}
                      {link.badge && (
                        <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          {link.badge}
                        </span>
                      )}
                    </Button>
                  </Link>
                ) : (
                  <div className="relative group">
                    <Button 
                      variant={isActive(link.href) ? "default" : "ghost"} 
                      size="sm"
                      className="group"
                    >
                      <link.icon className="h-4 w-4 mr-1" />
                      {link.name}
                      <ChevronDown className="h-4 w-4 ml-1 transition-transform group-hover:rotate-180" />
                    </Button>
                    
                    {/* Dropdown */}
                    <div className="absolute left-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-1">
                        {link.children.map((child) => (
                          <a
                            key={child.href}
                            href={child.href}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            {child.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <Button 
              variant="default" 
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 mr-2"
              onClick={() => window.location.href = "tel:+16782632859"}
            >
              <PhoneCall className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Call</span>
              <span className="sm:hidden">Call</span>
            </Button>
            
            {/* Mobile menu button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {/* Mobile menu dropdown */}
            {isOpen && (
              <div className="fixed inset-0 z-50 lg:hidden bg-black/50" onClick={() => setIsOpen(false)}>
                <div className="fixed inset-y-0 right-0 w-[85vw] sm:w-[350px] z-50 bg-background shadow-xl p-0 overflow-hidden" 
                     onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b flex items-center justify-between">
                      <div className="flex items-center">
                        <Logo size="sm" withText={false} />
                        <span className="ml-2 text-lg font-bold">Picture Perfect</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto py-4 px-2">
                      {navigationLinks.map((link) => (
                        <div key={link.href}>
                          {!link.children ? (
                            <Link href={link.href} onClick={() => setIsOpen(false)}>
                              <Button 
                                variant={isActive(link.href) ? "default" : "ghost"} 
                                size="sm"
                                className="w-full justify-start mb-1 relative"
                              >
                                <link.icon className="h-4 w-4 mr-2" />
                                {link.name}
                                {link.badge && (
                                  <span className="absolute top-0 right-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                    {link.badge}
                                  </span>
                                )}
                              </Button>
                            </Link>
                          ) : (
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value={link.name} className="border-none">
                                <AccordionTrigger className={cn(
                                  "p-2 rounded-md hover:bg-accent hover:no-underline flex items-center",
                                  isActive(link.href) && "bg-accent/50"
                                )}>
                                  <div className="flex items-center">
                                    <link.icon className="h-4 w-4 mr-2" />
                                    {link.name}
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="flex flex-col space-y-1 pl-6 pt-1">
                                    {link.children.map((child) => (
                                      <a
                                        key={child.href}
                                        href={child.href}
                                        className="p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                                        onClick={() => setIsOpen(false)}
                                      >
                                        {child.name}
                                      </a>
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-auto p-4 border-t">
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          window.location.href = "tel:+16782632859";
                          setIsOpen(false);
                        }}
                      >
                        <PhoneCall className="mr-2 h-4 w-4" />
                        Call (678) 263-2859
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      {/* Floating mobile menu button */}
      {showMobileMenu && (
        <div className="fixed bottom-6 right-6 z-50 lg:hidden">
          <Button
            variant="default"
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
            onClick={() => setIsOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      )}
    </>
  );
}