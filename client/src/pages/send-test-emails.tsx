import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

const SendTestEmails = () => {
  const [emailType, setEmailType] = useState('booking_confirmation');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleSendEmails = async () => {
    try {
      setIsSending(true);
      setResult(null);
      
      const response = await fetch('/api/email/send-test-to-multiple', {
        method: 'POST',
        body: JSON.stringify({ emailType }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        toast({
          title: 'Emails sent successfully',
          description: `Test emails have been sent to JWoodceo@gmail.com and the admin email.`,
          variant: 'default',
        });
      } else {
        throw new Error(data.message || 'Failed to send emails');
      }
    } catch (error) {
      console.error('Error sending test emails:', error);
      toast({
        title: 'Error sending emails',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Send Test Emails</CardTitle>
          <CardDescription>
            Send test emails to JWoodceo@gmail.com and the admin email for verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="emailType" className="font-medium text-sm">Email Type</label>
              <Select value={emailType} onValueChange={setEmailType}>
                <SelectTrigger id="emailType">
                  <SelectValue placeholder="Select email type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="booking_confirmation">Booking Confirmation</SelectItem>
                  <SelectItem value="reschedule_confirmation">Reschedule Confirmation</SelectItem>
                  <SelectItem value="service_edit">Service Edit</SelectItem>
                  <SelectItem value="booking_cancellation">Booking Cancellation</SelectItem>
                  <SelectItem value="welcome">Welcome Email</SelectItem>
                  <SelectItem value="password_reset">Password Reset</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col">
          <Button 
            onClick={handleSendEmails} 
            disabled={isSending} 
            className="w-full"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Test Emails'
            )}
          </Button>
          
          {result && (
            <div className="mt-4 w-full">
              <div className="text-sm font-medium text-green-600 mb-2">Emails sent successfully!</div>
              <div className="bg-gray-50 rounded-md p-4 text-xs font-mono overflow-auto max-h-40">
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default SendTestEmails;