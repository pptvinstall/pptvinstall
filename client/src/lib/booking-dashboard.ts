import { atlantaSlotInstant } from "@shared/atlantaTime";

export type BookingBucket =
  | "upcoming"
  | "in_progress"
  | "past_due"
  | "completed"
  | "cancelled"
  | "needs_review";

export type BookingFilter = "actionable" | "upcoming" | "follow_up" | "completed" | "cancelled" | "all";

export interface DashboardBooking {
  status?: string | null;
  preferredDate?: string | null;
  appointmentTime?: string | null;
  pricingTotal?: string | number | null;
}

const APPOINTMENT_WINDOW_MS = 2 * 60 * 60 * 1000;

export function getBookingBucket(booking: DashboardBooking, now = new Date()): BookingBucket {
  if (booking.status === "cancelled") return "cancelled";
  if (booking.status === "completed") return "completed";
  if (booking.status && booking.status !== "active" && booking.status !== "scheduled") {
    return "needs_review";
  }
  try {
    if (!booking.preferredDate || !booking.appointmentTime) return "needs_review";
    const start = atlantaSlotInstant(booking.preferredDate, booking.appointmentTime).getTime();
    if (start > now.getTime()) return "upcoming";
    if (start + APPOINTMENT_WINDOW_MS > now.getTime()) return "in_progress";
    return "past_due";
  } catch {
    return "needs_review";
  }
}

export function bookingMatchesFilter(bucket: BookingBucket, filter: BookingFilter): boolean {
  if (filter === "all") return true;
  if (filter === "actionable") return !["completed", "cancelled"].includes(bucket);
  if (filter === "upcoming") return bucket === "upcoming" || bucket === "in_progress";
  if (filter === "follow_up") return bucket === "past_due" || bucket === "needs_review";
  return bucket === filter;
}

export function bookingEstimate(value: DashboardBooking["pricingTotal"]): number {
  if (value == null || value === "") return 0;
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function summarizeBookingDashboard(bookings: DashboardBooking[], now = new Date()) {
  const summary = {
    upcomingJobs: 0,
    upcomingEstimate: 0,
    followUpsNeeded: 0,
    completedJobs: 0,
    cancelledJobs: 0,
  };

  for (const booking of bookings) {
    const bucket = getBookingBucket(booking, now);
    if (bucket === "upcoming" || bucket === "in_progress") {
      summary.upcomingJobs += 1;
      summary.upcomingEstimate += bookingEstimate(booking.pricingTotal);
    } else if (bucket === "past_due" || bucket === "needs_review") {
      summary.followUpsNeeded += 1;
    } else if (bucket === "completed") {
      summary.completedJobs += 1;
    } else if (bucket === "cancelled") {
      summary.cancelledJobs += 1;
    }
  }

  return summary;
}
