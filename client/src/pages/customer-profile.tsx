import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  UserCircle, 
  Phone, 
  Mail, 
  Home,
  Save
} from 'lucide-react';

// Profile update schema
const profileUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string()
    .transform(val => val.replace(/\D/g, '')) // Remove all non-digits
    .refine(val => val.length >= 7 && val.length <= 15, 'Please enter a valid phone number'),
  streetAddress: z.string().min(2, 'Street address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(5, 'Zip code must be at least 5 digits'),
});

type ProfileUpdateFormValues = z.infer<typeof profileUpdateSchema>;

export default function CustomerProfilePage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [customerToken, setCustomerToken] = useState<{ id: string, email: string, name: string } | null>(null);
  const [isFormChanged, setIsFormChanged] = useState(false);

  // Get customer token from localStorage
  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    if (token) {
      try {
        const parsedToken = JSON.parse(token);
        setCustomerToken(parsedToken);
      } catch (error) {
        // Invalid token format, redirect to login
        navigate('/customer-login');
      }
    } else {
      // No token found, redirect to login
      navigate('/customer-login');
    }
  }, [navigate]);

  // Fetch customer profile
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['/api/customers/profile', customerToken?.id],
    queryFn: async () => {
      if (!customerToken?.id) {
        return { success: false, customer: null };
      }
      const response = await fetch(`/api/customers/profile/${customerToken.id}`);
      const data = await response.json();
      return data;
    },
    enabled: !!customerToken?.id,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdateFormValues) => {
      if (!customerToken?.id) {
        throw new Error('Customer ID not found');
      }
      
      const response = await fetch(`/api/customers/profile/${customerToken.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update profile');
      }
      
      return result.customer;
    },
    onSuccess: () => {
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
        variant: 'default',
      });
      setIsFormChanged(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while updating your profile.',
        variant: 'destructive',
      });
    }
  });

  // Setup form with default values from profile
  const form = useForm<ProfileUpdateFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: profileData?.customer?.name || '',
      phone: profileData?.customer?.phone || '',
      streetAddress: profileData?.customer?.streetAddress || '',
      addressLine2: profileData?.customer?.addressLine2 || '',
      city: profileData?.customer?.city || '',
      state: profileData?.customer?.state || '',
      zipCode: profileData?.customer?.zipCode || '',
    },
  });

  // Update form values when profile data is loaded
  useEffect(() => {
    if (profileData?.customer) {
      form.reset({
        name: profileData.customer.name || '',
        phone: profileData.customer.phone || '',
        streetAddress: profileData.customer.streetAddress || '',
        addressLine2: profileData.customer.addressLine2 || '',
        city: profileData.customer.city || '',
        state: profileData.customer.state || '',
        zipCode: profileData.customer.zipCode || '',
      });
    }
  }, [profileData, form]);

  // Watch for form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setIsFormChanged(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Handle form submission
  function onSubmit(data: ProfileUpdateFormValues) {
    updateProfileMutation.mutate(data);
  }

  // Go back to customer portal
  const handleBackToPortal = () => {
    navigate('/customer-portal');
  };

  if (!customerToken) {
    return null; // Will redirect to login via the useEffect
  }

  return (
    <div className="container py-10 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Button 
            variant="ghost" 
            onClick={handleBackToPortal}
            className="mb-2 pl-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portal
          </Button>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">Update your personal information</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your profile details. This information will be used to autofill your future bookings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProfile ? (
            <div className="py-8 text-center">Loading your profile...</div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <UserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                            <Input 
                              placeholder="John Smith" 
                              className="pl-10" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                            <Input 
                              placeholder="(555) 123-4567" 
                              className="pl-10" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Used for appointment confirmations and updates
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <h3 className="text-lg font-medium mb-2">Address Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name="streetAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Street Address</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                                  <Input 
                                    placeholder="123 Main St" 
                                    className="pl-10" 
                                    {...field} 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name="addressLine2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Address Line 2 <span className="text-muted-foreground">(Optional)</span>
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Apt 4B, Suite 100, etc." 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Atlanta" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="GA" 
                                  maxLength={2}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Zip Code</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="30301" 
                                  maxLength={5}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="email-field flex items-center space-x-3 border p-3 rounded-md bg-muted">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email Address</p>
                    <p className="text-sm text-muted-foreground">{profileData?.customer?.email || customerToken.email}</p>
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-xs bg-secondary px-2 py-1 rounded text-secondary-foreground">Cannot be changed</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={!isFormChanged || updateProfileMutation.isPending}
                    className="min-w-32"
                  >
                    {updateProfileMutation.isPending ? (
                      "Updating..."
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}