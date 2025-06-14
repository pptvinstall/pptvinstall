import React from 'react';
import { createRoot } from "react-dom/client";
import { Route, Router, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from '@/pages/index';
import BookingConfirmation from '@/pages/BookingConfirmation';
import ErrorBoundary from '@/components/error-boundary';
import { queryClient } from '@/lib/queryClient';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/confirmation" component={BookingConfirmation} />
            <Route>404 - Page Not Found</Route>
          </Switch>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);