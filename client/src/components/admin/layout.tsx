import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Calendar, 
  ClockIcon, 
  Home, 
  Settings, 
  LogOut, 
  BarChart3, 
  HelpCircle, 
  FileText,
  Users,
  BookOpen,
  ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdminLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

export function AdminLayout({ children, onLogout }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();

  const navItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      tab: 'dashboard',
      icon: Home
    },
    {
      name: 'Bookings',
      href: '/admin?tab=bookings',
      tab: 'bookings',
      icon: Calendar
    },
    {
      name: 'Availability',
      href: '/admin?tab=time-blocking',
      tab: 'time-blocking',
      icon: ClockIcon
    },
    {
      name: 'Business Hours',
      href: '/admin?tab=business-hours',
      tab: 'business-hours',
      icon: BarChart3
    },
    {
      name: 'Gallery',
      href: '/admin?tab=gallery',
      tab: 'gallery',
      icon: ImageIcon
    },
    {
      name: 'Site Content',
      href: '/admin?tab=content',
      tab: 'content',
      icon: FileText
    },
    {
      name: 'Customer Data',
      href: '/admin?tab=customers',
      tab: 'customers',
      icon: Users
    },
    {
      name: 'Settings',
      href: '/admin?tab=settings',
      tab: 'settings',
      icon: Settings
    },
    {
      name: 'Help Guide',
      href: '/admin?tab=help',
      tab: 'help',
      icon: HelpCircle
    }
  ];

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col fixed top-0 bottom-0 left-0 z-40">
        <div className="flex flex-col h-full w-full bg-card border-r shadow-sm">
          <div className="px-4 py-6 border-b">
            <h1 className="text-xl font-bold flex items-center">
              <BookOpen className="mr-2 h-6 w-6" />
              Admin Panel
            </h1>
          </div>
          <ScrollArea className="flex-1 px-2 py-4">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.includes(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation(item.href);
                    }}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                      location === item.href
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>
          <div className="px-2 py-4 border-t mt-auto">
            <button
              onClick={onLogout}
              className="flex w-full items-center px-3 py-2 text-sm font-medium rounded-md text-destructive hover:bg-destructive/10"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="flex md:hidden w-full flex-col fixed bottom-0 left-0 right-0 z-10 bg-background border-t">
        <div className="grid grid-cols-5 gap-1 p-1">
          {navItems.slice(0, 5).map((item) => {
            // Check if the URL includes the tab parameter that matches the current item
            const currentTab = new URLSearchParams(window.location.search).get('tab');
            // Active if the URL has no tab and we're on dashboard, or if the URL tab matches this item
            const isActive = (!currentTab && item.tab === 'dashboard') || currentTab === item.tab;
            
            console.log(`Nav item: ${item.name}, Tab: ${item.tab}, isActive: ${isActive}`);
            
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  console.log(`Clicked on ${item.name}, tab: ${item.tab}`);
                  
                  // Force a hard navigation
                  try {
                    if (item.tab === 'dashboard') {
                      // We need to reset the URL to the root admin page
                      window.location.replace('/admin');
                    } else {
                      // Navigate to the specific tab
                      window.location.replace(`/admin?tab=${item.tab}`);
                    }
                  } catch (e) {
                    console.error('Navigation error:', e);
                  }
                }}
                className={cn(
                  "flex flex-col items-center justify-center px-2 py-2 text-xs rounded-md border-0 bg-transparent cursor-pointer",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5 mb-1" />
                <span className="truncate">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden pb-16 md:pb-0 md:ml-64">
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}