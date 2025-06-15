import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationState {
  isValid: boolean;
  isValidating: boolean;
  message?: string;
}

interface FieldValidationProps {
  value: string;
  rules: Array<{
    test: (value: string) => boolean | Promise<boolean>;
    message: string;
  }>;
  onValidationChange?: (isValid: boolean) => void;
  className?: string;
}

export function FieldValidation({ 
  value, 
  rules, 
  onValidationChange,
  className 
}: FieldValidationProps) {
  const [validation, setValidation] = useState<ValidationState>({
    isValid: false,
    isValidating: false
  });

  useEffect(() => {
    if (!value.trim()) {
      setValidation({ isValid: false, isValidating: false });
      onValidationChange?.(false);
      return;
    }

    setValidation(prev => ({ ...prev, isValidating: true }));

    const validateField = async () => {
      for (const rule of rules) {
        try {
          const result = await rule.test(value);
          if (!result) {
            setValidation({
              isValid: false,
              isValidating: false,
              message: rule.message
            });
            onValidationChange?.(false);
            return;
          }
        } catch (error) {
          setValidation({
            isValid: false,
            isValidating: false,
            message: 'Validation error occurred'
          });
          onValidationChange?.(false);
          return;
        }
      }

      setValidation({
        isValid: true,
        isValidating: false,
        message: undefined
      });
      onValidationChange?.(true);
    };

    const timeoutId = setTimeout(validateField, 300); // Debounce validation
    return () => clearTimeout(timeoutId);
  }, [value, rules, onValidationChange]);

  if (!value.trim()) return null;

  return (
    <div className={cn("flex items-center gap-2 mt-1", className)}>
      {validation.isValidating ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : validation.isValid ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <AlertCircle className="h-4 w-4 text-red-500" />
      )}
      
      {validation.message && (
        <span className={cn(
          "text-xs",
          validation.isValid ? "text-green-600" : "text-red-600"
        )}>
          {validation.message}
        </span>
      )}
      
      {validation.isValid && !validation.message && (
        <span className="text-xs text-green-600">Valid</span>
      )}
    </div>
  );
}

// Common validation rules
export const validationRules = {
  email: {
    test: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: "Please enter a valid email address"
  },
  phone: {
    test: (value: string) => /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(value.replace(/\D/g, '')),
    message: "Please enter a valid phone number"
  },
  required: {
    test: (value: string) => value.trim().length > 0,
    message: "This field is required"
  },
  minLength: (min: number) => ({
    test: (value: string) => value.trim().length >= min,
    message: `Must be at least ${min} characters`
  }),
  zipCode: {
    test: (value: string) => /^\d{5}(-\d{4})?$/.test(value),
    message: "Please enter a valid ZIP code"
  }
};