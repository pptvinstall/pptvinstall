import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

// Colors for the charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface AnalyticsData {
  eventCounts: { event: string; count: number }[];
  conversionRates: { source: string; rate: number; count: number }[];
  dailyEvents: {
    date: string;
    viewContent: number;
    lead: number;
    contact: number;
    schedule: number;
  }[];
  totalViews: number;
  totalLeads: number;
  totalSchedules: number;
  totalContacts: number;
  conversionRate: number;
}

export function AnalyticsDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch analytics data from the API
  const { data, error, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/admin/analytics'],
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 290000 // Consider data stale after 4 minutes 50 seconds
  });

  // Show error toast if data fetching fails
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load analytics data. Please try again later.",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  // Calculate metrics
  const metricsData = [
    { name: "Page Views", value: data?.totalViews || 0, color: "#0088FE", icon: "👁️" },
    { name: "Leads Generated", value: data?.totalLeads || 0, color: "#00C49F", icon: "🎯" },
    { name: "Bookings", value: data?.totalSchedules || 0, color: "#FFBB28", icon: "📅" },
    { name: "Contact Form", value: data?.totalContacts || 0, color: "#FF8042", icon: "📝" }
  ];

  // Prepare data for the event distribution pie chart
  const eventDistribution = data?.eventCounts || [];

  // Prepare data for the conversion rate bar chart
  const conversionRates = data?.conversionRates || [];

  // Format data for line chart (daily trends)
  const dailyTrends = data?.dailyEvents || [];

  // Loading placeholder
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="p-4">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold mb-1">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Track Meta Pixel events and conversions from your website
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {metricsData.map((metric) => (
          <Card key={metric.name} className="overflow-hidden border-2 hover:border-blue-200 transition-all">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-lg flex items-center space-x-2">
                <span>{metric.icon}</span>
                <span>{metric.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-3xl font-bold" style={{ color: metric.color }}>
                {metric.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Rate</CardTitle>
          <CardDescription>
            Lead to booking conversion: {data?.conversionRate.toFixed(1)}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionRates}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis
                  label={{ 
                    value: 'Conversion Rate (%)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }}
                />
                <Tooltip 
                  formatter={(value: any) => [`${value}%`, 'Conversion Rate']}
                />
                <Legend />
                <Bar dataKey="rate" fill="#0088FE" name="Conversion Rate (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different chart views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="overview">Event Distribution</TabsTrigger>
          <TabsTrigger value="daily">Daily Trends</TabsTrigger>
          <TabsTrigger value="sources">Traffic Sources</TabsTrigger>
        </TabsList>

        {/* Event Distribution Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meta Pixel Event Distribution</CardTitle>
              <CardDescription>
                Distribution of events tracked via Meta Pixel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={eventDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="event"
                      label={({ name, percent }) => 
                        `${name}: ${(percent * 100).toFixed(1)}%`
                      }
                    >
                      {eventDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [value, 'Events']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Trends Tab */}
        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Event Trends</CardTitle>
              <CardDescription>
                Track how events change over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dailyTrends}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="viewContent"
                      stroke="#0088FE"
                      name="Page Views"
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="lead"
                      stroke="#00C49F"
                      name="Leads"
                    />
                    <Line
                      type="monotone"
                      dataKey="contact"
                      stroke="#FF8042"
                      name="Contact Forms"
                    />
                    <Line
                      type="monotone"
                      dataKey="schedule"
                      stroke="#FFBB28"
                      name="Bookings"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Traffic Sources Tab */}
        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <CardDescription>
                Lead generation by source
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={conversionRates}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="source" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" name="Leads" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="bg-slate-50 p-4 rounded-lg border">
        <h3 className="font-medium mb-2">About Meta Pixel Analytics</h3>
        <p className="text-sm text-slate-600">
          This dashboard displays analytics data collected via Meta Pixel tracking. 
          The data helps track user engagement, measure conversion rates, and optimize your Facebook ad campaigns.
          Events tracked include page views, lead generation, form submissions, and successful bookings.
        </p>
      </div>
    </div>
  );
}