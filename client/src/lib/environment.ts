// Environment detection and configuration
export type Environment = 'development' | 'staging' | 'production';

export function getEnvironment(): Environment {
  // Check for explicit staging environment
  if (import.meta.env.VITE_ENVIRONMENT === 'staging' ||
      window.location.hostname.includes('staging') ||
      window.location.search.includes('preview=true')) {
    return 'staging';
  }
  
  // Check for development
  if (import.meta.env.DEV || 
      window.location.hostname.includes('localhost') ||
      window.location.hostname.includes('127.0.0.1')) {
    return 'development';
  }
  
  return 'production';
}

export function isEnvironment(env: Environment): boolean {
  return getEnvironment() === env;
}

export function getApiBaseUrl(): string {
  const env = getEnvironment();
  
  switch (env) {
    case 'staging':
      return import.meta.env.VITE_STAGING_API_URL || window.location.origin;
    case 'development':
      return 'http://localhost:5000';
    case 'production':
    default:
      return window.location.origin;
  }
}

export function shouldShowDebugInfo(): boolean {
  return getEnvironment() !== 'production' || 
         window.location.search.includes('debug=true');
}

// Feature flags based on environment
export const featureFlags = {
  enableAnalytics: getEnvironment() === 'production',
  enableErrorReporting: getEnvironment() !== 'development',
  enableDebugLogs: shouldShowDebugInfo(),
  enableServiceWorker: getEnvironment() === 'production',
} as const;