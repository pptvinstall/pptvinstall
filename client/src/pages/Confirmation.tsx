import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, Mail } from "lucide-react";
import { ReviewCTA } from "@/components/ui/ReviewCTA";

export default function Confirmation() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-8 p-4">
      <Card className="max-w-md w-full shadow-xl border-green-100">
        <div className="bg-green-50 p-6 flex justify-center rounded-t-lg border-b border-green-100">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>
        
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-slate-900">Booking Confirmed!</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 text-center">
          <p className="text-slate-600">
            Your appointment has been successfully scheduled. We have locked in your time slot.
          </p>

          <div className="bg-slate-50 p-4 rounded-lg border text-left space-y-3">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-slate-900">Check your Email</p>
                <p className="text-xs text-slate-500">We sent a confirmation with a link to manage or cancel your booking.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-slate-900">Add to Calendar</p>
                <p className="text-xs text-slate-500">The email includes a quick link to add this to your Google Calendar.</p>
              </div>
            </div>
          </div>

          <Link href="/">
            <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white">
              Return to Home
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Review request — shown after booking is confirmed */}
      <div className="max-w-md w-full">
        <ReviewCTA />
      </div>
    </div>
  );
}