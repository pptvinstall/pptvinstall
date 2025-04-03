import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookingAutofillProps {
  onAutofill: (customerData: any) => void;
  className?: string;
}

export function BookingAutofill({ onAutofill, className }: BookingAutofillProps) {
  const [customerToken, setCustomerToken] = useState<{ id: string, email: string, name: string } | null>(null);
  const [isAutofilled, setIsAutofilled] = useState(false);

  // Get customer token from localStorage
  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    if (token) {
      try {
        const parsedToken = JSON.parse(token);
        setCustomerToken(parsedToken);
      } catch (error) {
        console.error('Error parsing customer token:', error);
      }
    }
  }, []);

  // Fetch customer profile data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/customers/profile', customerToken?.id],
    queryFn: async () => {
      if (!customerToken?.id) return null;
      const response = await fetch(`/api/customers/profile/${customerToken.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      return response.json();
    },
    enabled: !!customerToken?.id,
  });

  const handleAutofill = () => {
    if (data?.customer) {
      onAutofill(data.customer);
      setIsAutofilled(true);

      // Reset the autofill state after 5 seconds for visual feedback
      setTimeout(() => {
        setIsAutofilled(false);
      }, 5000);
    }
  };

  if (!customerToken?.id) {
    return null;
  }

  // If there's an error or profile is empty, don't show the button
  if (error || !data?.customer || !data?.success) {
    return null;
  }

  const hasProfileData = data.customer.streetAddress && 
                        data.customer.city && 
                        data.customer.state && 
                        data.customer.zipCode;

  if (!hasProfileData) {
    return null;
  }

  return (
    <div className={cn("flex items-center mt-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAutofill}
        disabled={isLoading || isAutofilled}
        className={cn(
          "text-xs gap-1.5", 
          isAutofilled && "bg-green-50 text-green-600 border-green-200"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading...
          </>
        ) : isAutofilled ? (
          <>
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            Profile data applied
          </>
        ) : (
          <>
            <User className="h-3 w-3" />
            Autofill with saved profile
          </>
        )}
      </Button>
    </div>
  );
}