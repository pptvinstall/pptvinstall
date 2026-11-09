import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addDateKeyDays,
  atlantaDateKey,
  atlantaSlotInstant,
  isValidDateKey,
} from "../../shared/atlantaTime.ts";
import { generateICS } from "../../server/services/calendarService.ts";

test("Atlanta's local date, not UTC date, decides the booking day", () => {
  assert.equal(atlantaDateKey(new Date("2026-11-09T04:59:00Z")), "2026-11-08");
  assert.equal(atlantaDateKey(new Date("2026-11-09T05:00:00Z")), "2026-11-09");
  assert.equal(atlantaDateKey(new Date("2026-07-15T03:00:00Z")), "2026-07-14");
});

test("appointment instants respect Eastern standard and daylight time", () => {
  assert.equal(atlantaSlotInstant("2026-01-15", "5:30 PM").toISOString(), "2026-01-15T22:30:00.000Z");
  assert.equal(atlantaSlotInstant("2026-07-15", "5:30 PM").toISOString(), "2026-07-15T21:30:00.000Z");
  assert.equal(atlantaSlotInstant("2026-03-08", "11:00 AM").toISOString(), "2026-03-08T15:00:00.000Z");
  assert.equal(atlantaSlotInstant("2026-11-01", "11:00 AM").toISOString(), "2026-11-01T16:00:00.000Z");
});

test("date-only arithmetic safely crosses month and year boundaries", () => {
  assert.equal(addDateKeyDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDateKeyDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDateKeyDays("2026-03-01", -1), "2026-02-28");
  assert.equal(isValidDateKey("2026-02-29"), false);
  assert.equal(isValidDateKey("2028-02-29"), true);
  assert.equal(isValidDateKey("2026-13-01"), false);
  assert.throws(() => atlantaSlotInstant("2026-02-30", "5:30 PM"));
  assert.throws(() => atlantaSlotInstant("2026-07-15", "25:00 PM"));
});

test("generated calendar invites store actual UTC instants for Atlanta bookings", () => {
  const ics = generateICS({
    customerName: "Test Customer",
    customerEmail: "test@example.invalid",
    date: "2026-07-15",
    time: "5:30 PM",
    address: "Test Street",
    city: "Atlanta",
    zip: "30301",
    summary: "TV Mounting",
    total: 100,
  });
  assert.match(ics, /DTSTART:20260715T213000Z/);
  assert.match(ics, /DTEND:20260715T233000Z/);
});
