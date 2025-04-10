import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// Define types for analytics data
type EventCount = {
  event: string;
  count: number;
};

type ConversionRate = {
  source: string;
  rate: number;
  count: number;
};

type DailyEvent = {
  date: string;
  viewContent: number;
  lead: number;
  contact: number;
  schedule: number;
};

type AnalyticsData = {
  eventCounts: EventCount[];
  conversionRates: ConversionRate[];
  dailyEvents: DailyEvent[];
  totalViews: number;
  totalLeads: number;
  totalSchedules: number;
  totalContacts: number;
  conversionRate: number;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a57cff', '#ff7c7c'];

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['/api/admin/analytics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track website performance and user behavior</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track website performance and user behavior</p>
        </div>
        <Card className="p-8 text-center">
          <div className="text-destructive text-xl font-semibold mb-2">Error Loading Analytics</div>
          <p className="text-muted-foreground">
            There was an error loading your analytics data. Please try again later.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track website performance and user behavior</p>
        </div>
        <Card className="p-8 text-center">
          <div className="text-xl font-semibold mb-2">No Analytics Data Available</div>
          <p className="text-muted-foreground">
            There is no analytics data available yet. Start tracking Meta Pixel events to populate this dashboard.
          </p>
        </Card>
      </div>
    );
  }

  // Format daily events data for the line chart
  const lineChartData = data.dailyEvents.map((day) => ({
    date: day.date,
    'Page Views': day.viewContent,
    'Leads': day.lead,
    'Contact Requests': day.contact,
    'Bookings': day.schedule,
  }));

  // Format event counts data for the bar chart
  const eventData = data.eventCounts.map((event) => ({
    name: event.event === 'ViewContent' ? 'Page Views' :
          event.event === 'Lead' ? 'Leads' :
          event.event === 'Contact' ? 'Contact Requests' : 
          event.event === 'Schedule' ? 'Bookings' : event.event,
    value: event.count,
  }));

  // Format conversion rates data for the pie chart
  const conversionData = data.conversionRates.map((source) => ({
    name: source.source === 'direct' ? 'Direct Traffic' :
          source.source === 'facebook' ? 'Facebook' :
          source.source === 'google' ? 'Google' :
          source.source === 'referral' ? 'Referral' : source.source,
    value: source.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Meta Pixel insights and conversion tracking</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Event Tracking</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Page Views
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.totalViews.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tracked with Meta Pixel ViewContent events
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lead Submissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.totalLeads.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Users who submitted contact forms
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Booking Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.totalSchedules.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Users who completed booking
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Conversion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{(data.conversionRate * 100).toFixed(2)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Visitors who completed an action
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Overview line chart */}
          <Card>
            <CardHeader>
              <CardTitle>Events Over Time</CardTitle>
              <CardDescription>
                Meta Pixel event tracking by date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={lineChartData}
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
                    <Line type="monotone" dataKey="Page Views" stroke="#0088FE" strokeWidth={2} />
                    <Line type="monotone" dataKey="Leads" stroke="#00C49F" strokeWidth={2} />
                    <Line type="monotone" dataKey="Contact Requests" stroke="#FFBB28" strokeWidth={2} />
                    <Line type="monotone" dataKey="Bookings" stroke="#FF8042" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Meta Pixel Event Distribution</CardTitle>
              <CardDescription>
                Breakdown of all tracked events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={eventData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Event Count" fill="#8884d8">
                      {eventData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Event Definitions</CardTitle>
                <CardDescription>
                  Explanation of tracked Meta Pixel events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">ViewContent</h3>
                    <p className="text-sm text-muted-foreground">
                      Triggered when a user views a page on your website.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Lead</h3>
                    <p className="text-sm text-muted-foreground">
                      Triggered when a user submits a contact form or signs up.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Contact</h3>
                    <p className="text-sm text-muted-foreground">
                      Triggered when a user initiates contact through any method.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Schedule</h3>
                    <p className="text-sm text-muted-foreground">
                      Triggered when a user books an appointment or service.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Value</CardTitle>
                <CardDescription>
                  Relative importance of different events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>ViewContent</span>
                    <div className="w-2/3 bg-muted rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Lead</span>
                    <div className="w-2/3 bg-muted rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: '50%' }}></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Contact</span>
                    <div className="w-2/3 bg-muted rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Schedule</span>
                    <div className="w-2/3 bg-muted rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversions" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Conversion Rates</CardTitle>
                <CardDescription>
                  Percentage of visitors who complete key actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.conversionRates.map((source, index) => (
                    <div key={index} className="flex flex-col">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">
                          {source.source === 'direct' ? 'Direct Traffic' :
                           source.source === 'facebook' ? 'Facebook' :
                           source.source === 'google' ? 'Google' :
                           source.source === 'referral' ? 'Referral' : source.source}
                        </span>
                        <span className="text-sm font-medium">{(source.rate * 100).toFixed(2)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${Math.min(source.rate * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>
                  User journey from view to booking
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-8">
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className="text-center w-full">
                        <div className="bg-primary/10 rounded-lg py-3 font-medium">
                          Page Views
                        </div>
                        <div className="font-bold mt-1 text-xl">{data.totalViews.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="h-8 flex justify-center">
                      <div className="w-0.5 h-full bg-border"></div>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className="text-center w-full">
                        <div className="bg-primary/20 rounded-lg py-3 font-medium">
                          Leads &amp; Contacts
                        </div>
                        <div className="font-bold mt-1 text-xl">
                          {(data.totalLeads + data.totalContacts).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="h-8 flex justify-center">
                      <div className="w-0.5 h-full bg-border"></div>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className="text-center w-full">
                        <div className="bg-primary/30 rounded-lg py-3 font-medium">
                          Bookings
                        </div>
                        <div className="font-bold mt-1 text-xl">{data.totalSchedules.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
                <CardDescription>
                  Where your visitors are coming from
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={conversionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {conversionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Facebook Performance</CardTitle>
                <CardDescription>
                  Meta Pixel tracking results from Facebook
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Visitors from Facebook
                    </h3>
                    <div className="text-2xl font-bold">
                      {(data.conversionRates
                        .find(r => r.source === 'facebook')?.count || 0).toLocaleString()}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Facebook Conversion Rate
                    </h3>
                    <div className="text-2xl font-bold">
                      {((data.conversionRates
                        .find(r => r.source === 'facebook')?.rate || 0) * 100).toFixed(2)}%
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="font-medium mb-2">
                      Facebook Ad Performance
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your Facebook Ads account to view detailed ad performance metrics alongside your Meta Pixel data.
                    </p>
                    <Button variant="outline" className="mt-4" disabled>
                      Connect Facebook Ads
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}