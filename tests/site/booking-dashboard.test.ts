import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bookingEstimate,
  bookingMatchesFilter,
  bookingSortTime,
  getBookingBucket,
  summarizeBookingDashboard,
} from "../../client/src/lib/booking-dashboard.ts";

const atNoonInAtlanta = new Date("2026-11-09T17:00:00.000Z");

test("scheduled appointments remain actionable and old active jobs require follow-up", () => {
  assert.equal(getBookingBucket({ status: "active", preferredDate: "2026-11-09", appointmentTime: "6:30 PM" }, atNoonInAtlanta), "upcoming");
  assert.equal(getBookingBucket({ status: "active", preferredDate: "2026-10-22", appointmentTime: "5:30 PM" }, atNoonInAtlanta), "past_due");
  assert.equal(getBookingBucket({ status: "cancelled", preferredDate: "2026-11-27", appointmentTime: "5:30 PM" }, atNoonInAtlanta), "cancelled");
  assert.equal(getBookingBucket({ status: "completed", preferredDate: "2026-10-22", appointmentTime: "5:30 PM" }, atNoonInAtlanta), "completed");
});

test("in-progress window lasts two hours after the slot starts", () => {
  const booking = { status: "scheduled", preferredDate: "2026-11-09", appointmentTime: "6:30 PM" };
  assert.equal(getBookingBucket(booking, new Date("2026-11-09T23:30:00.000Z")), "in_progress");
  assert.equal(getBookingBucket(booking, new Date("2026-11-10T01:29:59.000Z")), "in_progress");
  assert.equal(getBookingBucket(booking, new Date("2026-11-10T01:30:00.000Z")), "past_due");
});

test("upcoming estimates exclude old active, cancelled, and completed jobs", () => {
  const bookings = [
    { status: "active", preferredDate: "2026-11-09", appointmentTime: "6:30 PM", pricingTotal: "200" },
    { status: "active", preferredDate: "2026-10-22", appointmentTime: "5:30 PM", pricingTotal: "109" },
    { status: "cancelled", preferredDate: "2026-11-27", appointmentTime: "5:30 PM", pricingTotal: "600" },
    { status: "completed", preferredDate: "2026-11-01", appointmentTime: "6:30 PM", pricingTotal: "450" },
  ];
  assert.deepEqual(summarizeBookingDashboard(bookings, atNoonInAtlanta), {
    upcomingJobs: 1,
    upcomingEstimate: 200,
    followUpsNeeded: 1,
    completedJobs: 1,
    cancelledJobs: 1,
  });
});

test("status filters keep cancelled history without showing it in action required", () => {
  assert.equal(bookingMatchesFilter("cancelled", "actionable"), false);
  assert.equal(bookingMatchesFilter("past_due", "actionable"), true);
  assert.equal(bookingMatchesFilter("cancelled", "all"), true);
  assert.equal(bookingMatchesFilter("past_due", "follow_up"), true);
  assert.equal(bookingMatchesFilter("completed", "follow_up"), false);
});

test("bad dates are flagged for review and dollar amounts are never presumed paid", () => {
  assert.equal(getBookingBucket({ status: "active", preferredDate: "2026-02-30", appointmentTime: "6:30 PM" }, atNoonInAtlanta), "needs_review");
  assert.equal(bookingEstimate("200.50"), 200.5);
  assert.equal(bookingEstimate("not-a-price"), 0);
  assert.equal(bookingEstimate("-20"), 0);
  assert.ok(bookingSortTime({ preferredDate: "2026-11-09", appointmentTime: "11:00 AM" })
    < bookingSortTime({ preferredDate: "2026-11-09", appointmentTime: "1:30 PM" }));
});
