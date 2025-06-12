// SMS service for booking confirmations and reminders

export interface SMSData {
  to: string;
  message: string;
  bookingId: string;
}

export interface BookingSMSData {
  customerName: string;
  customerPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceAddress: string;
  bookingId: string;
  isTestMode?: boolean;
}

// Generate SMS confirmation message
export function generateBookingConfirmationSMS(data: BookingSMSData): string {
  const testPrefix = data.isTestMode ? '[TEST] ' : '';
  
  return `${testPrefix}Hi ${data.customerName}! Your TV installation is confirmed for ${data.appointmentDate} at ${data.appointmentTime}. Address: ${data.serviceAddress}. Booking ID: ${data.bookingId}. Call 404-702-4748 with questions. - Picture Perfect TV Install`;
}

// Generate day-before reminder SMS
export function generateReminderSMS(data: BookingSMSData): string {
  const testPrefix = data.isTestMode ? '[TEST] ' : '';
  
  return `${testPrefix}Reminder: Your TV installation is tomorrow (${data.appointmentDate}) at ${data.appointmentTime}. We'll call 30 minutes before arrival. Address: ${data.serviceAddress}. Questions? Call 404-702-4748 - Picture Perfect TV Install`;
}

// Send SMS via API
export async function sendSMS(smsData: SMSData): Promise<boolean> {
  try {
    const response = await fetch('/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(smsData)
    });
    
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}

// Send booking confirmation SMS
export async function sendBookingConfirmationSMS(data: BookingSMSData): Promise<boolean> {
  const message = generateBookingConfirmationSMS(data);
  
  return sendSMS({
    to: data.customerPhone,
    message,
    bookingId: data.bookingId
  });
}

// Send reminder SMS
export async function sendReminderSMS(data: BookingSMSData): Promise<boolean> {
  const message = generateReminderSMS(data);
  
  return sendSMS({
    to: data.customerPhone,
    message,
    bookingId: data.bookingId
  });
}

// Format phone number for SMS (remove formatting, ensure +1)
export function formatPhoneForSMS(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Add +1 if not present and number is 10 digits
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // Add + if not present and number is 11 digits starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // Return as-is if already formatted
  return phone;
}

// Check if phone number is valid for SMS
export function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}