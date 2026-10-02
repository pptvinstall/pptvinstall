
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logComponentError } from '@/lib/errorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    logComponentError(error, errorInfo, 'ErrorBoundary');
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-24">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-6 text-center shadow-sm md:p-8">
            <h2 className="text-2xl font-extrabold text-slate-900">Something went wrong, but we can still help.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              The page hit a temporary issue. Call, text, or jump back into booking and we&apos;ll get your install scheduled.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a href="tel:4047024748" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500">
                Call 404-702-4748
              </a>
              <a href="sms:4047024748" className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100">
                Text 404-702-4748
              </a>
              <a href="/booking" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50">
                Go to Booking
              </a>
              <a href="/quote" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50">
                Get a Quote
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
