import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AnimatePresence, motion } from "framer-motion";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import Home from "@/pages/home";
import Services from "@/pages/services";
import Booking from "@/pages/booking";
import BookingConfirmation from "@/pages/booking-confirmation";
import Contact from "@/pages/contact";
import FAQ from "@/pages/faq";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

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
            <Route path="/" component={() => <PageWrapper><Home /></PageWrapper>} />
            <Route path="/services" component={() => <PageWrapper><Services /></PageWrapper>} />
            <Route path="/booking" component={() => <PageWrapper><Booking /></PageWrapper>} />
            <Route path="/booking-confirmation" component={() => <PageWrapper><BookingConfirmation /></PageWrapper>} />
            <Route path="/contact" component={() => <PageWrapper><Contact /></PageWrapper>} />
            <Route path="/faq" component={() => <PageWrapper><FAQ /></PageWrapper>} />
            <Route path="/dashboard" component={() => <PageWrapper><Dashboard /></PageWrapper>} />
            <Route component={() => <PageWrapper><NotFound /></PageWrapper>} />
          </Switch>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;