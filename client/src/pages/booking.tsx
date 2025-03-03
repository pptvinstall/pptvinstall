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
import { useToast } from "@/hooks/use-toast";
import { bookingSchema, type InsertBooking } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ServiceWizard, type TVInstallation } from "@/components/ui/service-wizard";
import { PriceCalculator } from "@/components/ui/price-calculator";

// Time slots available (9 AM to 4 PM)
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
  const [showServiceWizard, setShowServiceWizard] = React.useState(false);
  const [installations, setInstallations] = React.useState<TVInstallation[]>([]);

  // Fetch existing bookings for selected date
  const { data: existingBookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ['/api/bookings/date', selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''],
    queryFn: async () => {
      if (!selectedDate) return [];
      const response = await apiRequest(
        "GET",
        `/api/bookings/date/${format(selectedDate, 'yyyy-MM-dd')}`
      );
      return Array.isArray(response) ? response : [];
    },
    enabled: !!selectedDate
  });

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

  React.useEffect(() => {
    if (selectedDate) {
      form.setValue('preferredDate', format(selectedDate, 'yyyy-MM-dd'));
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
      setInstallations([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit booking. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleServiceSelect = (selectedInstallations: TVInstallation[]) => {
    setInstallations(selectedInstallations);
    form.setValue("serviceType", selectedInstallations.map(i =>
      `${i.size === 'large' ? '56"+ ' : 'Under 55" '}TV - ${i.location} Mount${i.mountType !== 'none' ? ` with ${i.mountType} Mount` : ''}`
    ).join(", "));
    setShowServiceWizard(false);
  };

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
                        name="serviceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Type</FormLabel>
                            <div className="space-y-4">
                              <Dialog open={showServiceWizard} onOpenChange={setShowServiceWizard}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-left"
                                    type="button"
                                  >
                                    {field.value ? (
                                      <span>{field.value}</span>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        Configure your TV installation
                                      </span>
                                    )}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg max-h-[80vh] p-0">
                                  <div className="overflow-y-auto h-full py-6 px-6">
                                    <h2 className="text-lg font-semibold mb-6">Configure Your TV Installation</h2>
                                    <ServiceWizard
                                      onServiceSelect={handleServiceSelect}
                                      onClose={() => setShowServiceWizard(false)}
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>

                              {installations.length > 0 && (
                                <div className="mt-6">
                                  <PriceCalculator
                                    installations={installations}
                                    distance={0}
                                    onUpdate={(total, deposit) => {
                                      // Store total and deposit if needed
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </FormItem>
                        )}
                      />
                    </motion.div>

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
                              <Input type="email" placeholder="Your email" {...field} />
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
                              <Input type="tel" placeholder="Your phone number" {...field} />
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
                              <Input placeholder="Street address" {...field} />
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
                            <FormLabel>Address Line 2 (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Apartment, suite, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                    <motion.div variants={formItemVariants}>
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                    <motion.div variants={formItemVariants}>
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="State" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                    <motion.div variants={formItemVariants}>
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zip Code</FormLabel>
                            <FormControl>
                              <Input placeholder="Zip code" {...field} />
                            </FormControl>
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
                            <FormLabel>Notes (optional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Add any additional notes" {...field} />
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
                        disabled={mutation.isPending || !selectedDate || !selectedTime || installations.length === 0}
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