
/**
 * Central API error handling utility
 */

import { toast } from "@/components/ui/use-toast";

interface ErrorResponse {
  error?: string;
  message?: string;
  details?: string;
}

export const handleApiError = (error: unknown, fallbackMessage: string = "An error occurred") => {
  console.error("API Error:", error);
  let errorMessage = fallbackMessage;

  if (error instanceof Error) {
    errorMessage = error.message;
  }

  if (error instanceof Response || (error as any)?.json) {
    try {
      (error as Response).json().then((data: ErrorResponse) => {
        const message = data.error || data.message || data.details || fallbackMessage;
        showErrorToast(message);
      });
      return;
    } catch (e) {
      // If JSON parsing fails, use status text or fallback
      if (error instanceof Response) {
        errorMessage = error.statusText || fallbackMessage;
      }
    }
  } else if (typeof error === 'object' && error !== null) {
    // Try to extract error message from error object
    const errorObj = error as ErrorResponse;
    errorMessage = errorObj.error || errorObj.message || errorObj.details || fallbackMessage;
  }

  showErrorToast(errorMessage);
};

export const showErrorToast = (message: string) => {
  toast({
    title: "Error",
    description: message,
    variant: "destructive",
    duration: 5000,
  });
};

export const showSuccessToast = (message: string) => {
  toast({
    title: "Success",
    description: message,
    duration: 3000,
  });
};
