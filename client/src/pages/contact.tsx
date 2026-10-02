import { useState } from "react";
import { Link } from "wouter";
import { Clock, Mail, MapPin, MessageSquare, Phone, Send } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

type ContactErrors = Partial<Record<keyof ContactFormState, string>>;

const initialFormState: ContactFormState = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

function validateContactForm(form: ContactFormState): ContactErrors {
  const errors: ContactErrors = {};

  if (form.name.trim().length < 2) {
    errors.name = "Name is required";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Invalid email address";
  }

  if (form.phone.replace(/\D/g, "").length < 10) {
    errors.phone = "Phone number is required";
  }

  if (form.message.trim().length < 10) {
    errors.message = "Please provide more details";
  }

  return errors;
}

export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<ContactFormState>(initialFormState);
  const [errors, setErrors] = useState<ContactErrors>({});

  function updateField<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateContactForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/contact", form);
      trackEvent("contact_form_submitted", { path: "/contact" });
      toast({ title: "Message Sent!", description: "We'll get back to you shortly.", className: "bg-green-50 border-green-200 text-green-900" });
      setForm(initialFormState);
      setErrors({});
    } catch (error) {
      console.error("Contact submit failed:", error);
      toast({
        title: "Message failed",
        description: "We couldn't send that message right now. Please call or text us instead.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <section className="relative overflow-hidden bg-slate-900 pb-24 pt-32 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute right-[10%] top-[20%] h-[500px] w-[500px] rounded-full bg-blue-600 blur-[100px]" />
        </div>
        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
              Get in <span className="text-blue-500">Touch</span>
            </h1>
            <p className="text-lg text-slate-300">
              Have a custom project or a quick question? We&apos;re here to help.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-20 -mt-10 py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-1">
              <Card className="border-none bg-blue-600 text-white shadow-xl">
                <CardContent className="space-y-4 p-6 text-center">
                  <h3 className="text-xl font-bold">Need an exact price first?</h3>
                  <p className="text-sm text-blue-100">Most customers use our instant quote tool before booking.</p>
                  <Link href="/quote">
                    <Button className="w-full rounded-2xl bg-white text-blue-600 hover:bg-blue-50">Get Instant Quote</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardContent className="space-y-6 p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-slate-100 p-3 text-blue-600"><Phone className="h-6 w-6" /></div>
                    <div>
                      <h4 className="font-bold text-slate-900">Phone</h4>
                      <p className="text-sm text-slate-500">Call or text anytime</p>
                      <a href="tel:4047024748" className="text-sm font-bold text-blue-600 hover:underline">404-702-4748</a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-slate-100 p-3 text-blue-600"><Mail className="h-6 w-6" /></div>
                    <div>
                      <h4 className="font-bold text-slate-900">Email</h4>
                      <p className="text-sm text-slate-500">Quotes and project questions</p>
                      <a href="mailto:pptvinstall@gmail.com" className="text-sm font-bold text-blue-600 hover:underline">pptvinstall@gmail.com</a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-slate-100 p-3 text-blue-600"><MapPin className="h-6 w-6" /></div>
                    <div>
                      <h4 className="font-bold text-slate-900">Service Area</h4>
                      <p className="text-sm text-slate-600">Greater Atlanta metro including Buckhead, Decatur, Marietta, Alpharetta, Roswell, Lawrenceville and more.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-slate-100 p-3 text-blue-600"><Clock className="h-6 w-6" /></div>
                    <div>
                      <h4 className="font-bold text-slate-900">Business Hours</h4>
                      <div className="space-y-1 text-sm text-slate-600">
                        <p>Monday to Friday: 5:30 PM to 7:00 PM</p>
                        <p>Saturday and Sunday: 11:00 AM to 7:00 PM</p>
                      </div>
                    </div>
                  </div>

                  <a href="sms:4047024748?body=Hi! I have a question." className="block">
                    <Button variant="outline" className="w-full rounded-2xl border-slate-300 text-slate-900">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Text Us
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="border-none shadow-lg">
                <CardContent className="p-6 md:p-8">
                  <h2 className="mb-6 text-2xl font-bold text-slate-900">Send us a message</h2>
                  <form onSubmit={onSubmit} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="contact-name">Full Name</Label>
                        <Input
                          id="contact-name"
                          value={form.name}
                          onChange={(event) => updateField("name", event.target.value)}
                          placeholder="John Doe"
                          className="h-12 bg-slate-50 text-base"
                        />
                        {errors.name ? <p className="text-sm text-red-600">{errors.name}</p> : null}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-phone">Phone Number</Label>
                        <Input
                          id="contact-phone"
                          value={form.phone}
                          onChange={(event) => updateField("phone", event.target.value)}
                          placeholder="(404) 555-0123"
                          inputMode="tel"
                          className="h-12 bg-slate-50 text-base"
                        />
                        {errors.phone ? <p className="text-sm text-red-600">{errors.phone}</p> : null}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Email Address</Label>
                      <Input
                        id="contact-email"
                        value={form.email}
                        onChange={(event) => updateField("email", event.target.value)}
                        placeholder="john@example.com"
                        inputMode="email"
                        className="h-12 bg-slate-50 text-base"
                      />
                      {errors.email ? <p className="text-sm text-red-600">{errors.email}</p> : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact-message">How can we help?</Label>
                      <Textarea
                        id="contact-message"
                        value={form.message}
                        onChange={(event) => updateField("message", event.target.value)}
                        placeholder="Tell us about your project or question."
                        className="min-h-[150px] resize-none bg-slate-50 text-base"
                      />
                      {errors.message ? <p className="text-sm text-red-600">{errors.message}</p> : null}
                    </div>

                    <Button type="submit" className="w-full rounded-2xl bg-slate-900 text-white hover:bg-slate-800" disabled={isSubmitting}>
                      {isSubmitting ? "Sending..." : "Send Message"}
                      {!isSubmitting ? <Send className="ml-2 h-4 w-4" /> : null}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
