
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
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
