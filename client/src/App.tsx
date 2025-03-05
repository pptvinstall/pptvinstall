import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AnimatePresence, motion } from "framer-motion";

import Nav from "@/components/nav";
import Footer from "@/components/footer";
import HomePage from "@/pages/home";
import ServicesPage from "@/pages/services";
import ContactPage from "@/pages/contact";
import BookingPage from "@/pages/booking";
import FaqPage from "@/pages/faq";
import NotFoundPage from "@/pages/not-found";
import BookingConfirmationPage from "@/pages/booking-confirmation";
import DashboardPage from "@/pages/dashboard";
import AdminPage from "@/pages/admin";
import AccountPage from "@/pages/account";
import BookingDetailsPage from "@/pages/booking-details";
import TestimonialsPage from "@/pages/testimonials";
import SubmitReviewPage from "@/pages/submit-review";
import ServiceAreaPage from "@/pages/service-area";
import GalleryPage from "@/pages/gallery";
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

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;