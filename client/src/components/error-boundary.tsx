
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
        <div className="error-boundary p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <details className="text-sm">
            <summary>Error details (click to expand)</summary>
            <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-[400px]">
              {this.state.error?.toString() || 'Unknown error'}
            </pre>
          </details>
          <button 
            className="mt-3 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded text-sm"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
