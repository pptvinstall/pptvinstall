import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";

import { lazy, Suspense } from "react";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import LoadingSpinner from "@/components/loading-spinner";

// Lazy load pages for better performance
const HomePage = lazy(() => import("@/pages/home"));
const ServicesPage = lazy(() => import("@/pages/services"));
const ContactPage = lazy(() => import("@/pages/contact"));
const BookingPage = lazy(() => import("@/pages/booking"));
const FaqPage = lazy(() => import("@/pages/faq"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));
const BookingConfirmationPage = lazy(() => import("@/pages/booking-confirmation"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const AdminPage = lazy(() => import("@/pages/admin"));
const AccountPage = lazy(() => import("@/pages/account"));
const BookingDetailsPage = lazy(() => import("@/pages/booking-details"));
const TestimonialsPage = lazy(() => import("@/pages/testimonials"));
const SubmitReviewPage = lazy(() => import("@/pages/submit-review"));
const ServiceAreaPage = lazy(() => import("@/pages/service-area"));
const GalleryPage = lazy(() => import("@/pages/gallery"));
import ErrorBoundary from "@/components/error-boundary";

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <Switch>
            <Route path="/" component={() => <PageWrapper><HomePage /></PageWrapper>} />
            <Route path="/services" component={() => <PageWrapper><ServicesPage /></PageWrapper>} />
            <Route path="/booking" component={() => <PageWrapper><BookingPage /></PageWrapper>} />
            <Route path="/booking-confirmation" component={() => <PageWrapper><BookingConfirmationPage /></PageWrapper>} />
            <Route path="/contact" component={() => <PageWrapper><ContactPage /></PageWrapper>} />
            <Route path="/faq" component={() => <PageWrapper><FaqPage /></PageWrapper>} />
            <Route path="/dashboard" component={() => <PageWrapper><DashboardPage /></PageWrapper>} />
            <Route path="/admin" component={() => <PageWrapper><AdminPage /></PageWrapper>} />
            <Route path="/account" component={() => <PageWrapper><AccountPage /></PageWrapper>} />
            <Route path="/booking-details/:id" component={() => <PageWrapper><BookingDetailsPage /></PageWrapper>} />
            <Route path="/booking/modify/:id" component={() => <PageWrapper><BookingPage /></PageWrapper>} />
            <Route path="/testimonials" component={() => <PageWrapper><TestimonialsPage /></PageWrapper>} />
            <Route path="/submit-review" component={() => <PageWrapper><SubmitReviewPage /></PageWrapper>} />
            <Route path="/service-area" component={() => <PageWrapper><ServiceAreaPage /></PageWrapper>} />
            <Route path="/gallery" component={() => <PageWrapper><GalleryPage /></PageWrapper>} />
            <Route component={() => <PageWrapper><NotFoundPage /></PageWrapper>} />
          </Switch>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

function Router() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-16">
        <Suspense fallback={<LoadingSpinner />}>
          <Switch>
            <Route path="/" component={() => <PageWrapper><HomePage /></PageWrapper>} />
            <Route path="/services" component={() => <PageWrapper><ServicesPage /></PageWrapper>} />
            <Route path="/contact" component={() => <PageWrapper><ContactPage /></PageWrapper>} />
            <Route path="/booking" component={() => <PageWrapper><BookingPage /></PageWrapper>} />
            <Route path="/booking/confirmation/:id" component={BookingConfirmationPage} />
            <Route path="/booking/details/:id" component={BookingDetailsPage} />
            <Route path="/faq" component={() => <PageWrapper><FaqPage /></PageWrapper>} />
            <Route path="/dashboard" component={() => <PageWrapper><DashboardPage /></PageWrapper>} />
            <Route path="/admin" component={() => <PageWrapper><AdminPage /></PageWrapper>} />
            <Route path="/account" component={() => <PageWrapper><AccountPage /></PageWrapper>} />
            <Route path="/testimonials" component={() => <PageWrapper><TestimonialsPage /></PageWrapper>} />
            <Route path="/submit-review" component={() => <PageWrapper><SubmitReviewPage /></PageWrapper>} />
            <Route path="/service-area" component={() => <PageWrapper><ServiceAreaPage /></PageWrapper>} />
            <Route path="/gallery" component={() => <PageWrapper><GalleryPage /></PageWrapper>} />
            <Route component={() => <PageWrapper><NotFoundPage /></PageWrapper>} />
          </Switch>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

import ScrollToTop from "@/components/scroll-to-top";

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
        <ScrollToTop />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;