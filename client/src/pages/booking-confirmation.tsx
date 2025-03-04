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

              <div className="mt-6 space-y-4">
                <div className="bg-brand-blue-50 rounded-xl p-4 border border-brand-blue-100">
                  <h2 className="text-lg font-medium text-brand-blue-800 mb-2">Installation Details</h2>
                  <div className="space-y-1 text-sm">
                    <p className="text-brand-blue-700 font-medium">We've sent a detailed confirmation to your email with:</p>
                    <ul className="list-disc pl-5 text-gray-700 space-y-1">
                      <li>Complete price breakdown</li>
                      <li>Service details</li>
                      <li>Calendar invite for your appointment</li>
                    </ul>
                    <p className="mt-2 text-gray-600 italic">Please check your inbox (and spam folder if needed)</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <h2 className="text-lg font-medium">Next Steps</h2>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Our team will review your requirements</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>We'll call you to confirm appointment details</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Prepare the installation area by removing any obstacles</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Payment will be collected at the time of installation</span>
                    </li>
                  </ul>
                </div>
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