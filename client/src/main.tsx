import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

import { useEffect } from "react";
import { useLocation } from "wouter";
import { trackPageView } from "@/lib/analytics";

// Layout & Components (not lazy — needed on every page)
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import MobileFAB from "@/components/ui/MobileFAB";
import { EnvironmentIndicator } from "@/components/ui/environment-indicator";
import { PromotionBanner } from "@/components/ui/promotion-banner";
import SeasonalBanner from "@/components/ui/SeasonalBanner";
import ErrorBoundary from "@/components/error-boundary";

// Pages — lazy loaded so each route is a separate chunk
const Home = lazy(() => import("@/pages/home"));
const Services = lazy(() => import("@/pages/services"));
const Contact = lazy(() => import("@/pages/contact"));
const FAQ = lazy(() => import("@/pages/faq"));
const Gallery = lazy(() => import("@/pages/gallery"));
const Booking = lazy(() => import("@/pages/booking"));
const QuotePage = lazy(() => import("@/pages/quote"));
const Confirmation = lazy(() => import("@/pages/Confirmation"));
const PaymentStatusPage = lazy(() => import("@/pages/PaymentStatus"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const AdminBookings = lazy(() => import("@/pages/admin-bookings"));
const JobBuilder = lazy(() => import("@/pages/jobos/JobBuilder"));
const JobsPage = lazy(() => import("@/pages/jobos/JobsPage"));
const PricingConfigPage = lazy(() => import("@/pages/jobos/PricingConfigPage"));
const CustomerQuotePage = lazy(() => import("@/pages/CustomerQuote"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));

// City SEO pages — lazy loaded, share a single CityPage component
const CityPageComponent = lazy(() =>
  import("@/pages/city/CityPage").then((m) => ({ default: m.default })),
);
import { cityPages, getCityBySlug } from "@/data/city-pages";

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}

function PageViewTracker() {
  const [location] = useLocation();
  useEffect(() => {
    trackPageView(location);
  }, [location]);
  return null;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PageViewTracker />
      <Switch>
        {/* Public Pages */}
        <Route path="/" component={Home} />
        <Route path="/services" component={Services} />
        <Route path="/gallery" component={Gallery} />
        <Route path="/contact" component={Contact} />
        <Route path="/faq" component={FAQ} />

        {/* Booking / Quote / Payment Flow */}
        <Route path="/booking" component={Booking} />
        <Route path="/quote" component={QuotePage} />
        <Route path="/confirmation" component={Confirmation} />
        <Route path="/payment/success" component={PaymentStatusPage} />
        <Route path="/payment/cancelled" component={PaymentStatusPage} />

        {/* Owner Dashboard */}
        <Route path="/dashboard" component={Dashboard} />

        {/* Admin — password-protected, not linked in nav */}
        <Route path="/admin" component={AdminBookings} />

        {/* Job OS owner tools (admin-token gated; not linked in nav) */}
        <Route path="/admin/job-builder" component={JobBuilder} />
        <Route path="/admin/jobs" component={JobsPage} />
        <Route path="/admin/pricing-config" component={PricingConfigPage} />

        {/* Customer quote link (token addressed, customer-safe data only) */}
        <Route path="/q/:token" component={CustomerQuotePage} />

        {/* City SEO landing pages */}
        <Route path="/areas/:slug">
          {(params) => {
            const city = getCityBySlug(params.slug ?? "");
            if (!city) return <NotFoundPage />;
            return <CityPageComponent city={city} />;
          }}
        </Route>

        {/* Fallback */}
        <Route>
          {() => <NotFoundPage />}
        </Route>
      </Switch>
    </Suspense>
  );
}

// Owner tools get a clean full-screen shell: no marketing nav, footer or call button
// (the floating call button would sit on top of the sticky price bar).
function isOwnerToolPath(path: string) {
  return path.startsWith("/admin/job-builder") || path.startsWith("/admin/jobs") || path.startsWith("/admin/pricing-config");
}

function Shell() {
  const [location] = useLocation();
  const owner = isOwnerToolPath(location);
  return (
    <>
      {owner ? null : (
        <>
          <SeasonalBanner />
          <EnvironmentIndicator />
          <PromotionBanner />
          <Nav />
        </>
      )}
      <main>
        <Router />
      </main>
      {owner ? null : (
        <>
          <Footer />
          <MobileFAB />
        </>
      )}
      <Toaster />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Shell />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
