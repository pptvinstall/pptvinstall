import { useState, useEffect } from 'react';
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
import { AlertCircle, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';

// Password reset form validation schema
const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [invalidParams, setInvalidParams] = useState(false);
  
  useEffect(() => {
    // Extract email and token from the URL query parameters
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const tokenParam = params.get('token');
    
    if (!emailParam || !tokenParam) {
      setInvalidParams(true);
      toast({
        title: 'Invalid or expired link',
        description: 'The password reset link is invalid or has expired.',
        variant: 'destructive',
      });
    } else {
      setEmail(emailParam);
      setToken(tokenParam);
    }
  }, [toast]);
  
  // Setup form with validation
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { password: string }) => {
      const response = await fetch('/api/customers/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          token,
          newPassword: data.password,
        }),
      });
      
      if (!response.ok) {
        throw new Error('An error occurred while resetting password');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Password reset failed');
      }
      
      return result;
    },
    onSuccess: () => {
      setResetComplete(true);
      toast({
        title: 'Password reset successful',
        description: 'Your password has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Password reset failed',
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
    resetPasswordMutation.mutate({ password: data.password });
  }

  if (invalidParams) {
    return (
      <div className="container flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Invalid Link</CardTitle>
            <CardDescription className="text-center">
              The password reset link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                The link you clicked is invalid or has expired. Please request a new password reset link.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button 
              variant="default" 
              onClick={() => navigate('/forgot-password')}
            >
              Request New Link
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-80px)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Create a new password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resetComplete ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Password Updated</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your password has been reset successfully. You can now log in with your new password.
                </AlertDescription>
              </Alert>
              <div className="flex justify-center mt-4">
                <Button onClick={() => navigate('/customer-login')}>
                  Go to Login
                </Button>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4">
                  <div className="flex items-start">
                    <Lock className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Password requirements:</p>
                      <ul className="text-xs text-blue-600 mt-1 list-disc list-inside">
                        <li>At least 8 characters long</li>
                        <li>Include at least one uppercase letter</li>
                        <li>Include at least one lowercase letter</li>
                        <li>Include at least one number</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
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
                  {isLoading ? 'Resetting password...' : 'Reset Password'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        {!resetComplete && (
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
        )}
      </Card>
    </div>
  );
}