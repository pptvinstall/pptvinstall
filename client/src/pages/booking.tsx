import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import React from 'react';
import { Calendar } from "@/components/ui/calendar";
import { TimeSlot } from "@/components/ui/time-slot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { bookingSchema, type InsertBooking } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const serviceTypes = [
  "Basic TV Mounting",
  "Premium Installation",
  "Custom Solution"
];

// Business hours time slots
const timeSlots = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
];

const formVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1
    }
  }
};

const formItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

export default function Booking() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = React.useState<string | undefined>(undefined);

  // Fetch bookings for selected date
  const { data: existingBookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ['/api/bookings/date', selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''],
    queryFn: async () => {
      if (!selectedDate) return [];
      const response = await apiRequest(
        "GET", 
        `/api/bookings/date/${format(selectedDate, 'yyyy-MM-dd')}`
      );
      // Ensure we return an array, even if empty
      return Array.isArray(response) ? response : [];
    },
    enabled: !!selectedDate
  });

  // Check if a time slot is available
  const isTimeSlotAvailable = React.useCallback((time: string) => {
    return !existingBookings.some(booking => 
      booking?.preferredDate?.includes(time)
    );
  }, [existingBookings]);

  const form = useForm<InsertBooking>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      streetAddress: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      serviceType: "",
      preferredDate: "",
      notes: ""
    }
  });

  // Update the form's date field when calendar selection changes
  React.useEffect(() => {
    if (selectedDate) {
      form.setValue('preferredDate', format(selectedDate, 'yyyy-MM-dd'));
      // Reset time selection when date changes
      setSelectedTime(undefined);
    }
  }, [selectedDate, form]);

  const mutation = useMutation({
    mutationFn: async (data: InsertBooking) => {
      const bookingData = {
        ...data,
        preferredDate: selectedTime ? `${data.preferredDate} ${selectedTime}` : data.preferredDate
      };
      await apiRequest("POST", "/api/booking", bookingData);
    },
    onSuccess: () => {
      toast({
        title: "Booking Submitted",
        description: "We'll contact you to confirm your appointment.",
      });
      form.reset();
      setSelectedDate(undefined);
      setSelectedTime(undefined);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit booking. Please try again.",
        variant: "destructive"
      });
    }
  });

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <motion.div 
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-bold mb-4">Book Your Installation</h1>
            <p className="text-xl text-gray-600">
              Schedule your TV mounting service
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Date & Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                    disabled={(date) => {
                      // Disable past dates and weekends
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return (
                        date < today ||
                        date.getDay() === 0 ||
                        date.getDay() === 6
                      );
                    }}
                  />

                  {selectedDate && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <h3 className="font-medium">Available Time Slots</h3>
                      {isLoadingBookings ? (
                        <div className="text-center py-4">Loading availability...</div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {timeSlots.map((time) => (
                            <TimeSlot
                              key={time}
                              time={time}
                              available={isTimeSlotAvailable(time)}
                              selected={selectedTime === time}
                              onClick={() => isTimeSlotAvailable(time) && setSelectedTime(time)}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <motion.form 
                    onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
                    className="space-y-4"
                    variants={formVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.div variants={formItemVariants}>
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Your name" 
                                {...field}
                                autoComplete="name"
                                aria-label="Full name"
                                onInput={(e) => {
                                  // Capitalize first letter of each word
                                  const input = e.currentTarget;
                                  const value = input.value.replace(/\b\w/g, l => l.toUpperCase());
                                  input.value = value;
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>

                    <motion.div variants={formItemVariants}>
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="Your email" 
                                {...field}
                                autoComplete="email"
                                aria-label="Email address"
                                onInput={(e) => {
                                  // Convert email to lowercase
                                  const input = e.currentTarget;
                                  const value = input.value.toLowerCase();
                                  input.value = value;
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>

                    <motion.div variants={formItemVariants}>
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Your phone number" 
                                {...field}
                                type="tel"
                                autoComplete="tel"
                                aria-label="Phone number"
                                pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
                                onInput={(e) => {
                                  // Format phone number as XXX-XXX-XXXX
                                  const input = e.currentTarget;
                                  const value = input.value.replace(/\D/g, '');
                                  if (value.length <= 10) {
                                    const formatted = value.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
                                    input.value = formatted;
                                    field.onChange(formatted);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>

                    <motion.div variants={formItemVariants}>
                      <FormField
                        control={form.control}
                        name="streetAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Street address"
                                {...field}
                                autoComplete="street-address"
                                aria-label="Street address"
                                onInput={(e) => {
                                  // Capitalize first letter of each word
                                  const input = e.currentTarget;
                                  const value = input.value.replace(/\b\w/g, l => l.toUpperCase());
                                  input.value = value;
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>

                    <motion.div variants={formItemVariants}>
                      <FormField
                        control={form.control}
                        name="addressLine2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Apartment, suite, etc. (optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Apartment, suite, etc. (optional)"
                                {...field}
                                autoComplete="address-line2"
                                aria-label="Apartment or suite number"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>

                    <motion.div variants={formItemVariants}>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="City"
                                  {...field}
                                  autoComplete="address-level2"
                                  aria-label="City"
                                  onInput={(e) => {
                                    // Capitalize first letter of each word
                                    const input = e.currentTarget;
                                    const value = input.value.replace(/\b\w/g, l => l.toUpperCase());
                                    input.value = value;
                                    field.onChange(value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="State"
                                  {...field}
                                  autoComplete="address-level1"
                                  aria-label="State"
                                  maxLength={2}
                                  onInput={(e) => {
                                    // Convert state to uppercase and limit to 2 chars
                                    const input = e.currentTarget;
                                    const value = input.value.toUpperCase().slice(0, 2);
                                    input.value = value;
                                    field.onChange(value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </motion.div>

                    <motion.div variants={formItemVariants}>
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="ZIP code"
                                {...field}
                                autoComplete="postal-code"
                                aria-label="ZIP code"
                                pattern="[0-9]{5}"
                                maxLength={5}
                                onInput={(e) => {
                                  // Only allow numbers and limit to 5 digits
                                  const input = e.currentTarget;
                                  const value = input.value.replace(/\D/g, '').slice(0, 5);
                                  input.value = value;
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>

                    <motion.div variants={formItemVariants}>
                      <FormField
                        control={form.control}
                        name="serviceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a service" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {serviceTypes.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>

                    <motion.div variants={formItemVariants}>
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Any special requirements or details about your TV mounting needs"
                                className="min-h-[100px]"
                                {...field}
                                value={field.value || ''} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>

                    <motion.div 
                      variants={formItemVariants}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={mutation.isPending || !selectedDate || !selectedTime}
                      >
                        {mutation.isPending ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            Submitting...
                          </motion.div>
                        ) : (
                          "Book Now"
                        )}
                      </Button>
                    </motion.div>
                  </motion.form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}