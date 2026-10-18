import assert from "node:assert/strict";
import test from "node:test";
import {
  addHours,
  bookingWallTimeToUtc,
  formatICSDate,
  generateICS,
  parseBookingDateTime,
} from "../../server/services/calendarService";
import { bookingWallTimeToUtc as clientBookingWallTimeToUtc } from "../../client/src/lib/calendar-export";

// Booking-20 incident: the "Add to Google Calendar" link encoded the
// America/New_York wall clock with a literal "Z" suffix, so a 5:30 PM ET
// appointment rendered as 1:30 PM ET (4-hour shift during daylight time).

test("booking-20 regression: Oct 22 2026 5:30 PM ET encodes as 20261022T213000Z", () => {
  const stamp = formatICSDate(bookingWallTimeToUtc("2026-10-22", "5:30 PM"));
  assert.equal(stamp, "20261022T213000Z");
  assert.notEqual(stamp, "20261022T173000Z");
});

test("Google Calendar dates param spans the 2-hour window in UTC", () => {
  const start = parseBookingDateTime("2026-10-22", "5:30 PM");
  const end = addHours(start, 2);
  assert.equal(`${formatICSDate(start)}/${formatICSDate(end)}`, "20261022T213000Z/20261022T233000Z");
});

test("winter date uses EST (UTC-5)", () => {
  assert.equal(formatICSDate(bookingWallTimeToUtc("2026-01-15", "5:30 PM")), "20260115T223000Z");
});

test("DST boundaries resolve to the correct offset", () => {
  // 2026: spring forward Mar 8, fall back Nov 1.
  assert.equal(formatICSDate(bookingWallTimeToUtc("2026-03-08", "5:30 PM")), "20260308T213000Z");
  assert.equal(formatICSDate(bookingWallTimeToUtc("2026-11-01", "5:30 PM")), "20261101T223000Z");
});

test("midnight/noon edge cases", () => {
  assert.equal(formatICSDate(bookingWallTimeToUtc("2026-10-22", "12:00 AM")), "20261022T040000Z");
  assert.equal(formatICSDate(bookingWallTimeToUtc("2026-10-22", "12:00 PM")), "20261022T160000Z");
});

test("ICS download has UTC-correct DTSTART/DTEND and is TENTATIVE, not CONFIRMED", () => {
  const ics = generateICS({
    customerName: "Test Customer",
    customerEmail: "test@example.com",
    date: "2026-10-22",
    time: "5:30 PM",
    address: "1121 Hampton Ridge Rd",
    city: "Norcross",
    zip: "30093",
    summary: "Standard TV Mounting",
    total: 109,
  });
  assert.ok(ics.includes("DTSTART:20261022T213000Z"));
  assert.ok(ics.includes("DTEND:20261022T233000Z"));
  assert.ok(!ics.includes("DTSTART:20261022T173000Z"));
  assert.ok(ics.includes("STATUS:TENTATIVE"));
  assert.ok(!ics.includes("STATUS:CONFIRMED"));
});

test("client calendar-export resolves the same UTC instant", () => {
  const stamp = clientBookingWallTimeToUtc("2026-10-22", "5:30 PM").toISOString();
  assert.equal(stamp, "2026-10-22T21:30:00.000Z");
});
