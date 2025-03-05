import React, { Component, ReactNode } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="flex mb-4 gap-2">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                We apologize for the inconvenience. Please try refreshing the page.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
