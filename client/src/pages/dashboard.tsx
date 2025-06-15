import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Suspense } from "react";

// Define a type for bookings
interface Booking {
  id: string;
  preferredDate: string;
  serviceType: string;
  // Add other properties as needed
}

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bookings");
      // Ensure we're getting the data property from the response
      if (response && typeof response === 'object' && 'bookings' in response) {
        return (response as {bookings: Booking[]}).bookings;
      }
      return [] as Booking[];
    },
  });


  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <div
          className="max-w-6xl mx-auto"
        >
          <div 
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold mb-2">Your Dashboard</h1>
            <p className="text-xl text-gray-600">
              Manage your TV mounting appointments
            </p>
          </div>

          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              <div 
                className="grid gap-6"
              >
                {isLoading ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="h-20 flex items-center justify-center">
                        <LoadingSpinner />
                      </div>
                    </CardContent>
                  </Card>
                ) : bookings?.filter(booking => 
                    new Date(booking.preferredDate) > new Date()
                  ).map((booking) => (
                  <div key={booking.id}>
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          {format(new Date(booking.preferredDate), "MMMM d, yyyy 'at' h:mm a")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p><strong>Service:</strong> {booking.serviceType}</p>
                          <p><strong>Status:</strong> Confirmed</p>
                          <Separator className="my-4" />
                          <div className="flex gap-4">
                            <Button variant="outline" onClick={() => {
                              toast({
                                title: "Reschedule requested",
                                description: "We'll contact you to arrange a new time.",
                              });
                            }}>
                              Reschedule
                            </Button>
                            <Button variant="destructive" onClick={() => {
                              toast({
                                title: "Cancellation requested",
                                description: "We'll process your cancellation request.",
                              });
                            }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="past">
              <div 
                className="grid gap-6"
              >
                {isLoading ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="h-20 flex items-center justify-center">
                        <LoadingSpinner />
                      </div>
                    </CardContent>
                  </Card>
                ) : bookings?.filter(booking => 
                    // Use memoization for better performance
                    new Date(booking.preferredDate).getTime() <= Date.now()
                  ).slice(0, 5).map((booking) => (
                  <div key={booking.id}>
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          {format(new Date(booking.preferredDate), "MMMM d, yyyy 'at' h:mm a")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p><strong>Service:</strong> {booking.serviceType}</p>
                          <p><strong>Status:</strong> Completed</p>
                          <Separator className="my-4" />
                          <Button variant="outline" onClick={() => {
                            toast({
                              title: "Book Again",
                              description: "Redirecting to booking page...",
                            });
                          }}>
                            Book Again
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="calendar">
              <Suspense fallback={<div className="flex justify-center py-8"><LoadingSpinner /></div>}>
                <Card>
                  <CardContent className="p-6">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border mx-auto"
                    />
                  </CardContent>
                </Card>
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}