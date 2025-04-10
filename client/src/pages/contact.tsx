import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { contactMessageSchema, type InsertContactMessage } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Phone, Mail, MapPin } from "lucide-react";
import { useEffect } from "react";

export default function Contact() {
  const { toast } = useToast();

  const form = useForm<InsertContactMessage>({
    resolver: zodResolver(contactMessageSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: ""
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertContactMessage) => {
      await apiRequest("POST", "/api/contact", data);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "We'll get back to you soon!",
      });
      form.reset();
      
      // Track contact form submission with Meta Pixel
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Contact');
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  });

  return (
    <div className="py-12 bg-gradient-to-b from-white to-blue-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Contact Us
            </h1>
            <p className="text-xl text-gray-600">
              Get in touch for quotes and inquiries
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-2 border-blue-100 shadow-lg">
              <CardHeader>
                <CardTitle className="text-blue-700">Send us a message</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
                        className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your name" 
                              {...field}
                              className="border-blue-200 focus:border-blue-400" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Your email" 
                              {...field}
                              className="border-blue-200 focus:border-blue-400" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your phone number" 
                              {...field}
                              className="border-blue-200 focus:border-blue-400" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="How can we help you?"
                              className="min-h-[100px] border-blue-200 focus:border-blue-400"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card className="border-2 border-blue-100 shadow-lg transform hover:scale-105 transition-transform duration-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Phone className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-700">Phone</h3>
                      <p className="text-gray-600">+16782632859</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-100 shadow-lg transform hover:scale-105 transition-transform duration-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Mail className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-700">Email</h3>
                      <p className="text-gray-600">pptvinstall@gmail.com</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-100 shadow-lg transform hover:scale-105 transition-transform duration-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <MapPin className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-700">Service Area</h3>
                      <p className="text-gray-600">Metro Atlanta and surrounding areas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}