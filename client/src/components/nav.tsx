import { useState, useEffect, useCallback } from 'react';
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
  User,
  Layout
} from "lucide-react";
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
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
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  
  // Memoized handlers for better performance
  const toggleMenu = useCallback(() => setIsOpen(prev => !prev), []);
  const openMenu = useCallback(() => setIsOpen(true), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);
  
  // Phone call handler
  const handlePhoneCall = useCallback(() => {
    window.location.href = "tel:404-702-4748";
    closeMenu();
  }, [closeMenu]);

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

    { href: '/booking', name: 'Book Now', icon: Calendar },
    { href: '/contact', name: 'Contact', icon: MessagesSquare },
    { href: '/faq', name: 'FAQ', icon: HelpCircle },
    { href: '/customer-login', name: 'Customer Portal', icon: User }
  ];

  // Memoize scroll handler to prevent unnecessary rerenders
  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY;
    setIsScrolled(scrollPosition > 10);
    setShowFloatingButton(scrollPosition > 300);
  }, []);
  
  // Handle scroll effects with throttling for better performance
  useEffect(() => {
    // Initial check
    handleScroll();
    
    // Throttled scroll event to improve performance
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [handleScroll]);

  // Memoized function to check if a link is active
  const isActive = useCallback((href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  }, [location]);

  return (
    <>
      {/* Main navigation bar */}
      <nav className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        isScrolled ? "bg-background/95 backdrop-blur shadow-sm" : "bg-background"
      )}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between relative">
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
              onClick={handlePhoneCall}
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
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>
      
      {/* Mobile menu dropdown */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/50" onClick={closeMenu}>
          <div className="fixed inset-y-0 right-0 w-[85vw] sm:w-[350px] z-50 bg-background shadow-xl p-0 overflow-hidden" 
               onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col h-full">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center">
                  <Logo size="sm" withText={false} />
                  <span className="ml-2 text-lg font-bold">Picture Perfect</span>
                </div>
                <Button variant="ghost" size="icon" onClick={closeMenu} aria-label="Close menu">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto py-4 px-2">
                {navigationLinks.map((link) => (
                  <div key={link.href}>
                    {!link.children ? (
                      <Link href={link.href} onClick={closeMenu}>
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
                                  onClick={closeMenu}
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
                  onClick={handlePhoneCall}
                >
                  <PhoneCall className="mr-2 h-4 w-4" />
                  Call 404-702-4748
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating menu button - appears when scrolling down on mobile */}
      {showFloatingButton && (
        <div className="fixed bottom-6 right-6 z-40 lg:hidden animate-in fade-in duration-300">
          <Button
            variant="default"
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 transition-transform hover:scale-110"
            onClick={openMenu}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      )}
    </>
  );
}