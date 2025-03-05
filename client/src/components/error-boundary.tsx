import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-lg w-full bg-white shadow-lg rounded-lg p-8 border border-gray-200">
            <div className="flex flex-col items-center">
              <div className="mb-6 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>

              <h2 className="text-2xl font-bold text-center mb-4">Something went wrong</h2>

              <div className="text-gray-600 mb-6 text-center">
                <p className="mb-2">We apologize for the inconvenience. You can try refreshing the page or returning to the homepage.</p>
                {this.state.error && (
                  <div className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto text-left">
                    <p className="font-medium">Error:</p>
                    <pre className="mt-1 text-red-600">{this.state.error.toString()}</pre>
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <button 
                  onClick={this.handleRefresh}
                  className="px-5 py-2 border border-brand-blue-500 text-brand-blue-700 hover:bg-brand-blue-50 rounded-lg transition-colors"
                >
                  Refresh Page
                </button>
                <button 
                  onClick={this.handleGoHome}
                  className="px-5 py-2 bg-brand-blue-600 text-white hover:bg-brand-blue-700 rounded-lg transition-colors"
                >
                  Go to Homepage
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    
    // You can add error reporting service here
    // Example: errorReportingService.report(error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    window.location.href = "/";
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-red-50 p-4 flex items-center justify-center">
              <AlertTriangle className="h-16 w-16 text-red-500" />
            </div>
            
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
              <p className="text-gray-600 mb-6">
                We apologize for the inconvenience. The application has encountered an unexpected error.
              </p>
              
              {/* Error details (only in development) */}
              {process.env.NODE_ENV !== 'production' && this.state.error && (
                <div className="bg-gray-100 p-4 rounded mb-6 text-sm overflow-auto max-h-40">
                  <p className="font-bold text-red-600">{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre className="mt-2 text-gray-700 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
                
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                >
                  Return to Homepage
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
