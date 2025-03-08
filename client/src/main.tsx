import React, { lazy, Suspense, useEffect } from 'react';
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Router, Switch, useLocation } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import Nav from '@/components/nav';
import Footer from '@/components/footer';

import './lib/process-polyfill';
import './index.css';

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
  <div className="page-transition">
    {children}
  </div>
);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-grow">
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
                <Route path="/admin/login">
                  {() => <PageWrapper><Admin /></PageWrapper>}
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
  </React.StrictMode>
);