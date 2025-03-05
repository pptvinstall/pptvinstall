import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { type InsertBooking } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { BookingWizard } from "@/components/ui/booking-wizard";

export default function Booking() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const mutation = useMutation({
    mutationFn: async (data: InsertBooking) => {
      const response = await apiRequest("POST", "/api/booking", data);
      if (!response.ok) {
        throw new Error('Failed to create booking');
      }
      return response.json();
    },
    onSuccess: (response) => {
      // Redirect to confirmation page with booking ID
      setLocation(`/booking-confirmation?id=${response.id}`);

      toast({
        title: "Booking successful!",
        description: "You will receive a confirmation email shortly.",
      });
    },
    onError: (error) => {
      console.error("Booking error:", error);
      toast({
        title: "Booking failed",
        description: error instanceof Error ? error.message : "There was an error processing your booking.",
        variant: "destructive",
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
          />
        </motion.div>
      </div>
    </div>
  );
}