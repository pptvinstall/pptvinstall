import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

if (!accountSid || !authToken || !fromNumber) {
  console.warn("Twilio credentials not set. SMS functionality will not work.");
} else {
  twilioClient = twilio(accountSid, authToken);
}

/**
 * Send a booking confirmation SMS
 */
export async function sendBookingConfirmationSMS(booking: any) {
  if (!twilioClient || !fromNumber) {
    console.warn("Cannot send SMS: Twilio not configured");
    return false;
  }

  try {
    const appointmentDate = new Date(booking.preferredDate);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    const message = `
Picture Perfect TV Install: Your appointment is confirmed!
Date: ${formattedDate}
Time: ${booking.appointmentTime}
Address: ${booking.streetAddress}
Est. Price: ${booking.pricingTotal || 'TBD'}

Questions? Call (678) 263-2859
`.trim();

    await twilioClient.messages.create({
      body: message,
      to: booking.phone,
      from: fromNumber
    });

    console.log(`Booking confirmation SMS sent to ${booking.phone}`);
    return true;
  } catch (error) {
    console.error('Error sending confirmation SMS:', error);
    return false;
  }
}

/**
 * Send an appointment reminder SMS
 */
export async function sendAppointmentReminderSMS(booking: any) {
  if (!twilioClient || !fromNumber) {
    console.warn("Cannot send SMS: Twilio not configured");
    return false;
  }

  try {
    const appointmentDate = new Date(booking.preferredDate);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    const message = `
Reminder: Your TV installation appointment is tomorrow!
Date: ${formattedDate}
Time: ${booking.appointmentTime}
Address: ${booking.streetAddress}

Please ensure the installation area is accessible.
Questions? Call (678) 263-2859
`.trim();

    await twilioClient.messages.create({
      body: message,
      to: booking.phone,
      from: fromNumber
    });

    console.log(`Appointment reminder SMS sent to ${booking.phone}`);
    return true;
  } catch (error) {
    console.error('Error sending reminder SMS:', error);
    return false;
  }
}
