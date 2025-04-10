import { Request, Response } from 'express';
import { db } from './db';
import logger from './logger';

// Define data types for analytics
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

/**
 * Generate analytics data from the events in the database
 * This is a simulated implementation since we don't have actual event tracking data
 */
export function getAnalyticsData(): AnalyticsData {
  // For the purposes of this implementation, we'll generate mock analytics data
  // In a real implementation, this would query a database table of tracked events
  
  // Last 30 days of dates
  const dates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 29 + i);
    return date.toISOString().split('T')[0];
  });
  
  // Total counts for each event type
  const totalViews = 2483;
  const totalLeads = 187;
  const totalContacts = 95;
  const totalSchedules = 62;
  
  // Daily event data - distribute total events across days with some randomness
  const dailyEvents = dates.map(date => {
    // Generate a weight for this day (random between 0.5 and 1.5)
    const dayWeight = 0.5 + Math.random();
    
    // Calculate roughly 1/30th of each total with some randomness
    const viewContent = Math.floor((totalViews / 30) * dayWeight);
    const lead = Math.floor((totalLeads / 30) * dayWeight);
    const contact = Math.floor((totalContacts / 30) * dayWeight);
    const schedule = Math.floor((totalSchedules / 30) * dayWeight);
    
    return {
      date,
      viewContent,
      lead,
      contact,
      schedule
    };
  });
  
  // Event counts for each event type
  const eventCounts: EventCount[] = [
    { event: 'ViewContent', count: totalViews },
    { event: 'Lead', count: totalLeads },
    { event: 'Contact', count: totalContacts },
    { event: 'Schedule', count: totalSchedules }
  ];
  
  // Conversion rates from different traffic sources
  const conversionRates: ConversionRate[] = [
    { source: 'facebook', rate: 0.052, count: 872 },
    { source: 'google', rate: 0.037, count: 1124 },
    { source: 'direct', rate: 0.024, count: 325 },
    { source: 'referral', rate: 0.038, count: 162 }
  ];
  
  // Overall conversion rate (ratio of conversions to views)
  const conversionRate = (totalLeads + totalContacts + totalSchedules) / totalViews;
  
  return {
    eventCounts,
    conversionRates,
    dailyEvents,
    totalViews,
    totalLeads,
    totalSchedules,
    totalContacts,
    conversionRate
  };
}

/**
 * Handle GET request for analytics data
 */
export async function handleGetAnalytics(req: Request, res: Response) {
  try {
    logger.info('Analytics data requested');
    const analyticsData = getAnalyticsData();
    res.json(analyticsData);
  } catch (error) {
    logger.error('Error fetching analytics data', { error });
    res.status(500).json({ error: 'Failed to retrieve analytics data' });
  }
}