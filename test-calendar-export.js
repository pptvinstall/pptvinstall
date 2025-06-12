// Test calendar export functionality
import { createCalendarEvent, generateICSContent } from './client/src/lib/calendar-export.js';

const sampleBooking = {
  customerName: "John Smith",
  email: "john@example.com",
  phone: "404-555-0123",
  preferredDate: "2025-06-15",
  appointmentTime: "2:00 PM",
  streetAddress: "123 Peachtree St",
  city: "Atlanta",
  state: "GA",
  zipCode: "30309",
  pricingTotal: 299,
  notes: "Large TV installation in living room",
  tvInstallations: [{ size: "large", mountType: "wall" }],
  smartHomeInstallations: [{ deviceType: "Smart Thermostat", location: "Hallway" }]
};

try {
  console.log('Testing calendar export functionality...');
  const calendarEvent = createCalendarEvent(sampleBooking);
  const icsContent = generateICSContent(calendarEvent);
  
  console.log('✅ Calendar event created successfully');
  console.log('Event title:', calendarEvent.title);
  console.log('Start time:', calendarEvent.startDate.toISOString());
  console.log('End time:', calendarEvent.endDate.toISOString());
  console.log('Location:', calendarEvent.location);
  console.log('\n📅 ICS Content Preview:');
  console.log(icsContent.substring(0, 500) + '...');
  
} catch (error) {
  console.error('❌ Calendar export test failed:', error);
}