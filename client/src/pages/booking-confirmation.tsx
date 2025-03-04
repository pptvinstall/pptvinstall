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
    try {
      const hasBookingConfirmation = sessionStorage.getItem("bookingConfirmed");
      if (!hasBookingConfirmation) {
        setLocation("/");
      }
    } catch (error) {
      console.error("Error checking booking confirmation:", error);
      // Don't redirect if we can't check - this prevents blank screen
    }
    
    // Clear the confirmation flag on component unmount
    return () => {
      try {
        sessionStorage.removeItem("bookingConfirmed");
      } catch (error) {
        console.error("Error clearing booking confirmation:", error);
      }
    };
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
                      <li>Selected service details (including Smart Home services)</li>
                      <li>Calendar invite for your appointment</li>
                    </ul>
                    <p className="mt-2 text-gray-600 italic">Please check your inbox (and spam folder if needed)</p>
                    <p className="mt-4 p-2 bg-yellow-50 text-yellow-700 rounded border border-yellow-200">
                      <span className="font-semibold">Important:</span> Our technician will call you before your appointment to confirm all details.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Selected Services</h3>
                  <div className="space-y-2">
                    {booking?.serviceType.split(' + ').length > 0 
                      ? booking?.serviceType.split(' + ').map((service, index) => (
                        <div key={index} className="p-3 bg-muted rounded-md flex items-center">
                          {service.toLowerCase().includes('tv') && (
                            <svg className="w-5 h-5 mr-2 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20 6H4C2.89543 6 2 6.89543 2 8V16C2 17.1046 2.89543 18 4 18H20C21.1046 18 22 17.1046 22 16V8C22 6.89543 21.1046 6 20 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8 21H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M12 18V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {(service.toLowerCase().includes('doorbell') || service.toLowerCase().includes('smart doorbell')) && (
                            <svg className="w-5 h-5 mr-2 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M8 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M17 13V7M17 7V1M17 7H11M17 7H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {(service.toLowerCase().includes('camera') && !service.toLowerCase().includes('floodlight')) && (
                            <svg className="w-5 h-5 mr-2 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M23 19V8C23 6.89543 22.1046 6 21 6H3C1.89543 6 1 6.89543 1 8V19C1 20.1046 1.89543 21 3 21H21C22.1046 21 23 20.1046 23 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {(service.toLowerCase().includes('floodlight')) && (
                            <svg className="w-5 h-5 mr-2 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 3V5M5.64 5.64L7.05 7.05M18.36 5.64L16.95 7.05M12 21V18M4 13H2M22 13H20M6 13C6 9.68629 8.68629 7 12 7C15.3137 7 18 9.68629 18 13C18 14.6569 17.3284 16.1569 16.2426 17.2426L15 20H9L7.75736 17.2426C6.67157 16.1569 6 14.6569 6 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          <span className="flex-1">{service}</span>
                        </div>
                      ))
                      : <div className="p-3 bg-muted rounded-md text-muted-foreground">No services selected</div>
                    }
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