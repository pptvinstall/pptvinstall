import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import LoadingSpinner from "@/components/loading-spinner";
import ScrollToTop from "@/components/scroll-to-top";
import ErrorBoundary from "@/components/error-boundary";
import PerformanceMonitor from "@/components/performance-monitor"; // Added for performance monitoring

// Import the HomePage directly to ensure it loads immediately
import HomePage from "@/pages/home";

// Lazy load other pages with prefetching hints
const ServicesPage = lazy(() => import("@/pages/services"));
const ContactPage = lazy(() => import("@/pages/contact"));
const BookingPage = lazy(() => import("@/pages/booking"));
const FaqPage = lazy(() => import("@/pages/faq"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));
const GalleryPage = lazy(() => import("@/pages/gallery"));

// Prefetch critical assets
const prefetchAssets = () => {
  const imagesToPrefetch = [
    '/images/hero-bg.jpg',
    '/images/logo.png',
  ];

  // Use low priority prefetch for images
  if ('connection' in navigator && (navigator.connection as any).saveData) {
    return; // Don't prefetch if user is in data-saving mode
  }

  // Prefetch critical images
  imagesToPrefetch.forEach(src => {
    const img = new Image();
    img.src = src;
  });
};

prefetchAssets(); // Call prefetchAssets


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
            <Route path="/gallery" component={GalleryPage} /> {/* Added GalleryPage route */}
            <Route path="/:rest*" component={NotFoundPage} />
          </Switch>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PerformanceMonitor /> {/* Added Performance Monitor */}
        <AppRouter />
        <Toaster />
        <ScrollToTop />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;