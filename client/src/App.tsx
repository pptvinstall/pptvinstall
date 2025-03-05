import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { queryClient } from "@/lib/queryClient";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { LoadingSpinner } from "@/components/loading-spinner";
import ScrollToTop from "@/components/scroll-to-top";
import ErrorBoundary from "@/components/error-boundary";
import { BookingFormSkeleton } from "@/components/booking-skeleton";

// Import the HomePage directly as it's the most accessed route
import HomePage from "@/pages/home";

// Lazy load other pages for better initial load performance
const ServicesPage = lazy(() => import("@/pages/services"));
const ContactPage = lazy(() => import("@/pages/contact"));
const BookingPage = lazy(() => import("@/pages/booking"));
const FaqPage = lazy(() => import("@/pages/faq"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));
const GalleryPage = lazy(() => import("@/pages/gallery"));

// Route loading component with proper skeleton
function RouteLoadingState() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  );
}

function AppRouter() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-16">
        <ErrorBoundary>
          <Suspense fallback={<RouteLoadingState />}>
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/services">
                {() => (
                  <Suspense fallback={<RouteLoadingState />}>
                    <ServicesPage />
                  </Suspense>
                )}
              </Route>
              <Route path="/contact">
                {() => (
                  <Suspense fallback={<RouteLoadingState />}>
                    <ContactPage />
                  </Suspense>
                )}
              </Route>
              <Route path="/booking">
                {() => (
                  <Suspense fallback={<BookingFormSkeleton />}>
                    <BookingPage />
                  </Suspense>
                )}
              </Route>
              <Route path="/faq">
                {() => (
                  <Suspense fallback={<RouteLoadingState />}>
                    <FaqPage />
                  </Suspense>
                )}
              </Route>
              <Route path="/gallery">
                {() => (
                  <Suspense fallback={<RouteLoadingState />}>
                    <GalleryPage />
                  </Suspense>
                )}
              </Route>
              <Route path="/:rest*" component={NotFoundPage} />
            </Switch>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <ScrollToTop />
      <Toaster />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;