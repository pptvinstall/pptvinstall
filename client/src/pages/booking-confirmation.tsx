import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function BookingConfirmation() {
  const [, setLocation] = useLocation();

  // Redirect to home if accessed directly without a booking
  useEffect(() => {
    const hasBookingConfirmation = sessionStorage.getItem("bookingConfirmed");
    if (!hasBookingConfirmation) {
      setLocation("/");
    }
    // Clear the confirmation flag
    return () => sessionStorage.removeItem("bookingConfirmed");
  }, [setLocation]);

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <CheckCircle2 className="w-20 h-20 text-primary mx-auto mb-6" />
          </motion.div>

          <Card className="mb-8">
            <CardContent className="pt-6">
              <h1 className="text-3xl font-bold mb-4">Booking Confirmed!</h1>
              <p className="text-gray-600 mb-6">
                Thank you for choosing Picture Perfect TV Install. We'll be in touch within 24 hours to confirm your appointment details.
              </p>

              <div className="space-y-4 text-left mb-8">
                <h2 className="font-semibold text-lg">What's Next?</h2>
                <ul className="space-y-2 text-gray-600">
                  <li>✓ Check your email for booking confirmation</li>
                  <li>✓ Our team will review your requirements</li>
                  <li>✓ We'll call you to confirm appointment details</li>
                  <li>✓ Prepare the installation area</li>
                </ul>
              </div>

              <p className="text-sm text-gray-500 mb-6">
                Have questions? Contact us at 404-702-4748 or pptvinstall@gmail.com
              </p>

              <Link href="/">
                <Button className="w-full md:w-auto">
                  Return to Homepage
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}