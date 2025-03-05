import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { lazy, Suspense } from "react";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import LoadingSpinner from "@/components/loading-spinner";
import ScrollToTop from "@/components/scroll-to-top";
import ErrorBoundary from "@/components/error-boundary";

// Import the HomePage directly to ensure it loads immediately
import HomePage from "@/pages/home";

// Lazy load other pages
const ServicesPage = lazy(() => import("@/pages/services"));
const ContactPage = lazy(() => import("@/pages/contact"));
const BookingPage = lazy(() => import("@/pages/booking"));
const FaqPage = lazy(() => import("@/pages/faq"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));

function AppRouter() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-16">
        <Suspense fallback={<LoadingSpinner />}>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/services" component={ServicesPage} />
            <Route path="/contact" component={ContactPage} />
            <Route path="/booking" component={BookingPage} />
            <Route path="/faq" component={FaqPage} />
            <Route path="/:rest*" component={NotFoundPage} />
          </Switch>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
        <Toaster />
        <ScrollToTop />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;