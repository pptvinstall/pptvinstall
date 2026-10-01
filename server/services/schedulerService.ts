import { format, addDays, subDays } from "date-fns";

import { storage } from "../storage";
import { sendAppointmentReminder, sendPostJobFollowUp } from "../email";

// In-memory dedup sets — survive only for the current server process.
// On restart the scheduler will re-evaluate; worst case: one extra email
// per booking if the server restarts on the same qualifying day.
const reminderSentIds = new Set<string | number>();
const followUpSentIds = new Set<string | number>();

async function runSchedulerTick() {
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  let allBookings;
  try {
    allBookings = await storage.getAllBookings();
  } catch (fetchError) {
    console.error("[scheduler] Failed to fetch bookings:", fetchError);
    return;
  }

  const active = allBookings.filter((b) => b.status === "active" || b.status === "scheduled");

  for (const booking of active) {
    const bookingId = booking.id!;

    // ── Appointment reminder (send day before) ──────────────────────────────
    if (
      booking.preferredDate === tomorrow &&
      !reminderSentIds.has(bookingId) &&
      booking.email
    ) {
      try {
        await sendAppointmentReminder(booking);
        reminderSentIds.add(bookingId);
        console.info(`[scheduler] Reminder sent → booking #${bookingId} (${booking.name}, ${tomorrow})`);
      } catch (reminderError) {
        console.error(`[scheduler] Reminder failed for booking #${bookingId}:`, reminderError);
      }
    }

    // ── Post-job follow-up (send day after) ─────────────────────────────────
    if (
      booking.preferredDate === yesterday &&
      !followUpSentIds.has(bookingId) &&
      booking.email
    ) {
      try {
        await sendPostJobFollowUp(booking);
        followUpSentIds.add(bookingId);
        console.info(`[scheduler] Follow-up sent → booking #${bookingId} (${booking.name}, ${yesterday})`);
      } catch (followUpError) {
        console.error(`[scheduler] Follow-up failed for booking #${bookingId}:`, followUpError);
      }
    }
  }
}

export function startScheduler(): void {
  // Run once immediately on startup, then every hour
  void runSchedulerTick();
  setInterval(() => void runSchedulerTick(), 60 * 60 * 1000);
  console.info("[scheduler] Started — checking every hour for reminders and follow-ups.");
}
