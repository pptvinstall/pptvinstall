// Lightweight error logging solution with console fallback and optional Sentry integration

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  type?: string;
  dsn?: string;
  errorInfo?: string;
  metadata?: Record<string, any>;
}

export interface LoggedError {
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
}

class ErrorLogger {
  private errors: LoggedError[] = [];
  private maxStoredErrors = 100;
  
  // Check if Sentry is available (can be added later)
  private get hasSentry(): boolean {
    return typeof window !== 'undefined' && (window as any).Sentry;
  }

  log(error: Error | string, context: ErrorContext = {}, level: 'error' | 'warning' | 'info' = 'error') {
    const loggedError: LoggedError = {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString(),
      level
    };

    // Store locally (with rotation)
    this.errors.push(loggedError);
    if (this.errors.length > this.maxStoredErrors) {
      this.errors = this.errors.slice(-this.maxStoredErrors);
    }

    // Console logging with context (only in development/staging)
    if (typeof window !== 'undefined') {
      const { featureFlags } = await import('@/lib/environment');
      if (featureFlags.enableDebugLogs) {
        const consoleMethod = level === 'error' ? console.error : 
                             level === 'warning' ? console.warn : console.info;
        
        consoleMethod(`[${level.toUpperCase()}] ${loggedError.message}`, {
          context: loggedError.context,
          stack: loggedError.stack,
          timestamp: loggedError.timestamp
        });
      }
    }

    // Send to Sentry if available
    if (this.hasSentry && level === 'error') {
      const Sentry = (window as any).Sentry;
      Sentry.withScope((scope: any) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
        if (error instanceof Error) {
          Sentry.captureException(error);
        } else {
          Sentry.captureMessage(error, 'error');
        }
      });
    }
  }

  error(error: Error | string, context: ErrorContext = {}) {
    this.log(error, context, 'error');
  }

  warning(message: string, context: ErrorContext = {}) {
    this.log(message, context, 'warning');
  }

  info(message: string, context: ErrorContext = {}) {
    this.log(message, context, 'info');
  }

  // Get recent errors for debugging
  getRecentErrors(count = 10): LoggedError[] {
    return this.errors.slice(-count);
  }

  // Clear stored errors
  clear() {
    this.errors = [];
  }

  // Initialize Sentry (can be called when Sentry script loads)
  initSentry(dsn: string) {
    if (typeof window !== 'undefined') {
      // This would load Sentry dynamically if needed
      this.info('Sentry initialization placeholder', { dsn });
    }
  }
}

export const errorLogger = new ErrorLogger();

// Helper function for API call error handling
export function handleApiError(error: unknown, context: ErrorContext): never {
  const errorMessage = error instanceof Error ? error.message : 'Unknown API error';
  errorLogger.error(errorMessage, { ...context, type: 'api_error' });
  throw error;
}

// Helper function for component error boundaries
export function logComponentError(error: Error, errorInfo: any, componentName: string) {
  errorLogger.error(error, {
    component: componentName,
    errorInfo: JSON.stringify(errorInfo),
    type: 'component_error'
  });
}