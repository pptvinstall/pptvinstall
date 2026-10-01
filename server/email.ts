import nodemailer from "nodemailer";
import { format } from "date-fns";
import { addHours, formatICSDate, parseBookingDateTime } from "./services/calendarService";
import type { InsertContactMessage } from "@shared/schema";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

type LineItem = { name: string; total: number };

function getFromAddress() {
  return process.env.EMAIL_FROM || "Picture Perfect TV Install <pptvinstall@gmail.com>";
}

function getAdminAddress() {
  return process.env.ADMIN_EMAIL || "pptvinstall@gmail.com";
}

function formatAppointment(date: string, time: string) {
  return format(new Date(`${date}T12:00:00`), "EEEE, MMMM d yyyy") + ` at ${time}`;
}

function parseLineItems(booking: any): LineItem[] {
  try {
    const data = JSON.parse(booking.pricingBreakdown || "{}");
    if (Array.isArray(data.items)) {
      return data.items.map((item: any) => ({ name: item.name || "Service", total: Number(item.lineTotal ?? item.price ?? 0) }));
    }
    if (Array.isArray(data.quoteGroups)) {
      return data.quoteGroups.flatMap((group: any) =>
        (group.items || []).map((item: any) => ({
          name: group.title === "Shared Services" ? item.name : `${group.title} - ${item.name}`,
          total: Number(item.lineTotal ?? 0),
        })),
      );
    }
  } catch (error) {
    console.error("Could not parse booking line items:", error);
  }
  return [{ name: booking.serviceType || "Service", total: Number(booking.pricingTotal || 0) }];
}

function renderItemsHtml(items: LineItem[]) {
  return items
    .map((item) => `<tr><td style="padding:8px 0;color:#334155;">${item.name}</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#0f172a;">$${Math.abs(item.total)}</td></tr>`)
    .join("");
}

function renderItemsText(items: LineItem[]) {
  return items.map((item) => `- ${item.name}: $${Math.abs(item.total)}`).join("\n");
}

function getGoogleCalendarUrl(booking: any, summary: string) {
  const start = parseBookingDateTime(booking.preferredDate, booking.appointmentTime);
  const end = addHours(start, 2);
  const location = `${booking.streetAddress} ${booking.city} GA ${booking.zipCode}`;
  const details =
    `Services: ${summary}\n` +
    `Total: $${booking.pricingTotal ?? "TBD"}\n` +
    `Questions? 404-702-4748`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "TV Install — Picture Perfect TV Install",
    dates: `${formatICSDate(start)}/${formatICSDate(end)}`,
    details,
    location,
    sf: "true",
    output: "xml",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export async function sendBookingEmails(booking: any) {
  const [firstName] = String(booking.name || "").split(" ");
  const appointmentLabel = formatAppointment(booking.preferredDate, booking.appointmentTime);
  const items = parseLineItems(booking);
  const itemsHtml = renderItemsHtml(items);
  const itemsText = renderItemsText(items);
  const address = `${booking.streetAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}`;
  const notes = booking.notes?.trim() || booking.specialInstructions?.trim() || "None provided";

  const ownerSubject = `New Booking -- ${booking.name} -- ${booking.preferredDate} at ${booking.appointmentTime}`;
  const customerSubject = `Booking Received -- Picture Perfect TV Install -- ${booking.preferredDate} at ${booking.appointmentTime}`;
  const appBaseUrl = process.env.PUBLIC_APP_URL || "https://pptvinstall.com";
  const calendarUrl = booking.managementToken
    ? `${appBaseUrl}/api/bookings/${booking.id}/calendar?token=${encodeURIComponent(booking.managementToken)}`
    : "";
  const summaryText = items.map((item) => item.name).join(", ");
  const googleCalendarUrl = getGoogleCalendarUrl(booking, summaryText);

  const ownerHtml = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;">
        <h1 style="margin:0 0 18px;color:#0f172a;">New Booking</h1>
        <p><strong>Customer:</strong> ${booking.name}</p>
        <p><strong>Phone:</strong> ${booking.phone}</p>
        <p><strong>Email:</strong> ${booking.email}</p>
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>Appointment:</strong> ${appointmentLabel}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">${itemsHtml}</table>
        <p style="margin-top:18px;"><strong>Estimated Total:</strong> $${booking.pricingTotal ?? "TBD"}</p>
        <p><strong>Special Instructions:</strong> ${notes}</p>
        <p style="margin-top:18px;color:#334155;">Reply to this email or call ${booking.phone} to confirm.</p>
      </div>
    </div>
  `;

  const customerHtml = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;">
        <h1 style="margin:0 0 18px;color:#0f172a;">Booking Received</h1>
        <p>Hi ${firstName || "there"},</p>
        <p>Your appointment request is in for <strong>${appointmentLabel}</strong> at <strong>${address}</strong>.</p>
        <div style="margin:24px 0;text-align:center;">
          <p style="color:#64748b;font-size:14px;margin-bottom:12px;">Add this appointment to your calendar:</p>
          ${calendarUrl ? `<a href="${calendarUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:4px;">Add to Calendar</a>` : ""}
          <a href="${googleCalendarUrl}" style="display:inline-block;background:#ffffff;color:#2563eb;border:2px solid #2563eb;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;margin:4px;">Google Calendar</a>
          <p style="color:#64748b;font-size:13px;margin-top:12px;">The "Add to Calendar" button works with Google Calendar, Apple Calendar, and Outlook. On iPhone: tap the button and choose "Add" when prompted.</p>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">${itemsHtml}</table>
        <p style="margin-top:18px;"><strong>Estimated Total:</strong> $${booking.pricingTotal ?? "TBD"}</p>
        <div style="margin-top:18px;padding:16px;background:#eff6ff;border-radius:12px;">
          <p style="margin:0 0 8px;"><strong>What happens next</strong></p>
          <p style="margin:0 0 6px;">1. We confirm your appointment within 1 hour.</p>
          <p style="margin:0 0 6px;">2. We send a reminder the day before.</p>
          <p style="margin:0;">3. We show up and get it done.</p>
        </div>
        <p style="margin-top:18px;">Questions? Call 404-702-4748 or email pptvinstall@gmail.com.</p>
        <p>No payment required until after the job is complete.</p>
      </div>
    </div>
  `;

  const ownerText =
    `Customer full name: ${booking.name}\n` +
    `Phone number: ${booking.phone}\n` +
    `Email address: ${booking.email}\n` +
    `Full service address: ${address}\n` +
    `Appointment: ${appointmentLabel}\n\n` +
    `Itemized services:\n${itemsText}\n\n` +
    `Estimated total: $${booking.pricingTotal ?? "TBD"}\n` +
    `Special instructions: ${notes}\n\n` +
    `Reply to this email or call ${booking.phone} to confirm`;

  const customerText =
    `Hi ${firstName || "there"}!\n\n` +
    `Your appointment request is set for ${appointmentLabel} at ${address}.\n\n` +
    (calendarUrl ? `Add to Calendar: ${calendarUrl}\n` : "") +
    `Google Calendar: ${googleCalendarUrl}\n\n` +
    `${itemsText}\n\n` +
    `Estimated total: $${booking.pricingTotal ?? "TBD"}\n\n` +
    `What happens next:\n` +
    `1. We confirm within 1 hour.\n` +
    `2. We send a reminder the day before.\n` +
    `3. We show up and get it done.\n\n` +
    `Questions? 404-702-4748 or pptvinstall@gmail.com\n` +
    `No payment required until after the job is complete.`;

  await transporter.sendMail({
    from: getFromAddress(),
    to: booking.email,
    subject: customerSubject,
    html: customerHtml,
    text: customerText,
  });

  await transporter.sendMail({
    from: getFromAddress(),
    to: getAdminAddress(),
    subject: ownerSubject,
    html: ownerHtml,
    text: ownerText,
  });
}

export async function sendContactMessageEmail(message: InsertContactMessage) {
  const normalizedPhone = message.phone.replace(/\D/g, "");
  const phoneHref = normalizedPhone ? `tel:${normalizedPhone}` : undefined;

  await transporter.sendMail({
    from: getFromAddress(),
    to: getAdminAddress(),
    replyTo: message.email,
    subject: `New Contact Message -- ${message.name}`,
    text:
      `Name: ${message.name}\n` +
      `Email: ${message.email}\n` +
      `Phone: ${message.phone}\n\n` +
      `${message.message}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
        <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;">
          <h1 style="margin:0 0 18px;color:#0f172a;">New Contact Message</h1>
          <p><strong>Name:</strong> ${message.name}</p>
          <p><strong>Email:</strong> <a href="mailto:${message.email}">${message.email}</a></p>
          <p><strong>Phone:</strong> ${phoneHref ? `<a href="${phoneHref}">${message.phone}</a>` : message.phone}</p>
          <div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:12px;">
            <p style="margin:0;white-space:pre-wrap;color:#334155;">${message.message}</p>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendRescheduleEmail(booking: any) {
  const appointmentLabel = formatAppointment(booking.preferredDate, booking.appointmentTime);
  const address = `${booking.streetAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}`;
  const subject = `Appointment Rescheduled -- ${booking.name} -- ${booking.preferredDate} at ${booking.appointmentTime}`;

  const customerText =
    `Hi ${String(booking.name || "").split(" ")[0] || "there"},\n\n` +
    `Your Picture Perfect TV Install appointment has been rescheduled to ${appointmentLabel}.\n` +
    `Address: ${address}\n\n` +
    `Questions? Call 404-702-4748 or reply to this email.`;

  const ownerText =
    `Booking rescheduled.\n\n` +
    `Customer: ${booking.name}\n` +
    `Phone: ${booking.phone}\n` +
    `Email: ${booking.email}\n` +
    `Updated appointment: ${appointmentLabel}\n` +
    `Address: ${address}`;

  await Promise.all([
    transporter.sendMail({
      from: getFromAddress(),
      to: booking.email,
      subject,
      text: customerText,
      html: `<p>${customerText.replace(/\n/g, "<br />")}</p>`,
    }),
    transporter.sendMail({
      from: getFromAddress(),
      to: getAdminAddress(),
      subject,
      text: ownerText,
      html: `<p>${ownerText.replace(/\n/g, "<br />")}</p>`,
    }),
  ]);
}

export async function sendAppointmentReminder(booking: any): Promise<void> {
  const [firstName] = String(booking.name || "").split(" ");
  const appointmentLabel = formatAppointment(booking.preferredDate, booking.appointmentTime);
  const address = `${booking.streetAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}`;
  const subject = "Reminder: Your TV Install Tomorrow — Picture Perfect TV Install";

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;">
        <h1 style="margin:0 0 18px;color:#0f172a;">Your install is tomorrow!</h1>
        <p>Hi ${firstName || "there"},</p>
        <p>This is a friendly reminder that your appointment is scheduled for:</p>
        <div style="margin:20px 0;padding:16px;background:#eff6ff;border-radius:12px;border-left:4px solid #2563eb;">
          <p style="margin:0 0 6px;"><strong>Date &amp; Time:</strong> ${appointmentLabel}</p>
          <p style="margin:0;"><strong>Address:</strong> ${address}</p>
        </div>
        <p><strong>What to expect:</strong></p>
        <ul style="color:#334155;line-height:1.8;">
          <li>We'll arrive within the scheduled window</li>
          <li>The install typically takes 30–90 minutes depending on complexity</li>
          <li>Please have the TV and any equipment accessible beforehand</li>
          <li>No payment required until the job is complete</li>
        </ul>
        <p>Need to reschedule? Call <a href="tel:4047024748" style="color:#2563eb;">404-702-4748</a> as soon as possible and we'll find a new time.</p>
        <p style="color:#64748b;font-size:14px;">— Justin at Picture Perfect TV Install</p>
      </div>
    </div>
  `;

  const text =
    `Hi ${firstName || "there"},\n\n` +
    `Reminder: your TV install appointment is tomorrow.\n\n` +
    `Date & Time: ${appointmentLabel}\n` +
    `Address: ${address}\n\n` +
    `What to expect:\n` +
    `- We'll arrive within the scheduled window\n` +
    `- The install typically takes 30–90 minutes\n` +
    `- Please have the TV and equipment accessible beforehand\n` +
    `- No payment required until the job is complete\n\n` +
    `Need to reschedule? Call 404-702-4748 as soon as possible.\n\n` +
    `— Justin at Picture Perfect TV Install`;

  await transporter.sendMail({
    from: getFromAddress(),
    to: booking.email,
    subject,
    html,
    text,
  });
}

export async function sendPostJobFollowUp(booking: any): Promise<void> {
  const [firstName] = String(booking.name || "").split(" ");
  const subject = "How did your install go? — Picture Perfect TV Install";
  const reviewUrl = "https://www.google.com/maps/place/Picture+Perfect+TV+Installation/reviews?cid=10426705498086011678";

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;">
        <h1 style="margin:0 0 18px;color:#0f172a;">Thanks for choosing us, ${firstName || "there"}!</h1>
        <p>We hope everything looks great and your install went smoothly. It was a pleasure working with you.</p>
        <p>If you have a minute, a quick Google review would mean a lot to a small business like ours — it helps other Atlanta homeowners find us:</p>
        <div style="margin:24px 0;text-align:center;">
          <a href="${reviewUrl}" style="display:inline-block;background:#2563eb;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;">Leave a Google Review ⭐</a>
        </div>
        <p>Also — if you know anyone who needs a TV mounted, a camera installed, or smart home help, we'd love the referral. Feel free to share our number: <strong>404-702-4748</strong>.</p>
        <p>Questions or concerns about your install? Reply to this email or call and we'll make it right.</p>
        <p style="color:#64748b;font-size:14px;">— Justin at Picture Perfect TV Install<br/>pptvinstall@gmail.com · 404-702-4748</p>
      </div>
    </div>
  `;

  const text =
    `Hi ${firstName || "there"},\n\n` +
    `Thanks for choosing Picture Perfect TV Install! We hope everything looks great.\n\n` +
    `If you have a minute, a quick Google review helps other Atlanta homeowners find us:\n` +
    `${reviewUrl}\n\n` +
    `Know someone who needs a TV mounted or smart home help? We'd love the referral — 404-702-4748.\n\n` +
    `Questions? Reply to this email or call us and we'll make it right.\n\n` +
    `— Justin at Picture Perfect TV Install`;

  await transporter.sendMail({
    from: getFromAddress(),
    to: booking.email,
    subject,
    html,
    text,
  });
}

export async function sendCancellationEmail(booking: any) {
  const appointmentLabel = formatAppointment(booking.preferredDate, booking.appointmentTime);
  const reason = booking.cancellationReason?.trim() || "No reason provided.";
  const subject = `Appointment Cancelled -- ${booking.name} -- ${booking.preferredDate} at ${booking.appointmentTime}`;

  const customerText =
    `Hi ${String(booking.name || "").split(" ")[0] || "there"},\n\n` +
    `Your Picture Perfect TV Install appointment for ${appointmentLabel} has been cancelled.\n` +
    `Reason: ${reason}\n\n` +
    `If you want to book a new time, call 404-702-4748 or visit https://pptvinstall.com/booking.`;

  const ownerText =
    `Booking cancelled.\n\n` +
    `Customer: ${booking.name}\n` +
    `Phone: ${booking.phone}\n` +
    `Email: ${booking.email}\n` +
    `Original appointment: ${appointmentLabel}\n` +
    `Reason: ${reason}`;

  await Promise.all([
    transporter.sendMail({
      from: getFromAddress(),
      to: booking.email,
      subject,
      text: customerText,
      html: `<p>${customerText.replace(/\n/g, "<br />")}</p>`,
    }),
    transporter.sendMail({
      from: getFromAddress(),
      to: getAdminAddress(),
      subject,
      text: ownerText,
      html: `<p>${ownerText.replace(/\n/g, "<br />")}</p>`,
    }),
  ]);
}
