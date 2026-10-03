import { CheckCircle2, XCircle } from "lucide-react";
import { Link, useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { businessPhone, telHref } from "@/components/ui/quote-tool/useQuoteState";

export default function PaymentStatusPage() {
  const [location] = useLocation();
  const cancelled = location.startsWith("/payment/cancelled");

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-lg items-center px-4 py-10">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm md:p-8">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${cancelled ? "bg-amber-100" : "bg-green-100"}`}>
          {cancelled ? <XCircle className="h-8 w-8 text-amber-700" /> : <CheckCircle2 className="h-8 w-8 text-green-700" />}
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-slate-900">{cancelled ? "Payment not completed" : "Payment received by Stripe"}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {cancelled
            ? "No problem — your invoice is still open. You can return to the secure payment link when you're ready or contact us for another payment option."
            : "Stripe is securely confirming the payment with PPTVInstall. Your invoice updates automatically after the payment is confirmed, so you do not need to send a screenshot or card details."}
        </p>

        {!cancelled ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-left">
            <p className="text-sm font-bold text-green-900">What happens next</p>
            <p className="mt-1 text-xs leading-5 text-green-900">PPTVInstall matches the Stripe payment to your invoice automatically. Once confirmed, the invoice is marked paid and a paid receipt is available from the owner record.</p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/">
            <Button className="h-12 w-full">Return to PPTVInstall</Button>
          </Link>
          <a href={telHref} className="flex h-12 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            Call or text {businessPhone}
          </a>
        </div>
      </section>
    </main>
  );
}
