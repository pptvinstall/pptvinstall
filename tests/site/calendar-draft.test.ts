import assert from "node:assert/strict";
import { test } from "node:test";
import { googleCalendarDraftUrl } from "../../client/src/lib/booking-dashboard.ts";

test("calendar draft uses correct winter Eastern to UTC time and clearly labels estimate", () => {
  const url = googleCalendarDraftUrl({
    name: "Test Customer", serviceType: "Mount one TV", preferredDate: "2026-11-09",
    appointmentTime: "6:30 PM", pricingTotal: "200", streetAddress: "Example Street",
    city: "Marietta", state: "GA", zipCode: "30060",
  });
  assert.ok(url);
  const parsed = new URL(url);
  assert.equal(parsed.origin, "https://calendar.google.com");
  assert.equal(parsed.searchParams.get("dates"), "20261109T233000Z/20261110T013000Z");
  assert.equal(parsed.searchParams.get("location"), "Example Street, Marietta, GA, 30060");
  assert.match(parsed.searchParams.get("details") || "", /not payment received/);
  assert.match(parsed.searchParams.get("details") || "", /not automatic calendar sync/);
});

test("calendar draft adjusts for summer daylight time and does not invent invalid slots", () => {
  const url = googleCalendarDraftUrl({
    name: "Summer Example", preferredDate: "2026-07-15", appointmentTime: "5:30 PM",
  });
  assert.equal(new URL(url!).searchParams.get("dates"), "20260715T213000Z/20260715T233000Z");
  assert.equal(googleCalendarDraftUrl({ preferredDate: "2026-02-30", appointmentTime: "5:30 PM" }), null);
});
