import { db } from './db';
import { Request, Response } from 'express';
import { logger } from './services/loggingService';

interface EventCount {
  event: string;
  count: number;
}

interface ConversionRate {
  source: string;
  rate: number;
  count: number;
}

interface AnalyticsData {
  eventCounts: EventCount[];
  conversionRates: ConversionRate[];
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

// Mock data - In a real application, this would be fetched from the Meta Pixel API
// or a database where your application stores tracking data
export function getAnalyticsData(): AnalyticsData {
  // Generate some sample data
  const today = new Date();
  const dailyEvents = [];
  
  // Generate last 14 days of data
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Generate some random but realistic data
    const viewContent = Math.floor(Math.random() * 30) + 20; // 20-50 views per day
    const lead = Math.floor(viewContent * (Math.random() * 0.2 + 0.1)); // 10-30% conversion
    const contact = Math.floor(viewContent * (Math.random() * 0.15 + 0.05)); // 5-20% conversion
    const schedule = Math.floor(lead * (Math.random() * 0.4 + 0.3)); // 30-70% of leads schedule
    
    dailyEvents.push({
      date: date.toISOString().split('T')[0],
      viewContent,
      lead,
      contact,
      schedule
    });
  }
  
  // Calculate totals
  const totalViews = dailyEvents.reduce((sum, day) => sum + day.viewContent, 0);
  const totalLeads = dailyEvents.reduce((sum, day) => sum + day.lead, 0);
  const totalSchedules = dailyEvents.reduce((sum, day) => sum + day.schedule, 0);
  const totalContacts = dailyEvents.reduce((sum, day) => sum + day.contact, 0);
  
  // Overall conversion rate (leads to bookings)
  const conversionRate = totalLeads > 0 ? (totalSchedules / totalLeads) * 100 : 0;
  
  return {
    eventCounts: [
      { event: 'ViewContent', count: totalViews },
      { event: 'Lead', count: totalLeads },
      { event: 'Schedule', count: totalSchedules },
      { event: 'Contact', count: totalContacts }
    ],
    conversionRates: [
      { source: 'Direct', rate: 8.2, count: Math.floor(totalLeads * 0.35) },
      { source: 'Google', rate: 6.8, count: Math.floor(totalLeads * 0.25) },
      { source: 'Facebook', rate: 10.5, count: Math.floor(totalLeads * 0.4) }
    ],
    dailyEvents,
    totalViews,
    totalLeads,
    totalSchedules,
    totalContacts,
    conversionRate
  };
}

export async function handleGetAnalytics(req: Request, res: Response) {
  try {
    const analyticsData = getAnalyticsData();
    res.json(analyticsData);
  } catch (error) {
    logger.error('Error fetching analytics data', error as Error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
}