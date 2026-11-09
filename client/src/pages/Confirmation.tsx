import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, Mail, MessageSquare, Phone } from "lucide-react";

type BookingReceipt = {
  reference: string;
  date: string;
  time: string;
  confirmationEmailSent: boolean;
  status: "saved" | "unverified";
  savedAt: number;
};

function readBookingReceipt(): BookingReceipt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem("pptvinstall_last_booking");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BookingReceipt>;
    if (typeof parsed.date !== "string" || typeof parsed.time !== "string") return null;
    if (typeof parsed.savedAt !== "number" || !Number.isFinite(parsed.savedAt)) return null;
    if (parsed.savedAt > Date.now() || Date.now() - parsed.savedAt > 60 * 60 * 1000) return null;
    return {
      reference: typeof parsed.reference === "string" ? parsed.reference : "",
      date: parsed.date,
      time: parsed.time,
      confirmationEmailSent: parsed.confirmationEmailSent === true,
      status: parsed.status === "saved" ? "saved" : "unverified",
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

function displayDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default function Confirmation() {
  const [receipt] = useState<BookingReceipt | null>(readBookingReceipt);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-8 p-4">
      <Card className="max-w-md w-full shadow-xl border-green-100">
        <div className="bg-green-50 p-6 flex justify-center rounded-t-lg border-b border-green-100">
          <div className="h-20 w-20 bg-green-100 rounded-full flex justify-center items-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-slate-900">
            {receipt?.status === "saved" ? "Booking Request Received" : "Please Verify Your Appointment"}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 text-center">
          <p className="text-slate-600">
            {receipt?.status === "saved"
              ? "Your appointment request was saved. We'll review the details and follow up to confirm your requested time."
              : "We couldn't verify whether the request was saved. Please text or call us before trying to book again."}
          </p>

          {receipt ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-left text-sm text-slate-800">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">{receipt.status === "saved" ? "Your requested appointment" : "Appointment details (not yet verified)"}</p>
                  <p>{displayDate(receipt.date)} at {receipt.time}</p>
                  {receipt.reference ? <p className="text-slate-600">Booking reference: #{receipt.reference}</p> : null}
                  <p className="text-xs text-slate-600">Save a screenshot of this page for your records.</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="bg-slate-50 p-4 rounded-lg border text-left space-y-3">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-sm text-slate-900">
                  {receipt?.confirmationEmailSent ? "Confirmation email submitted" : "Email confirmation not verified"}
                </p>
                <p className="text-xs text-slate-600">
                  {receipt?.confirmationEmailSent
                    ? "Your confirmation was accepted by the email provider. Please check your inbox and spam folder."
                    : receipt?.status === "saved"
                      ? "We couldn't verify that an email was sent. Your saved request does not depend on email delivery. Please text or call to confirm the details."
                      : "We couldn't verify receipt or email delivery. Please text or call to check the request before resubmitting."}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <a href="sms:4047024748"><MessageSquare className="mr-2 h-4 w-4" /> Text us to confirm</a>
            </Button>
            <Button asChild variant="outline" className="w-full border-slate-300">
              <a href="tel:4047024748"><Phone className="mr-2 h-4 w-4" /> Call 404-702-4748</a>
            </Button>
            <Link href="/">
              <Button variant="ghost" className="w-full text-slate-700">Return to Home</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
