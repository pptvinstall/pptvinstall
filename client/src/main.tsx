import React, { lazy, Suspense, useEffect } from 'react';
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Router, Switch, useLocation } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import Nav from '@/components/nav';
import Footer from '@/components/footer';
import { PromotionBannerGroup } from '@/components/ui/promotion-banner';
import { PWAInstallBanner } from '@/components/ui/pwa-install-banner';
import { EnvironmentIndicator } from '@/components/ui/environment-indicator';
import { toast } from '@/hooks/use-toast';
import ErrorBoundary from './components/error-boundary';

import './lib/process-polyfill';
import './index.css';

// Service Worker Registration (temporarily disabled)
// Uncomment when ready for PWA deployment
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', async () => {
//     try {
//       const registration = await navigator.serviceWorker.register('/service-worker.js');
//       console.log('Service Worker registered with scope:', registration.scope);
//       
//       // Handle Service Worker updates
//       registration.onupdatefound = () => {
//         const installingWorker = registration.installing;
//         if (installingWorker == null) {
//           return;
//         }
//         
//         installingWorker.onstatechange = () => {
//           if (installingWorker.state === 'installed') {
//             if (navigator.serviceWorker.controller) {
//               console.log('New content is available; please refresh.');
//               toast({
//                 title: "Update Available",
//                 description: "A new version of the app is available. Refresh to update.",
//                 variant: "default",
//                 action: (
//                   <button 
//                     className="rounded bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
//                     onClick={() => window.location.reload()}
//                   >
//                     Refresh
//                   </button>
//                 )
//               });
//             } else {
//               console.log('Content is cached for offline use.');
//               toast({
//                 title: "Ready for offline use",
//                 description: "The app is now available offline.",
//                 variant: "default",
//               });
//             }
//           }
//         };
//       };
//     } catch (error) {
//       console.error('Error during service worker registration:', error);
//     }
//   });
// }

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Lazy load components
const Home = lazy(() => import('@/pages/home'));
const Services = lazy(() => import('@/pages/services'));
const Booking = lazy(() => import('@/pages/booking'));
const BookingConfirmation = lazy(() => import('@/pages/booking-confirmation'));
const Contact = lazy(() => import('@/pages/contact'));
const FAQ = lazy(() => import('@/pages/faq'));
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Admin = lazy(() => import('@/pages/admin'));
const NotFound = lazy(() => import('@/pages/not-found'));
const PricingEditor = lazy(() => import('@/pages/admin/pricing-editor')); // Added import
const CustomerLogin = lazy(() => import('@/pages/customer-login'));
const CustomerPortal = lazy(() => import('@/pages/customer-portal'));
const CustomerProfile = lazy(() => import('@/pages/customer-profile'));
const EmailPreviews = lazy(() => import('@/pages/email-previews')); // Added email previews page
const SendTestEmails = lazy(() => import('@/pages/send-test-emails')); // Added test emails page
const ForgotPassword = lazy(() => import('@/pages/forgot-password')); // Added forgot password page
const ResetPassword = lazy(() => import('@/pages/reset-password')); // Added reset password page
const AdminBookings = lazy(() => import('@/pages/admin-bookings')); // Added admin bookings page



// ScrollToTop component to handle scroll restoration
const ScrollToTop = () => {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location]);

  return null;
};

// Animated page wrapper
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="page-transition relative" style={{ position: 'relative' }}>
    {children}
  </div>
);




createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary> {/* Added Error Boundary */}
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen flex flex-col relative"> {/* Added relative positioning */}
          <EnvironmentIndicator />
          <PromotionBannerGroup />
          <Nav />
          <PWAInstallBanner />
          <main className="flex-grow pt-16">
            <Suspense fallback={<div className="flex justify-center items-center h-screen"><LoadingSpinner size="lg" /></div>}>
              <Router>
                <ScrollToTop />
                <Switch>
                  <Route path="/" component={Home} />
                  <Route path="/services">
                    {() => <PageWrapper><Services /></PageWrapper>}
                  </Route>
                  <Route path="/booking">
                    {() => <PageWrapper><Booking /></PageWrapper>}
                  </Route>
                  <Route path="/booking-confirmation">
                    {() => <PageWrapper><BookingConfirmation /></PageWrapper>}
                  </Route>
                  <Route path="/contact">
                    {() => <PageWrapper><Contact /></PageWrapper>}
                  </Route>
                  <Route path="/faq">
                    {() => <PageWrapper><FAQ /></PageWrapper>}
                  </Route>
                  <Route path="/dashboard">
                    {() => <PageWrapper><Dashboard /></PageWrapper>}
                  </Route>
                  <Route path="/admin">
                    {() => <PageWrapper><Admin /></PageWrapper>}
                  </Route>
                  <Route path="/admin/pricing">
                    {() => <PageWrapper><PricingEditor /></PageWrapper>}
                  </Route> {/* Added pricing editor route */}
                  <Route path="/customer-login">
                    {() => <PageWrapper><CustomerLogin /></PageWrapper>}
                  </Route>
                  <Route path="/customer-portal">
                    {() => <PageWrapper><CustomerPortal /></PageWrapper>}
                  </Route>
                  <Route path="/customer-profile">
                    {() => <PageWrapper><CustomerProfile /></PageWrapper>}
                  </Route>
                  <Route path="/admin/email-previews">
                    {() => <PageWrapper><EmailPreviews /></PageWrapper>}
                  </Route>
                  <Route path="/admin/send-test-emails">
                    {() => <PageWrapper><SendTestEmails /></PageWrapper>}
                  </Route>
                  <Route path="/forgot-password">
                    {() => <PageWrapper><ForgotPassword /></PageWrapper>}
                  </Route>
                  <Route path="/reset-password">
                    {() => <PageWrapper><ResetPassword /></PageWrapper>}
                  </Route>
                  <Route path="/admin/bookings">
                    {() => <PageWrapper><AdminBookings /></PageWrapper>}
                  </Route>

                  <Route component={NotFound} />
                </Switch>
              </Router>
            </Suspense>
          </main>
          <Footer />
        </div>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary> {/* Added Error Boundary */}
  </React.StrictMode>
);