import { addDays, format } from "date-fns";

import { pricingData } from "@/data/pricing-data";

export type QuoteItem = { name: string; lineTotal: number; qty?: number };
export type QuoteGroup = { title: string; items: QuoteItem[] };
export type PendingQuote = { total: number; summary: string; groups: QuoteGroup[]; flags?: string[]; followUp?: string; promoCode?: string; zipCode?: string };
export type Details = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
  birthday: string;
  emailMarketingOptIn: boolean;
  transactionalSmsOptIn: boolean;
  smsMarketingOptIn: boolean;
  birthdayPromoOptIn: boolean;
};
export type EntryMode = "mount_one" | "mount_multiple" | "smart_home" | null;
export type BookingStep = 1 | 2 | 3;

export type QuickDetails = {
  tvCount: number;
  fireplace: boolean;
  brick: boolean;
  concealment: boolean;
  mountProvided: boolean;
  smartCount: number;
  cameras: boolean;
  doorbell: boolean;
  floodlight: boolean;
};

export const QUOTE_KEY = "pptvinstall_pending_quote";
export const WEEKDAY_SLOTS = ["5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM"];
export const WEEKEND_SLOTS = (() => {
  const slots: string[] = [];
  for (let hour = 11; hour <= 19; hour += 1) {
    slots.push(format(new Date(2026, 0, 1, hour, 0), "h:mm a"));
    if (hour < 19) {
      slots.push(format(new Date(2026, 0, 1, hour, 30), "h:mm a"));
    }
  }
  return slots;
})();

export const ENTRY_CARDS = [
  { id: "mount_one" as const, icon: "📺", title: "Mount 1 TV", subtitle: `Starting at $${pricingData.tvMounting.standard.price}` },
  { id: "mount_multiple" as const, icon: "📺📺", title: "Mount multiple TVs", subtitle: `Starting at $${pricingData.tvMounting.standard.price}/TV` },
  { id: "smart_home" as const, icon: "🔒", title: "Smart home only", subtitle: "Cameras, doorbell, floodlight" },
];

export function createInitialDetails(): Details {
  return {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    streetAddress: "",
    city: "",
    state: "GA",
    zipCode: "",
    notes: "",
    birthday: "",
    emailMarketingOptIn: false,
    transactionalSmsOptIn: false,
    smsMarketingOptIn: false,
    birthdayPromoOptIn: false,
  };
}

export function createInitialQuickDetails(): QuickDetails {
  return {
    tvCount: 1,
    fireplace: false,
    brick: false,
    concealment: false,
    mountProvided: false,
    smartCount: 1,
    cameras: true,
    doorbell: false,
    floodlight: false,
  };
}

export function parseSlotTime(date: Date, slot: string): Date {
  const [timePart, meridiemPart] = slot.split(" ");
  const [hoursPart, minutesPart] = timePart.split(":");
  let hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  const meridiem = meridiemPart.toUpperCase();
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
}

export function getAllSlots(date: Date): string[] {
  return date.getDay() === 0 || date.getDay() === 6 ? WEEKEND_SLOTS : WEEKDAY_SLOTS;
}

export function getAvailableSlots(date: Date, bookedSlots: string[]): string[] {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  let allSlots = getAllSlots(date);
  if (isToday) {
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    allSlots = allSlots.filter((slot) => parseSlotTime(date, slot) >= twoHoursFromNow);
  }
  return allSlots.filter((slot) => !bookedSlots.includes(slot));
}

export function validPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

export function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function nextAvailableDate(fromDate: Date, bookedSlotsByDate: Record<string, string[]>): { date: Date; slot: string } | null {
  for (let offset = 0; offset < 21; offset += 1) {
    const candidate = addDays(fromDate, offset);
    const booked = bookedSlotsByDate[format(candidate, "yyyy-MM-dd")] ?? [];
    const available = getAvailableSlots(candidate, booked);
    if (available.length > 0) return { date: candidate, slot: available[0] };
  }
  return null;
}

export function calculateRoughEstimate(isQuoteFlow: boolean, entryMode: EntryMode, quickDetails: QuickDetails) {
  if (isQuoteFlow || !entryMode) return null;

  if (entryMode === "smart_home") {
    let low = 0;
    let high = 0;
    if (quickDetails.cameras) {
      low += pricingData.smartHome.securityCamera.price * quickDetails.smartCount;
      high += pricingData.smartHome.securityCamera.price * quickDetails.smartCount;
    }
    if (quickDetails.doorbell) {
      low += pricingData.smartHome.doorbell.price;
      high += pricingData.smartHome.doorbell.price;
    }
    if (quickDetails.floodlight) {
      low += pricingData.smartHome.floodlight.price;
      high += pricingData.smartHome.floodlight.price + 75;
    }
    return {
      low: Math.max(low, pricingData.smartHome.securityCamera.price),
      high: Math.max(high, pricingData.smartHome.doorbell.price + pricingData.smartHome.floodlight.price),
    };
  }

  const count = quickDetails.tvCount;
  let lowPerTv = pricingData.tvMounting.standard.price;
  let highPerTv = pricingData.tvMounting.standard.price;
  if (quickDetails.fireplace) highPerTv += pricingData.tvMounting.fireplace.price - pricingData.tvMounting.standard.price;
  if (quickDetails.brick) highPerTv += pricingData.tvMounting.nonDrywall.price;
  if (quickDetails.concealment) highPerTv += pricingData.wireConcealment.standard.price;
  if (quickDetails.mountProvided) highPerTv += pricingData.tvMounts.fullMotionBig.price;
  if (quickDetails.mountProvided) lowPerTv += pricingData.tvMounts.fixedSmall.price;
  return { low: count * lowPerTv, high: count * highPerTv };
}

export function buildReviewItems(pendingQuote: PendingQuote | null, entryMode: EntryMode, quickDetails: QuickDetails) {
  if (pendingQuote) {
    return pendingQuote.groups.flatMap((group) =>
      group.items.map((item) => ({
        name: group.title === "Shared Services" ? item.name : `${group.title} - ${item.name}`,
        lineTotal: item.lineTotal,
      })),
    );
  }

  if (entryMode === "smart_home") {
    const items = [];
    if (quickDetails.cameras) items.push({ name: `${quickDetails.smartCount}x Security Camera Install`, lineTotal: pricingData.smartHome.securityCamera.price * quickDetails.smartCount });
    if (quickDetails.doorbell) items.push({ name: pricingData.smartHome.doorbell.name, lineTotal: pricingData.smartHome.doorbell.price });
    if (quickDetails.floodlight) items.push({ name: pricingData.smartHome.floodlight.name, lineTotal: pricingData.smartHome.floodlight.price });
    return items;
  }

  return [
    { name: `${quickDetails.tvCount} TV${quickDetails.tvCount > 1 ? "s" : ""} mounting`, lineTotal: quickDetails.tvCount * pricingData.tvMounting.standard.price },
    ...(quickDetails.fireplace ? [{ name: "Possible fireplace mounting", lineTotal: pricingData.tvMounting.fireplace.price - pricingData.tvMounting.standard.price }] : []),
    ...(quickDetails.brick ? [{ name: "Possible brick/stone wall add-on", lineTotal: pricingData.tvMounting.nonDrywall.price }] : []),
    ...(quickDetails.concealment ? [{ name: "Possible wire concealment", lineTotal: pricingData.wireConcealment.standard.price }] : []),
    ...(quickDetails.mountProvided ? [{ name: "Possible mount hardware", lineTotal: pricingData.tvMounts.fixedSmall.price }] : []),
  ];
}

export function validateDetails(details: Details) {
  const next: Partial<Record<keyof Details, string>> = {};
  if (!details.firstName.trim()) next.firstName = "First name is required.";
  if (!details.lastName.trim()) next.lastName = "Last name is required.";
  if (!validPhone(details.phone)) next.phone = "Enter a valid phone number.";
  if (!validEmail(details.email)) next.email = "Enter a valid email address.";
  if (!details.streetAddress.trim()) next.streetAddress = "Street address is required.";
  if (!details.city.trim()) next.city = "City is required.";
  if (!/^\d{5}$/.test(details.zipCode)) next.zipCode = "Enter a valid 5-digit ZIP code.";
  return next;
}
