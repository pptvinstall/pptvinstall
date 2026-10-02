function parseBookingDateTime(date: string, time: string): Date {
  const [timePart, meridiemPart] = time.split(" ");
  const [hoursPart, minutesPart] = timePart.split(":");
  let hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  const meridiem = meridiemPart.toUpperCase();

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function generateICS(booking: {
  customerName: string;
  customerEmail: string;
  date: string;
  time: string;
  address: string;
  city: string;
  zip: string;
  summary: string;
  total: number;
}) {
  const start = parseBookingDateTime(booking.date, booking.time);
  const end = addHours(start, 2);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Picture Perfect TV Install//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:pptvinstall-${booking.date}-${Date.now()}@pptvinstall.com`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    "SUMMARY:TV Install - Picture Perfect TV Install",
    `DESCRIPTION:Services: ${booking.summary.replace(/\n/g, "\\n")}\\nEstimated Total: $${booking.total}\\nQuestions? Call 404-702-4748`,
    `LOCATION:${booking.address}, ${booking.city}, GA ${booking.zip}`,
    "ORGANIZER;CN=Picture Perfect TV Install:mailto:pptvinstall@gmail.com",
    `ATTENDEE;CN=${booking.customerName}:mailto:${booking.customerEmail}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:TV Install appointment in 2 hours",
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:TV Install appointment tomorrow",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export { addHours, formatICSDate, parseBookingDateTime };
