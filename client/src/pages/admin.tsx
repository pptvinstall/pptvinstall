import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, DollarSign, Calendar, Users, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["/api/admin/bookings"],
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/bookings/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({ title: "Booking Cancelled" });
    },
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  // Filter Active Bookings
  const activeBookings = bookings?.filter((b: any) => b.status !== "cancelled") || [];
  
  // Calculate Revenue (Safe parsing)
  const totalRevenue = activeBookings.reduce((sum: number, b: any) => {
    // Parse the saved pricingTotal, default to 0 if missing
    const price = parseFloat(b.pricingTotal) || 0;
    return sum + price;
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Booking Command Center</h1>
          <p className="text-slate-500">Manage schedule, revenue, and customer alerts.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border-l-4 border-green-500 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Est. Revenue</p>
                <h3 className="text-3xl font-black text-slate-900">${totalRevenue}</h3>
              </div>
              <div className="p-3 bg-green-50 rounded-full text-green-600"><DollarSign className="h-6 w-6" /></div>
            </div>
          </Card>
          <Card className="p-6 border-l-4 border-blue-500 shadow-sm">
             <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Active Jobs</p>
                <h3 className="text-3xl font-black text-slate-900">{activeBookings.length}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-full text-blue-600"><Calendar className="h-6 w-6" /></div>
            </div>
          </Card>
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {bookings?.slice().reverse().map((booking: any) => (
            <Card key={booking.id} className={`p-6 transition-all ${booking.status === 'cancelled' ? 'opacity-60 bg-slate-50' : 'hover:shadow-md border-l-4 border-blue-600'}`}>
              <div className="flex flex-col md:flex-row justify-between gap-4">
                
                {/* Left: Customer Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-900">{booking.name}</h3>
                    <Badge variant={booking.status === 'cancelled' ? 'destructive' : 'default'} className="uppercase text-[10px]">
                      {booking.status}
                    </Badge>
                    <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded text-xs">
                      ${booking.pricingTotal || "0"}
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{booking.preferredDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 flex items-center justify-center font-bold text-xs bg-slate-200 rounded-full">@</div>
                      <span>{booking.appointmentTime}</span>
                    </div>
                    <div className="flex items-center gap-2 md:col-span-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{booking.streetAddress}, {booking.city}</span>
                    </div>
                    <div className="md:col-span-2 mt-2">
                       <span className="font-bold text-xs text-slate-400 uppercase">Service Details:</span>
                       <p className="text-xs mt-1 bg-slate-100 p-2 rounded border">{booking.serviceType}</p>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                  {booking.status !== 'cancelled' && (
                    <>
                      <a href={`tel:${booking.phone}`}>
                        <Button variant="outline" size="sm" className="w-full">Call</Button>
                      </a>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => {
                           if(confirm("Cancel this booking? Email will be sent.")) cancelMutation.mutate(booking.id)
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
          
          {bookings?.length === 0 && (
             <div className="text-center py-12 text-slate-400">No bookings found.</div>
          )}
        </div>
      </div>
    </div>
  );
}