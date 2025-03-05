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
import Admin from "@/pages/admin";
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-grow">
          <AnimatePresence mode="wait">
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/services" component={Services} />
              <Route path="/booking">
                {() => <PageWrapper><Booking /></PageWrapper>}
              </Route>
              <Route path="/confirmation">
                {() => <PageWrapper><BookingConfirmation /></PageWrapper>}
              </Route>
              <Route path="/contact" component={Contact} />
              <Route path="/faq" component={FAQ} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/admin" component={Admin} />
              <Route component={NotFound} />
            </Switch>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

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
            <Route path="/admin" component={() => <PageWrapper><Admin /></PageWrapper>} />
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