/**
 * The business and its customers book in America/New_York, even when Render
 * executes in UTC. Keep wall-clock appointment strings separate from instants.
 */
const BUSINESS_TZ = "America/New_York";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TZ,
  timeZoneName: "shortOffset",
});

function parsedDateKey(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const instant = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    instant.getUTCFullYear() !== year ||
    instant.getUTCMonth() !== month - 1 ||
    instant.getUTCDate() !== day
  ) return null;
  return [year, month, day];
}

export function isValidDateKey(value: string): boolean {
  return parsedDateKey(value) !== null;
}

export function atlantaDateKey(at: Date = new Date()): string {
  const parts = dateFormatter.formatToParts(at);
  const get = (part: string): string => parts.find((p) => p.type === part)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDateKeyDays(value: string, days: number): string {
  const parts = parsedDateKey(value);
  if (!parts || !Number.isInteger(days)) throw new Error("Invalid calendar date");
  const [year, month, day] = parts;
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

/** Convert a displayed Atlanta appointment to a real UTC instant. */
export function atlantaSlotInstant(dateKey: string, slot: string): Date {
  const dateParts = parsedDateKey(dateKey);
  const timeParts = /^(1[0-2]|[1-9]):([0-5]\d) (AM|PM)$/.exec(slot);
  if (!dateParts || !timeParts) throw new Error("Invalid Atlanta appointment");
  const [year, month, day] = dateParts;

  let hour = Number(timeParts[1]) % 12;
  if (timeParts[3] === "PM") hour += 12;
  const minute = Number(timeParts[2]);

  // All booking slots are 11 AM or later; noon UTC is already past both US
  // daylight-saving clock changes (which happen at 2 AM local time).
  const reference = new Date(Date.UTC(year, month - 1, day, 12));
  const zone = offsetFormatter.formatToParts(reference).find((p) => p.type === "timeZoneName")?.value ?? "";
  const offsetMatch = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(zone);
  if (!offsetMatch) throw new Error("Could not determine Atlanta UTC offset");
  const eastOfUtcMinutes =
    (offsetMatch[1] === "+" ? 1 : -1) *
    (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3] ?? 0));

  return new Date(Date.UTC(year, month - 1, day, hour, minute) - eastOfUtcMinutes * 60000);
}
