import React, { useState } from "react";

// Types for the API responses
interface EmailEnvironmentResponse {
  success: boolean;
  apiKeySet: boolean;
  fromEmail: string;
  adminEmail: string;
}

interface TestEmailResponse {
  success: boolean;
  message?: string;
  results?: {
    customerEmail: boolean | string;
    adminEmail: boolean | string;
  };
}

interface EnhancedEmailRequest {
  email: string;
  emailType: string;
  sendCalendar?: boolean;
}

interface EnhancedEmailResponse {
  success: boolean;
  result: boolean;
  message: string;
  emailType: string;
  timestamp: string;
  error?: string;
}
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Mail, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EmailPreviewsPage() {
  const [emailType, setEmailType] = useState<string>("booking_confirmation");
  const [testEmail, setTestEmail] = useState<string>("");
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [useEnhancedEmail, setUseEnhancedEmail] = useState<boolean>(true);
  const { toast } = useToast();

  // Get email environment information
  const { data: emailEnv, isLoading: loadingEnv } = useQuery<EmailEnvironmentResponse>({
    queryKey: ["/api/email/check-config"],
    enabled: true
  });

  // Function to send test email
  const sendTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to send the test to",
        variant: "destructive"
      });
      return;
    }
    
    setSendingEmail(true);
    
    try {
      // Build the request object for the enhanced email service
      const enhancedEmailRequest: EnhancedEmailRequest = {
        email: testEmail,
        emailType: emailType,
        sendCalendar: ['booking_confirmation', 'reschedule_confirmation'].includes(emailType)
      };
      
      // Use POST with a request body instead of GET with query parameters
      // Get the response and parse it as JSON
      const response = await apiRequest('/api/email/test-send', 'POST', enhancedEmailRequest);
      const enhancedResponse = response as unknown as EnhancedEmailResponse;
      
      if (enhancedResponse && enhancedResponse.success) {
        toast({
          title: "Test Email Sent",
          description: `Email sent successfully to ${testEmail}`,
          variant: "default"
        });
      } else {
        toast({
          title: "Error Sending Email",
          description: enhancedResponse?.message || "An error occurred sending the test email",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error Sending Email",
        description: "An unexpected error occurred sending the test email",
        variant: "destructive"
      });
      console.error("Email sending error:", error);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Email Notification Previews</h1>
      <p className="text-slate-500 mb-6">
        Preview the professional email notifications that will be sent to customers
      </p>
      
      <div className="grid md:grid-cols-3 gap-6">
        {/* Email Environment Status */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Email Configuration
            </CardTitle>
            <CardDescription>
              Current email service status and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEnv ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : emailEnv ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">SendGrid API Key:</p>
                  <div className="flex items-center">
                    {emailEnv.apiKeySet ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                    )}
                    <span className="text-sm">
                      {emailEnv.apiKeySet ? "Configured" : "Not configured"}
                    </span>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">From Email:</p>
                  <p className="text-sm">{emailEnv.fromEmail}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">Admin Email:</p>
                  <p className="text-sm">{emailEnv.adminEmail}</p>
                </div>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Unable to load email configuration
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            <div className="space-y-2 w-full">
              <p className="text-sm font-medium">Send Test Email</p>
              <Input 
                type="email" 
                placeholder="Enter email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2 w-full">
              <p className="text-sm font-medium">Email Type</p>
              <Select value={emailType} onValueChange={setEmailType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select email type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="booking_confirmation">Booking Confirmation</SelectItem>
                  <SelectItem value="reschedule_confirmation">Reschedule Confirmation</SelectItem>
                  <SelectItem value="service_edit">Service Edit Notification</SelectItem>
                  <SelectItem value="booking_cancellation">Cancellation Notification</SelectItem>
                  <SelectItem value="welcome">Welcome Email</SelectItem>
                  <SelectItem value="password_reset">Password Reset</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={sendTestEmail} 
              className="w-full"
              disabled={sendingEmail || !emailEnv?.apiKeySet}
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Email Previews */}
        <div className="md:col-span-2">
          <Tabs defaultValue="booking_confirmation" className="w-full" onValueChange={setEmailType}>
            <TabsList className="grid grid-cols-6 mb-6">
              <TabsTrigger value="booking_confirmation">Booking</TabsTrigger>
              <TabsTrigger value="reschedule_confirmation">Reschedule</TabsTrigger>
              <TabsTrigger value="service_edit">Edit</TabsTrigger>
              <TabsTrigger value="booking_cancellation">Cancel</TabsTrigger>
              <TabsTrigger value="welcome">Welcome</TabsTrigger>
              <TabsTrigger value="password_reset">Password</TabsTrigger>
            </TabsList>
            
            <TabsContent value="booking_confirmation">
              <Card>
                <CardHeader>
                  <CardTitle>Booking Confirmation Email</CardTitle>
                  <CardDescription>
                    Sent to customers immediately after booking a service
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-[#005cb9] p-4 text-center">
                      <img 
                        src="/assets/logo-pptv.jpg" 
                        alt="Picture Perfect TV Install" 
                        className="h-10 inline-block"
                      />
                    </div>
                    
                    <div className="p-6">
                      <h2 className="text-xl font-bold text-[#005cb9] text-center mb-4">Booking Confirmation</h2>
                      
                      <p className="text-sm mb-4">
                        Thank you for choosing Picture Perfect TV Install for your home entertainment needs. 
                        We're excited to confirm your booking and look forward to providing you with exceptional service.
                      </p>
                      
                      <div className="bg-slate-50 p-4 rounded-md mb-4">
                        <h3 className="font-medium mb-2">Service Details</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-500">Service Type:</div>
                          <div>TV Installation</div>
                          <div className="text-slate-500">Date:</div>
                          <div>Thursday, April 4, 2025</div>
                          <div className="text-slate-500">Time:</div>
                          <div>3:00 PM</div>
                          <div className="text-slate-500">TV Size:</div>
                          <div>65" - 75"</div>
                          <div className="text-slate-500">Mount Type:</div>
                          <div>Articulating</div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-md mb-4">
                        <h3 className="font-medium mb-2">Location Information</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-500">Address:</div>
                          <div>123 Main Street</div>
                          <div className="text-slate-500">City, State:</div>
                          <div>Atlanta, GA</div>
                          <div className="text-slate-500">Zip Code:</div>
                          <div>30303</div>
                        </div>
                      </div>
                      
                      <div className="border-l-4 border-[#005cb9] bg-blue-50 p-3 text-sm mb-4">
                        <strong>Important:</strong> We've attached a calendar invitation for your appointment. 
                        Please add it to your calendar to help you remember your scheduled service.
                      </div>
                      
                      <p className="text-sm mb-4">
                        If you need to make any changes to your booking or have any questions, 
                        please contact us at PPTVInstall@gmail.com or call us at (404) 555-1234.
                      </p>
                      
                      <p className="text-sm">
                        We look forward to serving you!<br /><br />
                        Warm regards,<br />
                        The Picture Perfect TV Install Team
                      </p>
                    </div>
                    
                    <div className="bg-slate-100 p-4 text-center text-xs text-slate-500">
                      <p className="mb-1">© 2025 Picture Perfect TV Install. All rights reserved.</p>
                      <p className="mb-1">
                        <a href="#" className="text-[#005cb9]">pictureperfecttvinstall.com</a> | 
                        Phone: (404) 555-1234 | 
                        Email: <a href="#" className="text-[#005cb9]">PPTVInstall@gmail.com</a>
                      </p>
                      <p className="text-slate-400 text-[10px]">
                        This email was sent to you because you booked a service with Picture Perfect TV Install.
                        If you believe this was sent in error, please contact us.
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-muted-foreground">
                    This email includes a calendar (.ics) attachment and is mobile-responsive.
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="reschedule_confirmation">
              <Card>
                <CardHeader>
                  <CardTitle>Reschedule Confirmation Email</CardTitle>
                  <CardDescription>
                    Sent when a customer or admin reschedules an appointment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-[#005cb9] p-4 text-center">
                      <img 
                        src="/assets/logo-pptv.jpg" 
                        alt="Picture Perfect TV Install" 
                        className="h-10 inline-block"
                      />
                    </div>
                    
                    <div className="p-6">
                      <h2 className="text-xl font-bold text-[#005cb9] text-center mb-4">Appointment Rescheduled</h2>
                      
                      <p className="text-sm mb-4">
                        Your appointment with Picture Perfect TV Install has been successfully rescheduled.
                        Here are your updated appointment details:
                      </p>
                      
                      <div className="bg-slate-50 p-4 rounded-md mb-4">
                        <h3 className="font-medium mb-2">New Appointment Details</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-500">Service Type:</div>
                          <div>TV Installation</div>
                          <div className="text-slate-500">New Date:</div>
                          <div className="font-medium text-[#005cb9]">Saturday, April 6, 2025</div>
                          <div className="text-slate-500">New Time:</div>
                          <div className="font-medium text-[#005cb9]">11:30 AM</div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-100 p-4 rounded-md mb-4">
                        <h3 className="font-medium mb-2">Previous Appointment</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-500">Previous Date:</div>
                          <div className="line-through">Thursday, April 4, 2025</div>
                          <div className="text-slate-500">Previous Time:</div>
                          <div className="line-through">3:00 PM</div>
                        </div>
                      </div>
                      
                      <div className="border-l-4 border-[#005cb9] bg-blue-50 p-3 text-sm mb-4">
                        <strong>Important:</strong> We've attached an updated calendar invitation for your appointment. 
                        Please update your calendar to reflect this change.
                      </div>
                      
                      <p className="text-sm mb-2">
                        If you need to make any further changes or have any questions, 
                        please contact us at PPTVInstall@gmail.com or call us at (404) 555-1234.
                      </p>
                      
                      <p className="text-sm mb-4">
                        Thank you for your flexibility.
                      </p>
                      
                      <p className="text-sm">
                        Best regards,<br />
                        The Picture Perfect TV Install Team
                      </p>
                    </div>
                    
                    <div className="bg-slate-100 p-4 text-center text-xs text-slate-500">
                      <p className="mb-1">© 2025 Picture Perfect TV Install. All rights reserved.</p>
                      <p className="mb-1">
                        <a href="#" className="text-[#005cb9]">pictureperfecttvinstall.com</a> | 
                        Phone: (404) 555-1234 | 
                        Email: <a href="#" className="text-[#005cb9]">PPTVInstall@gmail.com</a>
                      </p>
                      <p className="text-slate-400 text-[10px]">
                        This email was sent to you because you booked a service with Picture Perfect TV Install.
                        If you believe this was sent in error, please contact us.
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-muted-foreground">
                    This email includes a calendar (.ics) attachment and is mobile-responsive.
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="service_edit">
              <Card>
                <CardHeader>
                  <CardTitle>Service Edit Notification Email</CardTitle>
                  <CardDescription>
                    Sent when service details are modified
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-[#005cb9] p-4 text-center">
                      <img 
                        src="/assets/logo-pptv.jpg" 
                        alt="Picture Perfect TV Install" 
                        className="h-10 inline-block"
                      />
                    </div>
                    
                    <div className="p-6">
                      <h2 className="text-xl font-bold text-[#005cb9] text-center mb-4">Service Details Updated</h2>
                      
                      <p className="text-sm mb-4">
                        The details of your TV installation service with Picture Perfect TV Install have been updated.
                        Here's a summary of the changes:
                      </p>
                      
                      <div className="bg-slate-50 p-4 rounded-md mb-4">
                        <h3 className="font-medium mb-2">Updated Information</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-500">TV Size:</div>
                          <div className="text-[#005cb9]">75" - 85"</div>
                          <div className="text-slate-500">Mount Type:</div>
                          <div className="text-[#005cb9]">Premium Articulating</div>
                          <div className="text-slate-500">Notes:</div>
                          <div className="text-[#005cb9]">Please bring additional HDMI cables</div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-md mb-4">
                        <h3 className="font-medium mb-2">Complete Service Details</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-500">Service Type:</div>
                          <div>TV Installation</div>
                          <div className="text-slate-500">Date:</div>
                          <div>Saturday, April 6, 2025</div>
                          <div className="text-slate-500">Time:</div>
                          <div>11:30 AM</div>
                          <div className="text-slate-500">TV Size:</div>
                          <div>75" - 85"</div>
                          <div className="text-slate-500">Mount Type:</div>
                          <div>Premium Articulating</div>
                          <div className="text-slate-500">Address:</div>
                          <div>123 Main Street</div>
                          <div className="text-slate-500">City, State:</div>
                          <div>Atlanta, GA</div>
                          <div className="text-slate-500">Zip Code:</div>
                          <div>30303</div>
                          <div className="text-slate-500">Notes:</div>
                          <div>Please bring additional HDMI cables</div>
                        </div>
                      </div>
                      
                      <div className="border-l-4 border-[#005cb9] bg-blue-50 p-3 text-sm mb-4">
                        <strong>Note:</strong> These changes may affect your final pricing. 
                        If you have any questions about these updates, please contact us.
                      </div>
                      
                      <p className="text-sm mb-2">
                        If you have any questions about these changes or need further assistance, 
                        please contact us at PPTVInstall@gmail.com or call us at (404) 555-1234.
                      </p>
                      
                      <p className="text-sm mb-4">
                        We look forward to providing you with excellent service.
                      </p>
                      
                      <p className="text-sm">
                        Best regards,<br />
                        The Picture Perfect TV Install Team
                      </p>
                    </div>
                    
                    <div className="bg-slate-100 p-4 text-center text-xs text-slate-500">
                      <p className="mb-1">© 2025 Picture Perfect TV Install. All rights reserved.</p>
                      <p className="mb-1">
                        <a href="#" className="text-[#005cb9]">pictureperfecttvinstall.com</a> | 
                        Phone: (404) 555-1234 | 
                        Email: <a href="#" className="text-[#005cb9]">PPTVInstall@gmail.com</a>
                      </p>
                      <p className="text-slate-400 text-[10px]">
                        This email was sent to you because you booked a service with Picture Perfect TV Install.
                        If you believe this was sent in error, please contact us.
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-muted-foreground">
                    This email includes clear highlighting of changed fields for better clarity.
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="booking_cancellation">
              <Card>
                <CardHeader>
                  <CardTitle>Cancellation Notification Email</CardTitle>
                  <CardDescription>
                    Sent when a booking is cancelled by customer or admin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-[#005cb9] p-4 text-center">
                      <img 
                        src="/assets/logo-pptv.jpg" 
                        alt="Picture Perfect TV Install" 
                        className="h-10 inline-block"
                      />
                    </div>
                    
                    <div className="p-6">
                      <h2 className="text-xl font-bold text-[#005cb9] text-center mb-4">Booking Cancellation</h2>
                      
                      <p className="text-sm mb-4">
                        Your appointment with Picture Perfect TV Install has been cancelled as requested.
                        Here is a summary of the cancelled booking:
                      </p>
                      
                      <div className="bg-slate-50 p-4 rounded-md mb-4">
                        <h3 className="font-medium mb-2">Cancelled Appointment</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-500">Service Type:</div>
                          <div className="line-through">TV Installation</div>
                          <div className="text-slate-500">Date:</div>
                          <div className="line-through">Thursday, April 4, 2025</div>
                          <div className="text-slate-500">Time:</div>
                          <div className="line-through">3:00 PM</div>
                          <div className="text-slate-500">Cancellation Reason:</div>
                          <div className="text-red-500">Customer request - scheduling conflict</div>
                        </div>
                      </div>
                      
                      <div className="border-l-4 border-amber-500 bg-amber-50 p-3 text-sm mb-4">
                        <strong>Note:</strong> If you would like to book a new appointment, 
                        please visit our website or contact us directly.
                      </div>
                      
                      <p className="text-sm mb-4">
                        If you have any questions about this cancellation or would like to schedule a new appointment, 
                        please contact us at PPTVInstall@gmail.com or call us at (404) 555-1234.
                      </p>
                      
                      <p className="text-sm">
                        Thank you for your understanding.<br /><br />
                        Best regards,<br />
                        The Picture Perfect TV Install Team
                      </p>
                    </div>
                    
                    <div className="bg-slate-100 p-4 text-center text-xs text-slate-500">
                      <p className="mb-1">© 2025 Picture Perfect TV Install. All rights reserved.</p>
                      <p className="mb-1">
                        <a href="#" className="text-[#005cb9]">pictureperfecttvinstall.com</a> | 
                        Phone: (404) 555-1234 | 
                        Email: <a href="#" className="text-[#005cb9]">PPTVInstall@gmail.com</a>
                      </p>
                      <p className="text-slate-400 text-[10px]">
                        This email was sent to you because you booked a service with Picture Perfect TV Install.
                        If you believe this was sent in error, please contact us.
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-muted-foreground">
                    Cancellation emails clearly mark the cancelled appointment details.
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="welcome">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Email</CardTitle>
                  <CardDescription>
                    Sent when a customer creates an account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-[#005cb9] p-4 text-center">
                      <img 
                        src="/assets/logo-pptv.jpg" 
                        alt="Picture Perfect TV Install" 
                        className="h-10 inline-block"
                      />
                    </div>
                    
                    <div className="p-6">
                      <h2 className="text-xl font-bold text-[#005cb9] text-center mb-4">Welcome to Picture Perfect TV Install</h2>
                      
                      <p className="text-sm mb-4">
                        Thank you for creating an account with Picture Perfect TV Install! 
                        We're excited to have you join our community of satisfied customers.
                      </p>
                      
                      <div className="bg-slate-50 p-4 rounded-md mb-4">
                        <h3 className="font-medium mb-2">Your Account Information</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-500">Name:</div>
                          <div>John Smith</div>
                          <div className="text-slate-500">Email:</div>
                          <div>john.smith@example.com</div>
                          <div className="text-slate-500">Account Created:</div>
                          <div>April 3, 2025</div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-md mb-4">
                        <h3 className="font-medium mb-2">What You Can Do Now</h3>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          <li>Book TV installation and smart home services</li>
                          <li>View and manage your appointments</li>
                          <li>Update your profile information</li>
                          <li>Receive exclusive promotions and offers</li>
                        </ul>
                      </div>
                      
                      <div className="border-l-4 border-[#005cb9] bg-blue-50 p-3 text-sm mb-4">
                        <strong>Next step:</strong> Verify your email address by clicking the button below to ensure you receive important notifications.
                      </div>
                      
                      <div className="text-center my-6">
                        <a href="#" className="bg-[#005cb9] text-white px-6 py-2 rounded-md font-medium inline-block">
                          Verify Email Address
                        </a>
                      </div>
                      
                      <p className="text-sm mb-4">
                        If you have any questions or need assistance, please contact us at 
                        PPTVInstall@gmail.com or call us at (404) 555-1234.
                      </p>
                      
                      <p className="text-sm">
                        We look forward to serving you!<br /><br />
                        Warm regards,<br />
                        The Picture Perfect TV Install Team
                      </p>
                    </div>
                    
                    <div className="bg-slate-100 p-4 text-center text-xs text-slate-500">
                      <p className="mb-1">© 2025 Picture Perfect TV Install. All rights reserved.</p>
                      <p className="mb-1">
                        <a href="#" className="text-[#005cb9]">pictureperfecttvinstall.com</a> | 
                        Phone: (404) 555-1234 | 
                        Email: <a href="#" className="text-[#005cb9]">PPTVInstall@gmail.com</a>
                      </p>
                      <p className="text-slate-400 text-[10px]">
                        You received this email because you created an account with Picture Perfect TV Install.
                        If you believe this was sent in error, please contact us.
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-muted-foreground">
                    Welcome emails include a verification button to confirm the customer's email.
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="password_reset">
              <Card>
                <CardHeader>
                  <CardTitle>Password Reset Email</CardTitle>
                  <CardDescription>
                    Sent when a customer requests a password reset
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-[#005cb9] p-4 text-center">
                      <img 
                        src="/assets/logo-pptv.jpg" 
                        alt="Picture Perfect TV Install" 
                        className="h-10 inline-block"
                      />
                    </div>
                    
                    <div className="p-6">
                      <h2 className="text-xl font-bold text-[#005cb9] text-center mb-4">Password Reset Request</h2>
                      
                      <p className="text-sm mb-4">
                        We received a request to reset the password for your Picture Perfect TV Install account.
                        If you made this request, please use the button below to reset your password:
                      </p>
                      
                      <div className="text-center my-6">
                        <a href="#" className="bg-[#005cb9] text-white px-6 py-2 rounded-md font-medium inline-block">
                          Reset Password
                        </a>
                      </div>
                      
                      <p className="text-sm mb-2">
                        This link will expire in 60 minutes for security reasons.
                      </p>
                      
                      <div className="border-l-4 border-amber-500 bg-amber-50 p-3 text-sm mb-4">
                        <strong>Important:</strong> If you didn't request a password reset, please ignore this email
                        or contact us if you have concerns about your account security.
                      </div>
                      
                      <p className="text-sm mb-4">
                        For security purposes, this link can only be used once. If you need to reset your password again,
                        please return to the website and request another reset link.
                      </p>
                      
                      <p className="text-sm">
                        Best regards,<br />
                        The Picture Perfect TV Install Team
                      </p>
                    </div>
                    
                    <div className="bg-slate-100 p-4 text-center text-xs text-slate-500">
                      <p className="mb-1">© 2025 Picture Perfect TV Install. All rights reserved.</p>
                      <p className="mb-1">
                        <a href="#" className="text-[#005cb9]">pictureperfecttvinstall.com</a> | 
                        Phone: (404) 555-1234 | 
                        Email: <a href="#" className="text-[#005cb9]">PPTVInstall@gmail.com</a>
                      </p>
                      <p className="text-slate-400 text-[10px]">
                        This email was sent as a response to a password reset request.
                        If you believe this was sent in error, please contact us.
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-muted-foreground">
                    Password reset emails include a clear action button and security warnings.
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <Separator className="my-8" />
      
      <div className="space-y-4 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold">Email Notification System Features</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Professional Branding</CardTitle>
              <CardDescription>
                Consistent visual identity across all communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2">
                <li>Company logo at the top of every email</li>
                <li>Consistent color scheme matching website</li>
                <li>Professional, mobile-responsive layout</li>
                <li>Clean typography for easy reading</li>
                <li>Structured information in organized sections</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Anti-Spam Measures</CardTitle>
              <CardDescription>
                Techniques to ensure delivery to customer inboxes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2">
                <li>SendGrid as trusted email delivery provider</li>
                <li>Professional From address with consistent format</li>
                <li>Plain text alternative version included</li>
                <li>Avoidance of spam trigger words</li>
                <li>Proper HTML formatting and clean code</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Functionality</CardTitle>
              <CardDescription>
                Beyond standard email capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2">
                <li>Calendar (.ics) attachments for appointments</li>
                <li>Visual highlighting of changes in updates</li>
                <li>Complete booking information in all emails</li>
                <li>Clear calls-to-action when needed</li>
                <li>Admin copies of all customer communications</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Customer Experience</CardTitle>
              <CardDescription>
                Designed with customer needs in mind
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2">
                <li>Clear, concise information presentation</li>
                <li>Warm, professional tone in all content</li>
                <li>Important information highlighted visually</li>
                <li>Complete contact information in every email</li>
                <li>Mobile-optimized for viewing on any device</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}