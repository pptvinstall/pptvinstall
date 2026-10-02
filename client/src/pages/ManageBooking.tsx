import { useState } from "react";
import { useLocation } from "wouter"; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function ManageBooking() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this appointment? This cannot be undone.")) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/cancel-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reason: "Customer requested via web" })
      });
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Invalid Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">We couldn't find the booking information. The link might be broken or expired.</p>
            <Button onClick={() => setLocation("/")} variant="outline" className="w-full">Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md mx-4 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6" /> Booking Cancelled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-800 mb-6">Your appointment has been successfully cancelled. We've sent a confirmation email.</p>
            <Button onClick={() => setLocation("/")} className="w-full bg-green-600 hover:bg-green-700 text-white">Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Manage Booking</CardTitle>
          <CardDescription>Make changes to your upcoming appointment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-800">
            <strong>Note:</strong> To reschedule, please cancel your current appointment below and book a new time, or call us directly.
          </div>
          <Button 
            onClick={handleCancel} 
            disabled={isLoading}
            variant="destructive" 
            className="w-full py-6 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              "Cancel Appointment"
            )}
          </Button>

          <Button 
            onClick={() => setLocation("/")} 
            variant="ghost" 
            className="w-full"
          >
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
