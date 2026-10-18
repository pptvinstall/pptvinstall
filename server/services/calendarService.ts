/**
 * All customer-facing appointment times are America/New_York wall-clock times
 * (stored as date "yyyy-MM-dd" + time like "5:30 PM").
 *
 * Calendar artifacts (Google Calendar template links, ICS downloads) must encode
 * the TRUE UTC instant. Stamping the local wall clock with a "Z" suffix shifts
 * every appointment by the ET offset (booking-20: 5:30 PM ET rendered as
 * 1:30 PM ET, a 4-hour error during daylight time).
 */
export const BUSINESS_TIME_ZONE = "America/New_York";

/**
 * UTC offset of `timeZone` at `instant`, in milliseconds.
 * Positive when the zone is ahead of UTC. Uses the Intl database so
 * daylight-saving transitions resolve correctly.
 */
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
 * `timeZone` (default America/New_York) and return the corresponding UTC instant.
 * Iterates so daylight-saving transitions settle on the correct offset.
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

function parseBookingDateTime(date: string, time: string): Date {
  // Bookings are stored as America/New_York wall-clock; resolve to the true UTC instant.
  return bookingWallTimeToUtc(date, time);
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Format a UTC instant as an ICS / Google-Calendar timestamp (YYYYMMDDTHHMMSSZ).
 * The input MUST already be a true UTC instant (e.g. from bookingWallTimeToUtc);
 * passing a local wall-clock Date here reintroduces the booking-20 timezone bug.
 */
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
    // A web booking is only acknowledged until a human confirms it — never CONFIRMED.
    "STATUS:TENTATIVE",
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
