import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import React from 'react';
import { Calendar } from "@/components/ui/calendar";
import { TimeSlot } from "@/components/ui/time-slot";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ServiceWizard, type TVInstallation, type SmartHomeInstallation } from "@/components/ui/service-wizard";
import { PriceCalculator } from "@/components/ui/price-calculator";
import { BookingWizard } from "@/components/ui/booking-wizard";

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
  const [smartHomeInstallations, setSmartHomeInstallations] = React.useState<SmartHomeInstallation[]>([]);

  // Fetch existing bookings for selected date
  const { data: existingBookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bookings");
      return Array.isArray(response) ? response : [];
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertBooking) => {
      const bookingData = {
        ...data,
        preferredDate: data.preferredTime ? `${data.preferredDate} ${data.preferredTime}` : data.preferredDate
      };
      await apiRequest("POST", "/api/booking", bookingData);
    },
    onSuccess: () => {
      toast({
        title: "Booking Submitted",
        description: "We'll contact you to confirm your appointment.",
      });
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
          className="max-w-6xl mx-auto"
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
              Schedule your TV mounting or smart home installation service
            </p>
          </motion.div>

          <BookingWizard
            onSubmit={(data) => mutation.mutate(data as InsertBooking)}
            isSubmitting={mutation.isPending}
            existingBookings={existingBookings}
            isLoadingBookings={isLoadingBookings}
          />
        </motion.div>
      </div>
    </div>
  );
}