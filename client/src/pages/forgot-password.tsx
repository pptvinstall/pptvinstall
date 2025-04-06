import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

// Reset password request form validation schema
const emailSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
});

type ResetPasswordFormValues = z.infer<typeof emailSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  
  // Setup form with validation
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  });

  // Reset password request mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormValues) => {
      const response = await fetch('/api/customers/reset-password-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('An error occurred while requesting password reset');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Request failed');
      }
      
      return result;
    },
    onSuccess: () => {
      setResetRequested(true);
      toast({
        title: 'Request sent',
        description: 'If your email exists in our system, you will receive a password reset link shortly.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Request failed',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  // Form submission handler
  function onSubmit(data: ResetPasswordFormValues) {
    setIsLoading(true);
    // Ensure email is lowercase for consistency
    const normalizedData = {
      ...data,
      email: data.email.toLowerCase().trim()
    };
    resetPasswordMutation.mutate(normalizedData);
  }

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-80px)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resetRequested ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Check your email</AlertTitle>
                <AlertDescription className="text-green-700">
                  We've sent a password reset link to your email address.
                  Please check your inbox and follow the instructions to reset your password.
                </AlertDescription>
              </Alert>
              <p className="text-sm text-gray-500 text-center">
                If you don't receive an email within a few minutes, please check your spam folder.
              </p>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending request...' : 'Send Reset Link'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => navigate('/customer-login')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}