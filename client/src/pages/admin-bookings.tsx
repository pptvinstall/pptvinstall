import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Clock, Search, ShieldAlert, Trash2, Edit, TrendingUp, Users, Inbox, X, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ADMIN_TOKEN_SESSION_KEY = "admin_api_token";

function formatPhoneNumber(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  const tenDigits = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (tenDigits.length !== 10) return value || "No phone";
  return `(${tenDigits.slice(0, 3)}) ${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`;
}

function formatBirthday(value?: string | null) {
  if (!value) return "Not provided";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = match
    ? new Date(2026, Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "MMM d");
}

function formatCrmDate(value?: string | null) {
  if (!value) return "None yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "MMM d, yyyy");
}

function formatStatus(value?: string | null) {
  if (!value) return "Unknown";
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function AdminBookings() {
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY) || "");
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY)));
  const [passcode, setPasscode] = useState("");

  function unlockDashboard() {
    const token = passcode.trim();
    if (!token) return;
    sessionStorage.setItem(ADMIN_TOKEN_SESSION_KEY, token);
    setAdminToken(token);
    setIsAuthenticated(true);
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto bg-slate-700 p-3 rounded-full w-fit mb-4">
               <ShieldAlert className="h-8 w-8 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Admin Access</h2>
            <Input 
              type="password" 
              placeholder="Enter Access Code" 
              className="bg-slate-900 border-slate-600 text-white"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && unlockDashboard()}
            />
            <Button className="w-full bg-blue-600 hover:bg-blue-500" onClick={unlockDashboard}>
              Unlock Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <DashboardContent adminToken={adminToken} />;
}

function DashboardContent({ adminToken }: { adminToken: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [rescheduleBooking, setRescheduleBooking] = useState<any>(null);

  async function adminRequest(method: string, url: string, data?: unknown) {
    const headers: Record<string, string> = { "x-admin-token": adminToken };
    let body: string | undefined;
    if (data !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }

    const response = await fetch(url, { method, headers, body, credentials: "include" });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message || response.statusText);
    }
    return response;
  }

  const { data: bookings = [] } = useQuery({
    queryKey: ["/api/admin/bookings"],
    queryFn: async () => {
      const res = await adminRequest("GET", "/api/admin/bookings");
      return res.json();
    },
  });

  const { data: customerResponse = { customers: [] } } = useQuery({
    queryKey: ["/api/admin/customers"],
    queryFn: async () => {
      const res = await adminRequest("GET", "/api/admin/customers");
      return res.json();
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, date, time }: { id: number, date: string, time: string }) => {
      await adminRequest("POST", `/api/admin/bookings/${id}/reschedule`, { date, time });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({ title: "Updated!", description: "Customer has been emailed." });
      setRescheduleBooking(null);
    },
    onError: (error) => {
      toast({
        title: "Could not move appointment",
        description: error instanceof Error ? error.message : "Failed to update.",
        variant: "destructive",
      });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      await adminRequest("POST", `/api/admin/bookings/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({ title: "Cancelled", description: "Booking cancelled & email sent." });
    }
  });

  // SAFETY CHECK: Ensure we don't process null/undefined bookings
  const safeBookings = Array.isArray(bookings) ? bookings.filter(b => b && typeof b === 'object') : [];

  const filteredBookings = safeBookings.filter((b: any) => 
    (b.name || "").toLowerCase().includes(search.toLowerCase()) || 
    (b.email || "").toLowerCase().includes(search.toLowerCase())
  ).sort((a: any, b: any) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  const totalRevenue = filteredBookings.filter((b: any) => b.status !== 'cancelled').reduce((acc: number, b: any) => acc + (parseInt(b.pricingTotal) || 0), 0);
  const activeJobs = filteredBookings.filter((b: any) => b.status !== 'cancelled').length;
  const safeCustomers = Array.isArray(customerResponse.customers) ? customerResponse.customers : [];
  const crmStats = {
    total: safeCustomers.length,
    emailOptIns: safeCustomers.filter((customer: any) => customer.emailMarketingOptIn).length,
    transactionalSmsOptIns: safeCustomers.filter((customer: any) => customer.transactionalSmsOptIn).length,
    smsOptIns: safeCustomers.filter((customer: any) => customer.smsMarketingOptIn).length,
    birthdayOptIns: safeCustomers.filter((customer: any) => customer.birthdayPromoOptIn).length,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 relative">
       <div className="max-w-6xl mx-auto space-y-8">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
             <h1 className="text-3xl font-bold text-slate-900">Booking Command Center</h1>
             <p className="text-slate-500">Manage schedule, revenue, and customer alerts.</p>
           </div>
           <div className="flex gap-2">
             <Card className="p-4 flex items-center gap-3 border-blue-100 bg-blue-50">
               <div className="p-2 bg-blue-100 rounded-full text-blue-600"><TrendingUp className="h-5 w-5"/></div>
               <div>
                 <div className="text-xs text-slate-500 font-bold uppercase">Est. Revenue</div>
                 <div className="text-lg font-black text-slate-900">${totalRevenue}</div>
               </div>
             </Card>
             <Card className="p-4 flex items-center gap-3 border-slate-200">
               <div className="p-2 bg-slate-100 rounded-full text-slate-600"><Users className="h-5 w-5"/></div>
               <div>
                 <div className="text-xs text-slate-500 font-bold uppercase">Active Jobs</div>
                 <div className="text-lg font-black text-slate-900">{activeJobs}</div>
               </div>
             </Card>
           </div>
         </div>

         <div className="relative">
           <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
           <Input 
             placeholder="Search name or email..." 
             className="pl-9 bg-white shadow-sm border-slate-200" 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
         </div>

         {filteredBookings.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
             <div className="bg-slate-50 p-4 rounded-full w-fit mx-auto mb-4">
               <Inbox className="h-10 w-10 text-slate-400" />
             </div>
             <h3 className="text-lg font-bold text-slate-900">No bookings found</h3>
             <p className="text-slate-500 max-w-sm mx-auto mt-2">
               {search ? "Try adjusting your search terms." : "New appointments will appear here once customers book a slot."}
             </p>
           </div>
         ) : (
           <div className="grid gap-4">
             {filteredBookings.map((booking: any) => {
               // SAFETY CHECK: If booking ID is missing, skip rendering this card
               if (!booking || !booking.id) return null;

               return (
                 <Card key={booking.id} className="overflow-hidden hover:shadow-md transition-all border-slate-200">
                   <div className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                     <div className="space-y-2">
                       <div className="flex items-center gap-3">
                         <span className="font-bold text-lg text-slate-900">{booking.name}</span>
                         {booking.status === 'cancelled' 
                            ? <Badge variant="destructive">Cancelled</Badge> 
                            : <Badge className="bg-green-600 hover:bg-green-600">Active</Badge>}
                         <span className="text-sm font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">${booking.pricingTotal}</span>
                       </div>
                       <div className="text-sm text-slate-500 flex flex-wrap gap-4">
                         <span className="flex items-center gap-1"><CalendarIcon className="h-4 w-4 text-blue-500"/> {booking.preferredDate}</span>
                         <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-blue-500"/> {booking.appointmentTime}</span>
                       </div>
                       <div className="text-xs text-slate-400 font-medium">
                         {booking.serviceType} • {booking.streetAddress}, {booking.city}
                       </div>
                     </div>

                     {booking.status !== 'cancelled' && (
                       <div className="flex gap-2 w-full md:w-auto">
                         <Button 
                           variant="outline" 
                           size="sm" 
                           className="flex-1 md:flex-none border-blue-200 text-blue-700 hover:bg-blue-50"
                           onClick={() => setRescheduleBooking(booking)}
                         >
                           <Edit className="h-4 w-4 mr-2"/> Move
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="sm"
                           className="flex-1 md:flex-none text-red-600 hover:text-red-700 hover:bg-red-50"
                           onClick={() => {
                             if(confirm("Are you sure? This will email the customer.")) cancelMutation.mutate(booking.id);
                           }}
                         >
                           <Trash2 className="h-4 w-4 mr-2"/> Cancel
                         </Button>
                       </div>
                     )}
                   </div>
                 </Card>
               );
             })}
           </div>
         )}

         <div className="space-y-4">
           <div>
             <h2 className="text-2xl font-bold text-slate-900">Customer CRM</h2>
             <p className="text-sm text-slate-500">Marketing consent is stored only. No bulk marketing sends are enabled.</p>
           </div>
           <div className="grid gap-3 md:grid-cols-5">
             {[
               { label: "CRM Contacts", value: crmStats.total },
               { label: "Email Opt-ins", value: crmStats.emailOptIns },
               { label: "Appt SMS Opt-ins", value: crmStats.transactionalSmsOptIns },
               { label: "Marketing SMS Opt-ins", value: crmStats.smsOptIns },
               { label: "Birthday Opt-ins", value: crmStats.birthdayOptIns },
             ].map((stat) => (
               <Card key={stat.label} className="border-slate-200 bg-white p-4">
                 <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{stat.label}</p>
                 <p className="mt-1 text-2xl font-black text-slate-900">{stat.value}</p>
               </Card>
             ))}
           </div>
           {safeCustomers.length === 0 ? (
             <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
               CRM customers will appear here after bookings are submitted.
             </div>
           ) : (
             <div className="grid gap-3">
               {safeCustomers.map((customer: any) => (
                 <Card key={customer.id} className="border-slate-200 bg-white p-5 shadow-sm">
                   <div className="grid gap-5 lg:grid-cols-[1.2fr,1fr,1fr]">
                     <div className="space-y-2">
                       <p className="text-lg font-bold text-slate-900">{customer.name || "Unnamed contact"}</p>
                       <div className="grid gap-1 text-sm text-slate-600">
                         <p><span className="font-semibold text-slate-800">Phone:</span> {formatPhoneNumber(customer.phone)}</p>
                         <p><span className="font-semibold text-slate-800">Email:</span> {customer.email || "No email"}</p>
                         <p><span className="font-semibold text-slate-800">City/area:</span> {customer.cityArea || "Not provided"}</p>
                         <p><span className="font-semibold text-slate-800">Birthday:</span> {formatBirthday(customer.birthday)}</p>
                       </div>
                     </div>
                     <div className="space-y-2">
                       <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Consent</p>
                       <div className="flex flex-wrap gap-2">
                         <Badge className={customer.emailMarketingOptIn ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-slate-100 text-slate-500 hover:bg-slate-100"}>Email {customer.emailMarketingOptIn ? "opt-in" : "no opt-in"}</Badge>
                         <Badge className={customer.transactionalSmsOptIn ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-slate-100 text-slate-500 hover:bg-slate-100"}>Appt SMS {customer.transactionalSmsOptIn ? "opt-in" : "no opt-in"}</Badge>
                         <Badge className={customer.smsMarketingOptIn ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-slate-100 text-slate-500 hover:bg-slate-100"}>Marketing SMS {customer.smsMarketingOptIn ? "opt-in" : "no opt-in"}</Badge>
                         <Badge className={customer.birthdayPromoOptIn ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-slate-100 text-slate-500 hover:bg-slate-100"}>Birthday {customer.birthdayPromoOptIn ? "opt-in" : "no opt-in"}</Badge>
                       </div>
                       <div className="grid gap-1 text-sm text-slate-600">
                         <p><span className="font-semibold text-slate-800">SMS reachable:</span> {formatStatus(customer.smsReachableStatus)}</p>
                         <p><span className="font-semibold text-slate-800">SMS opt-out:</span> {formatCrmDate(customer.transactionalSmsOptOutAt)}</p>
                       </div>
                     </div>
                     <div className="space-y-2 text-sm text-slate-600">
                       <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Latest Booking</p>
                       <p><span className="font-semibold text-slate-800">Date:</span> {formatCrmDate(customer.latestBookingDate)}</p>
                       <p><span className="font-semibold text-slate-800">Service:</span> {customer.latestBookingService || "No service recorded"}</p>
                       <p><span className="font-semibold text-slate-800">Latest SMS:</span> {customer.latestSmsStatus ? `${formatStatus(customer.latestSmsStatus)} (${formatStatus(customer.latestSmsMessageType)})` : "No SMS yet"}</p>
                     </div>
                   </div>
                 </Card>
               ))}
             </div>
           )}
         </div>
       </div>

       {rescheduleBooking && (
         <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 relative">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
               <h3 className="font-bold text-lg text-slate-900">Reschedule Appointment</h3>
               <button onClick={() => setRescheduleBooking(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                 <X className="h-5 w-5" />
               </button>
             </div>
             <div className="p-6">
               <RescheduleForm booking={rescheduleBooking} onSubmit={(data: any) => rescheduleMutation.mutate(data)} />
             </div>
           </div>
         </div>
       )}
    </div>
  );
}

function getAdminTimeSlots(date?: Date) {
  if (!date) return [];
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  if (!isWeekend) {
    return ["5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM"];
  }

  const slots: string[] = [];
  for (let hour = 11; hour <= 19; hour += 1) {
    slots.push(format(new Date(2026, 0, 1, hour, 0), "h:mm a"));
    if (hour < 19) {
      slots.push(format(new Date(2026, 0, 1, hour, 30), "h:mm a"));
    }
  }
  return slots;
}

function RescheduleForm({ booking, onSubmit }: any) {
  const [date, setDate] = useState<Date | undefined>(() => {
    if (!booking?.preferredDate) return new Date();
    return new Date(booking.preferredDate + 'T12:00:00');
  });
  
  const initialSlots = getAdminTimeSlots(date);
  const [time, setTime] = useState(
    initialSlots.includes(booking?.appointmentTime) ? booking.appointmentTime : initialSlots[0] || "",
  );

  useEffect(() => {
    const validSlots = getAdminTimeSlots(date);
    if (!validSlots.includes(time)) {
      setTime(validSlots[0] || "");
    }
  }, [date, time]);

  const timeSlots = getAdminTimeSlots(date);

  return (
    <div className="space-y-6">
       <div className="border rounded-lg p-2 flex justify-center bg-white shadow-sm">
         <Calendar 
            mode="single" 
            selected={date} 
            onSelect={setDate}
            disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
            className="rounded-md"
         />
       </div>
       <div className="space-y-2">
         <label className="text-sm font-bold text-slate-700">Select New Time</label>
         <div className="relative">
           <select 
             value={time} 
             onChange={(e) => setTime(e.target.value)}
             className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer font-medium text-slate-700"
           >
              {timeSlots.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
           </select>
           <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
         </div>
       </div>
       <Button className="w-full bg-blue-600 text-white hover:bg-blue-700 h-12 text-lg shadow-lg" onClick={() => {
         if(date && time && booking?.id) onSubmit({ id: booking.id, date: format(date, 'yyyy-MM-dd'), time });
       }}>
         Confirm New Time
       </Button>
    </div>
  )
}
