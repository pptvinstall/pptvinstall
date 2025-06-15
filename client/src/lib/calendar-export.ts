// Calendar export utilities for booking appointments

export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  organizer?: {
    name: string;
    email: string;
  };
  attendee?: {
    name: string;
    email: string;
  };
}

// Format date for ICS file
const formatICSDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

// Generate ICS content
export const generateICSContent = (event: CalendarEvent): string => {
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Picture Perfect TV Install//Booking System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:booking-${Date.now()}@pictureperfe.ct`,
    `DTSTART:${formatICSDate(event.startDate)}`,
    `DTEND:${formatICSDate(event.endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    `DTSTAMP:${formatICSDate(new Date())}`,
    event.organizer ? `ORGANIZER;CN=${event.organizer.name}:mailto:${event.organizer.email}` : '',
    event.attendee ? `ATTENDEE;CN=${event.attendee.name};RSVP=TRUE:mailto:${event.attendee.email}` : '',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'DESCRIPTION:Reminder: TV Installation appointment in 1 hour',
    'ACTION:DISPLAY',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'DESCRIPTION:Reminder: TV Installation appointment tomorrow',
    'ACTION:DISPLAY',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line !== '').join('\r\n');

  return icsContent;
};

// Create downloadable ICS file
export const downloadICSFile = (event: CalendarEvent, filename?: string): void => {
  const icsContent = generateICSContent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

// Generate Google Calendar URL
export const generateGoogleCalendarURL = (event: CalendarEvent): string => {
  const baseURL = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatICSDate(event.startDate)}/${formatICSDate(event.endDate)}`,
    details: event.description,
    location: event.location,
    sprop: 'website:pictureperfe.ct'
  });
  
  return `${baseURL}?${params.toString()}`;
};

// Generate Outlook Calendar URL
export const generateOutlookCalendarURL = (event: CalendarEvent): string => {
  const baseURL = 'https://outlook.live.com/calendar/0/deeplink/compose';
  const params = new URLSearchParams({
    subject: event.title,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
    body: event.description,
    location: event.location
  });
  
  return `${baseURL}?${params.toString()}`;
};

// Create calendar event from booking data
export const createCalendarEvent = (bookingData: any): CalendarEvent => {
  const startDate = new Date(`${bookingData.preferredDate}T${convertTo24Hour(bookingData.appointmentTime)}`);
  const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000)); // 2 hours duration

  const servicesList = [];
  if (bookingData.tvInstallations?.length > 0) {
    servicesList.push(`${bookingData.tvInstallations.length} TV installation(s)`);
  }
  if (bookingData.smartHomeInstallations?.length > 0) {
    servicesList.push(`${bookingData.smartHomeInstallations.length} smart home device(s)`);
  }

  const description = [
    `TV Installation & Smart Home Service Appointment`,
    ``,
    `Customer: ${bookingData.name}`,
    `Phone: ${bookingData.phone}`,
    `Email: ${bookingData.email}`,
    ``,
    `Services: ${servicesList.join(', ')}`,
    `Total: $${bookingData.pricingTotal || 0}`,
    ``,
    bookingData.notes ? `Notes: ${bookingData.notes}` : '',
    ``,
    `Please arrive 10 minutes early and bring necessary tools.`,
    `Contact customer if running late: ${bookingData.phone}`
  ].filter(line => line !== undefined).join('\n');

  return {
    title: `TV Installation - ${bookingData.name}`,
    description,
    location: `${bookingData.streetAddress}, ${bookingData.city}, ${bookingData.state} ${bookingData.zipCode}`,
    startDate,
    endDate,
    organizer: {
      name: 'Picture Perfect TV Install',
      email: 'PPTVInstall@gmail.com'
    },
    attendee: {
      name: bookingData.name,
      email: bookingData.email
    }
  };
};

// Helper function to convert 12-hour time to 24-hour format
const convertTo24Hour = (time12h: string): string => {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = '00';
  }
  
  if (modifier === 'PM') {
    hours = String(parseInt(hours, 10) + 12);
  }
  
  return `${hours}:${minutes}:00`;
};