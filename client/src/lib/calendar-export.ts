// Calendar export utilities for booking appointments

/** All appointment times are America/New_York wall-clock times. */
const BUSINESS_TIME_ZONE = "America/New_York";

function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - instant.getTime();
}

/**
 * Interpret a booking wall-clock (date "yyyy-MM-dd", time like "5:30 PM") in
 * America/New_York and return the true UTC instant. Never format a local
 * wall-clock Date with a "Z" suffix — that was the booking-20 calendar bug
 * (5:30 PM ET rendered as 1:30 PM ET in Google Calendar).
 */
export function bookingWallTimeToUtc(date: string, time: string, timeZone: string = BUSINESS_TIME_ZONE): Date {
  const [timePart, meridiemPart] = time.split(" ");
  const [hoursPart, minutesPart] = timePart.split(":");
  let hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  const meridiem = (meridiemPart || "").toUpperCase();

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const [year, month, day] = date.split("-").map(Number);
  const wallAsUtcMs = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);

  let instant = new Date(wallAsUtcMs - getTimeZoneOffsetMs(new Date(wallAsUtcMs), timeZone));
  for (let i = 0; i < 2; i++) {
    instant = new Date(wallAsUtcMs - getTimeZoneOffsetMs(instant, timeZone));
  }
  return instant;
}

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

// Format a UTC instant for ICS file (input must already be a true UTC instant)
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
    // A web booking is only acknowledged until a human confirms it — never CONFIRMED.
    'STATUS:TENTATIVE',
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
  // bookingData.appointmentTime is an America/New_York wall-clock like "5:30 PM".
  const startDate = bookingWallTimeToUtc(bookingData.preferredDate, bookingData.appointmentTime);
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
