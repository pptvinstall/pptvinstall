import React from 'react';
import { createRoot } from "react-dom/client";
import { Router } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import ErrorBoundary from '@/components/error-boundary';
import { queryClient } from '@/lib/queryClient';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <App />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);