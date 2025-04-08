import { type Express, Request as ExpressRequest, Response, NextFunction } from "express";
import { type Server } from "http";
import { db } from "./db";
import { 
  bookingSchema, bookings, businessHoursSchema, customers, customerSchema, 
  insertCustomerSchema, pushSubscriptionSchema, notificationSettingsSchema,
  promotions, promotionSchema, insertPromotionSchema, Promotion, Booking
} from "@shared/schema";
import { ZodError } from "zod";
import { loadBookings, saveBookings, ensureDataDirectory, storage } from "./storage";
import { availabilityService, TimeSlot, BlockedDay } from "./services/availabilityService";
import { logger } from "./services/loggingService";
import { and, eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { 
  sendBookingConfirmationEmail, 
  sendAdminNotificationEmail,
  sendBookingCancellationEmail,
  emailTemplates
} from "./services/emailService";
import { 
  sendEnhancedEmail, 
  EmailType, 
  sendEnhancedBookingConfirmation,
  sendRescheduleConfirmation,
  sendEnhancedCancellationEmail,
  sendServiceEditNotification
} from "./services/enhancedEmailService";
import { pushNotificationService } from "./services/pushNotificationService";

// Extend Express Request type to include requestId
interface Request extends ExpressRequest {
  requestId?: string;
}

// Load bookings from storage
ensureDataDirectory();
let fileBookings: any[] = loadBookings();

// Admin authentication helper function
function verifyAdminPassword(password: string | undefined): boolean {
  // Use both the environment variable and hardcoded password as fallback
  const envPassword = process.env.ADMIN_PASSWORD;
  const hardcodedPassword = "PictureP3rfectTV2025";
  
  // Debug log to see if environment variable is correctly loaded
  logger.debug('Admin password verification', {
    envVarSet: !!envPassword,
    envPasswordValue: envPassword || 'not set',
    usingHardcoded: !envPassword,
    providedPasswordLength: password?.length || 0
  });

  if (!password) {
    logger.auth('Admin authentication failed: No password provided');
    return false;
  }

  // Check if password matches either the environment variable or the hardcoded password
  const isValidEnv = envPassword && password === envPassword;
  const isValidHardcoded = password === hardcodedPassword;
  const isValid = isValidEnv || isValidHardcoded;
  
  logger.auth('Admin authentication attempt', {
    success: isValid,
    passwordProvided: !!password,
    usingEnvPassword: isValidEnv,
    usingHardcodedPassword: isValidHardcoded
  });

  return isValid;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Add logging middleware
  app.use(logger.logRequest.bind(logger));

  // API routes
  app.get("/api/health", (req, res) => {
    logger.debug('Health check requested');
    res.json({ status: "ok" });
  });
  
  // Public route for email preview page to check basic email settings
  app.get("/api/email/check-config", (req: Request, res: Response) => {
    try {
      logger.info('Email environment basic check requested');
      
      // Only provide basic information that's needed for the email preview UI
      res.json({
        success: true,
        apiKeySet: !!process.env.SENDGRID_API_KEY,
        fromEmail: process.env.EMAIL_FROM || 'Picture Perfect TV Install <PPTVInstall@gmail.com>',
        adminEmail: process.env.ADMIN_EMAIL || 'PPTVInstall@gmail.com'
      });
    } catch (error: any) {
      logger.error("Error checking basic email environment:", error);
      res.status(500).json({
        success: false,
        message: "Unable to retrieve email configuration"
      });
    }
  });
  
  // Route to check email-related environment variables
  app.get("/api/admin/check-email-env", (req: Request, res: Response) => {
    try {
      const { password } = req.query;
      
      if (!verifyAdminPassword(password as string)) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }
      
      // Gather email configuration
      const emailConfig = {
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? `Set (length: ${process.env.SENDGRID_API_KEY.length})` : 'Not set',
        ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'Not set (using default PPTVInstall@gmail.com)',
        EMAIL_FROM: process.env.EMAIL_FROM || 'Not set (using default PPTVInstall@gmail.com)',
        NODE_ENV: process.env.NODE_ENV,
        host: req.headers.host
      };
      
      logger.info('Email environment variables checked');
      
      res.json({
        success: true,
        emailConfig
      });
    } catch (error: any) {
      logger.error("Error checking environment variables:", error);
      res.status(500).json({
        success: false,
        message: "Error checking environment: " + error.message
      });
    }
  });

  // Test email sending functionality - for troubleshooting only
  app.get("/api/admin/test-email", async (req, res) => {
    try {
      const { email, password, type } = req.query;
      
      if (!verifyAdminPassword(password as string)) {
        return res.status(401).json({
          success: false,
          message: "Invalid admin password"
        });
      }
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email address is required"
        });
      }
      
      logger.info(`Testing email functionality to address: ${email}, type: ${type || 'both'}`);
      
      const timestamp = new Date().toLocaleTimeString();
      
      // Create a test booking object with distinctive information
      const testBooking = {
        id: `TEST-${Date.now()}`,
        name: "Test Customer",
        email: email as string,
        phone: "555-555-5555",
        streetAddress: "123 Test Street",
        city: "Atlanta",
        state: "GA",
        zipCode: "30301",
        serviceType: "TV Installation",
        preferredDate: new Date().toISOString(),
        appointmentTime: "7:00 PM",
        notes: `This is a test booking sent at ${timestamp} to verify email functionality`,
        pricingTotal: "199.99",
        pricingBreakdown: [
          { type: "tv", size: "large", location: "standard", mountType: "fixed" }
        ]
      };
      
      // Log SendGrid configuration
      logger.debug("SendGrid Config:", {
        apiKeySet: !!process.env.SENDGRID_API_KEY,
        fromEmail: process.env.EMAIL_FROM || 'PPTVInstall@gmail.com',
        adminEmail: process.env.ADMIN_EMAIL || 'PPTVInstall@gmail.com'
      });
      
      // Variable to track email results
      let customerEmailResult = false;
      let adminEmailResult = false;
      
      // Send test customer email if requested type is 'customer' or not specified
      if (!type || type === 'customer') {
        try {
          logger.debug("Sending test customer confirmation email...");
          customerEmailResult = await sendBookingConfirmationEmail(testBooking);
          logger.info(`Customer email send result: ${customerEmailResult}`);
        } catch (customerError: any) {
          logger.error("Error sending customer email:", customerError as Error);
          if (customerError?.response) {
            logger.error("SendGrid API error response for customer email:", customerError.response.body);
          }
        }
      }
      
      // Send test admin notification if requested type is 'admin' or not specified
      if (!type || type === 'admin') {
        try {
          logger.debug("Sending test admin notification email...");
          
          // Create admin email with modified subject for easier identification in inbox
          const adminMsg = {
            to: process.env.ADMIN_EMAIL || 'PPTVInstall@gmail.com',
            from: process.env.EMAIL_FROM || 'PPTVInstall@gmail.com',
            subject: `🔔 URGENT TEST: New Booking Alert (${timestamp})`,
            text: "Admin notification for test booking",
            html: emailTemplates.getAdminNotificationEmailTemplate(testBooking),
          };
          
          logger.debug("Admin email payload:", JSON.stringify({
            to: adminMsg.to,
            from: adminMsg.from,
            subject: adminMsg.subject
          }));
          
          // Send directly through SendGrid for custom subject
          import('@sendgrid/mail').then(sgModule => {
            const sgMail = sgModule.default;
            sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
            return sgMail.send(adminMsg);
          });
          adminEmailResult = true;
          logger.info(`Admin email send result: ${adminEmailResult}`);
        } catch (adminError: any) {
          logger.error("Error sending admin email:", adminError as Error);
          if (adminError?.response) {
            logger.error("SendGrid API error response for admin email:", adminError.response.body);
          }
        }
      }
      
      res.json({
        success: true,
        results: {
          customerEmail: type === 'admin' ? 'not requested' : customerEmailResult,
          adminEmail: type === 'customer' ? 'not requested' : adminEmailResult
        },
        message: "Email test completed. Check server logs for details.",
        adminEmail: process.env.ADMIN_EMAIL || 'PPTVInstall@gmail.com',
        timestamp: timestamp
      });
    } catch (error: any) {
      logger.error("Error in test-email endpoint:", error as Error);
      res.status(500).json({
        success: false,
        message: "An error occurred while testing email functionality"
      });
    }
  });
  
  // Test enhanced email sending functionality 
  app.post("/api/email/send-test-to-multiple", async (req: Request, res: Response) => {
    try {
      const { emailType = EmailType.BOOKING_CONFIRMATION } = req.body;
      
      if (!Object.values(EmailType).includes(emailType)) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid email type",
          validTypes: Object.values(EmailType)
        });
      }
      
      logger.info(`Sending test emails to both user and JWoodceo@gmail.com, type: ${emailType}`);
      
      // Import dynamically to avoid circular dependencies
      const { sendTestEmail } = await import('./services/enhancedEmailService');
      
      // Get admin email from environment variables or use default
      const adminEmail = process.env.ADMIN_EMAIL || 'PPTVInstall@gmail.com';
      
      // Send to JWoodceo@gmail.com
      const jwoodResult = await sendTestEmail(emailType, 'JWoodceo@gmail.com');
      
      // Send to admin email
      const yourResult = await sendTestEmail(emailType, adminEmail);
      
      return res.json({
        success: true,
        message: `Test ${emailType} emails sent to JWoodceo@gmail.com and ${adminEmail}`,
        jwoodResult,
        yourResult
      });
    } catch (error) {
      console.error('Error sending test emails:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to send test emails',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/email/test-send", async (req: Request, res: Response) => {
    try {
      const { 
        email, 
        emailType, 
        sendCalendar = true 
      } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email address is required"
        });
      }

      logger.info(`Testing enhanced email functionality to address: ${email}, type: ${emailType || 'booking_confirmation'}`);
      
      const timestamp = new Date().toLocaleTimeString();
      
      // Create a test booking object with distinctive information
      const testBooking: Booking = {
        id: `TEST-${Date.now()}`,
        name: "Test Customer",
        email: email,
        phone: "555-555-5555",
        streetAddress: "123 Test Street", 
        city: "Atlanta",
        state: "GA",
        zipCode: "30301",
        serviceType: "TV Installation",
        preferredDate: new Date().toISOString(),
        appointmentTime: "7:00 PM",
        notes: `This is a test email sent at ${timestamp} to verify the enhanced email functionality`,
        pricingTotal: "199.99",
        status: "active" as const,
        tvSize: "65 inch",
        mountType: "Full-Motion Mount",
        pricingBreakdown: [
          { type: "tv", size: "large", location: "standard", mountType: "fixed" }
        ],
        customer: {
          id: 999,
          name: "Test Customer",
          email: email
        }
      };
      
      // Log SendGrid configuration
      logger.debug("Enhanced Email Test - SendGrid Config:", {
        apiKeySet: !!process.env.SENDGRID_API_KEY,
        fromEmail: process.env.EMAIL_FROM || 'PPTVInstall@gmail.com',
        adminEmail: process.env.ADMIN_EMAIL || 'PPTVInstall@gmail.com',
        emailType: emailType || EmailType.BOOKING_CONFIRMATION
      });
      
      let result = false;
      
      // Send the appropriate email based on type
      switch (emailType) {
        case EmailType.BOOKING_CONFIRMATION:
          result = await sendEnhancedBookingConfirmation(testBooking);
          break;
        case EmailType.RESCHEDULE_CONFIRMATION:
          result = await sendRescheduleConfirmation(
            testBooking, 
            '2023-04-01',
            '6:00 PM'
          );
          break;
        case EmailType.BOOKING_CANCELLATION:
          result = await sendEnhancedCancellationEmail(
            testBooking, 
            'Customer requested cancellation'
          );
          break;
        case EmailType.SERVICE_EDIT:
          result = await sendServiceEditNotification(
            testBooking, 
            {
              serviceType: 'TV Installation + Sound Bar Setup',
              pricingTotal: '249.99'
            }
          );
          break;
        case EmailType.WELCOME:
          result = await sendEnhancedEmail(
            EmailType.WELCOME,
            testBooking.email,
            testBooking
          );
          break;
        default:
          // Default to booking confirmation
          result = await sendEnhancedBookingConfirmation(testBooking);
      }
      
      res.json({
        success: true,
        result: result,
        message: "Enhanced email test completed. Check your inbox.",
        emailType: emailType || EmailType.BOOKING_CONFIRMATION,
        timestamp: timestamp
      });
    } catch (error: any) {
      logger.error("Error in enhanced email test endpoint:", error);
      
      // Detailed error handling for better client feedback
      let errorMessage = "An error occurred while testing enhanced email functionality";
      let errorDetails = null;
      
      // Check for SendGrid specific errors
      if (error?.response?.body) {
        logger.error("SendGrid API error response:", error.response.body);
        errorDetails = error.response.body;
        
        // Extract specific SendGrid error if available
        if (error.response.body.errors && error.response.body.errors.length > 0) {
          errorMessage = `SendGrid error: ${error.response.body.errors[0].message}`;
        }
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: error.message,
        details: errorDetails
      });
    }
  });

  // Calendar API endpoints with internal availability service
  app.get("/api/calendar/availability", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Both startDate and endDate are required parameters"
        });
      }

      // Parse the dates
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Validate date format
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD"
        });
      }

      // Add caching header for availability data (10 minutes)
      res.setHeader('Cache-Control', 'public, max-age=600');

      // Get unavailable time slots from internal availability service
      const blockedSlots = availabilityService.getBlockedTimeSlotsForDateRange(
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      );

      // Create unavailable slots object with the same format as before
      const unavailableSlots: { [key: string]: string[] } = { ...blockedSlots };

      // Get blocked days and add all time slots for those days
      const blockedDays = availabilityService.getBlockedDaysForDateRange(
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      );

      // Define a standard set of time slots
      const standardTimeSlots = [
        "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
        "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM"
      ];

      // Add all time slots for blocked days
      for (const blockedDay of blockedDays) {
        unavailableSlots[blockedDay] = standardTimeSlots;
      }

      // Get existing bookings from the database
      const dbBookings = await db.select().from(bookings).where(
        and(
          sql`DATE(${bookings.preferredDate}) >= ${start.toISOString().split('T')[0]}`,
          sql`DATE(${bookings.preferredDate}) <= ${end.toISOString().split('T')[0]}`,
          eq(bookings.status, 'active')
        )
      );

      // Add bookings from the database to unavailable slots
      dbBookings.forEach(booking => {
        const date = booking.preferredDate.split('T')[0]; // Format: 2023-08-20
        const timeSlot = booking.appointmentTime; // Format: "9:00 AM - 12:00 PM"

        if (!unavailableSlots[date]) {
          unavailableSlots[date] = [];
        }

        if (!unavailableSlots[date].includes(timeSlot)) {
          unavailableSlots[date].push(timeSlot);
        }
      });

      res.json({
        success: true,
        unavailableSlots
      });
    } catch (error) {
      logger.error("Error fetching calendar availability:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch calendar availability"
      });
    }
  });

  // Check specific time slot availability with internal service
  app.get("/api/calendar/checkTimeSlot", async (req, res) => {
    try {
      const { date, timeSlot } = req.query;

      if (!date || !timeSlot) {
        return res.status(400).json({
          success: false,
          message: "Both date and timeSlot are required parameters"
        });
      }

      // Format date string for consistency
      const dateStr = new Date(date as string).toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Parse the date parts to avoid timezone issues
      const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
      
      // Check if the selected time is in the past
      const now = new Date();
      
      // Always check time availability regardless of date
      // Parse the timeSlot (e.g., "7:30 PM")
      const isPM = (timeSlot as string).includes('PM');
      const timeComponents = (timeSlot as string).replace(/ (AM|PM)$/, '').split(':');
      let hour = parseInt(timeComponents[0], 10);
      const minute = timeComponents.length > 1 ? parseInt(timeComponents[1], 10) : 0;
      
      // Convert to 24-hour format
      if (isPM && hour < 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      
      // Create a date with the selected time for comparison using component parts to avoid timezone issues
      const selectedDateTime = new Date(
        year, 
        month - 1, // JS months are 0-indexed
        day,
        hour,
        minute
      );
        
      // Get the configurable booking buffer hours
      let bufferHours = 2; // Default fallback value of 2 hours
      try {
        const bufferSetting = await storage.getSystemSettingByName('bookingBufferHours');
        if (bufferSetting && typeof bufferSetting.bookingBufferHours === 'number') {
          bufferHours = bufferSetting.bookingBufferHours;
        }
      } catch (bufferError) {
        logger.error("Error fetching booking buffer setting, using default:", bufferError as Error);
      }
      
      // Add the configured buffer time for bookings
      const bufferTime = new Date(now.getTime() + bufferHours * 60 * 60 * 1000);
      
      // Check if the selected time is in the past or within the buffer period
      if (selectedDateTime <= bufferTime) {
        return res.json({
          success: true,
          isAvailable: false,
          message: "This time slot is no longer available for booking"
        });
      }
      
      // Check if the selected date is in the past
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const selectedDate = new Date(dateStr);
      if (selectedDate < today) {
        // If the selected date is in the past
        return res.json({
          success: true,
          isAvailable: false,
          message: "Cannot book appointments for past dates"
        });
      }

      try {
        // Check if the time slot is already booked in the database
        const existingBookings = await db.select().from(bookings).where(
          and(
            sql`DATE(${bookings.preferredDate}) = ${dateStr}`,
            eq(bookings.appointmentTime, timeSlot as string),
            eq(bookings.status, 'active')
          )
        );

        if (existingBookings.length > 0) {
          return res.json({
            success: true,
            isAvailable: false,
            message: "This time slot is already booked"
          });
        }
      } catch (dbError) {
        // Log the error but don't fail the request
        logger.error("Database error checking bookings:", dbError as Error);
      }

      // Check if the specific time slot is available using internal service
      const isAvailable = await availabilityService.isTimeSlotAvailable(
        dateStr,
        timeSlot as string
      );

      res.json({
        success: true,
        isAvailable
      });
    } catch (error) {
      logger.error("Error checking time slot availability:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to check time slot availability"
      });
    }
  });

  // Add endpoint to get blocked time slots using internal availability service
  app.get("/api/admin/blocked-times", async (req, res) => {
    try {
      const { startDate, endDate, password } = req.query;

      // Verify admin password
      if (!verifyAdminPassword(password as string)) {
        return res.status(401).json({
          success: false,
          message: "Invalid password"
        });
      }

      // Parse dates
      const start = startDate ? (startDate as string) : new Date().toISOString().split('T')[0];
      const end = endDate ? (endDate as string) : new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0];

      // Get blocked slots from internal availability service
      const blockedSlots = availabilityService.getBlockedTimeSlotsForDateRange(start, end);

      res.json({
        success: true,
        blockedSlots
      });
    } catch (error) {
      logger.error("Error fetching blocked time slots:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch blocked time slots"
      });
    }
  });

  // Add endpoint for fetching blocked days using internal availability service
  app.get("/api/admin/blocked-days", async (req, res) => {
    try {
      const { startDate, endDate, password } = req.query;

      // Verify admin password
      if (!verifyAdminPassword(password as string)) {
        return res.status(401).json({
          success: false,
          message: "Invalid password"
        });
      }

      // Parse dates
      const start = startDate ? (startDate as string) : new Date().toISOString().split('T')[0];
      const end = endDate ? (endDate as string) : new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0];

      // Get blocked days from internal availability service
      const blockedDays = availabilityService.getBlockedDaysForDateRange(start, end);

      res.json({
        success: true,
        blockedDays
      });
    } catch (error) {
      logger.error("Error fetching blocked days:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch blocked days"
      });
    }
  });

  // Modify existing /api/admin/availability endpoint to use internal availability service
  app.post("/api/admin/availability", async (req, res) => {
    try {
      const { password, action, data } = req.body;
      logger.debug('Availability update requested', { action });

      // Verify admin password using the helper function
      if (!verifyAdminPassword(password)) {
        logger.auth('Invalid password for availability update', { action });
        return res.status(401).json({
          success: false,
          message: "Invalid password"
        });
      }

      switch (action) {
        case 'blockTimeSlot':
          const { date, timeSlots, reason } = data;
          logger.debug('Blocking time slots', { date, timeSlots });

          try {
            // Use our internal availability service
            const success = availabilityService.blockTimeSlots(date, timeSlots, reason);
            
            if (!success) {
              logger.error('Failed to block time slots', new Error('Failed to block time slots'), {
                date,
                timeSlots
              });
              return res.status(500).json({
                success: false,
                message: "Failed to block time slots. Please try again."
              });
            }
          } catch (error) {
            logger.error('Error blocking time slots', error as Error, {
              date,
              timeSlots
            });
            return res.status(500).json({
              success: false,
              message: "Failed to block time slots. Please try again."
            });
          }
          break;

        case 'blockFullDay':
          const { date: fullDate, reason: fullDayReason } = data;
          logger.debug('Blocking full day', { 
            date: fullDate,
            reason: fullDayReason
          });

          const fullDaySuccess = availabilityService.blockDay(fullDate, fullDayReason);
          if (!fullDaySuccess) {
            logger.error('Failed to block full day', new Error('Failed to block full day'), {
              date: fullDate
            });
            return res.status(500).json({
              success: false,
              message: "Failed to block full day. Please try again."
            });
          }
          break;

        default:
          logger.error('Invalid action specified', new Error('Invalid action specified'), {
            action
          });
          return res.status(400).json({
            success: false,
            message: "Invalid action specified"
          });
      }

      logger.info('Availability updated successfully', {
        action
      });

      res.json({
        success: true,
        message: "Availability updated successfully"
      });
    } catch (error) {
      logger.error('Error updating availability', error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to update availability"
      });
    }
  });

  // Booking endpoints
  app.post("/api/booking", async (req, res) => {
    try {
      logger.debug("Booking submission received:", JSON.stringify(req.body, null, 2));
      
      // First, check if we have a valid booking object before parsing
      if (!req.body || Object.keys(req.body).length === 0) {
        logger.error("Empty booking submission received");
        return res.status(400).json({
          success: false,
          message: "No booking data provided"
        });
      }
      
      try {
        const booking = bookingSchema.parse(req.body);
        logger.info("Booking validated successfully");
        
        // Check if this time slot is already booked
        const dateStr = new Date(booking.preferredDate).toISOString().split('T')[0]; // YYYY-MM-DD
        logger.debug(`Checking for existing bookings on date: ${dateStr} and time: ${booking.appointmentTime}`);
        
        // Continue with booking logic
        const existingBookings = await db.select().from(bookings).where(
          and(
            sql`DATE(${bookings.preferredDate}) = ${dateStr}`,
            eq(bookings.appointmentTime, booking.appointmentTime),
            eq(bookings.status, 'active')
          )
        );

        if (existingBookings.length > 0) {
          logger.warn("Time slot already booked, returning conflict error");
          return res.status(409).json({
            success: false,
            message: "This time slot is already booked. Please select another time."
          });
        }

        // Store the pricingBreakdown and pricingTotal as JSON strings
        let pricingBreakdownStr = null;
        if (booking.pricingBreakdown) {
          pricingBreakdownStr = JSON.stringify(booking.pricingBreakdown);
        }

        logger.debug("Preparing to insert booking into database");
        
        // Handle account creation if requested
        if (req.body.createAccount) {
          logger.info("User requested account creation during booking");
          
          try {
            // Check if user already exists
            const existingCustomer = await db.select().from(customers).where(eq(customers.email, booking.email)).limit(1);
            
            if (existingCustomer.length > 0) {
              logger.info("Customer already exists, not creating a new account");
            } else {
              // Create new customer account
              const hashedPassword = req.body.password ? await bcrypt.hash(req.body.password, 10) : null;
              logger.debug("Creating new customer account");
              
              await db.insert(customers).values({
                name: booking.name,
                email: booking.email,
                phone: booking.phone,
                streetAddress: booking.streetAddress,
                addressLine2: booking.addressLine2,
                city: booking.city,
                state: booking.state,
                zipCode: booking.zipCode,
                password: hashedPassword,
                memberSince: new Date().toISOString(),
                isVerified: true, // Auto-verify since they're creating during booking
                loyaltyPoints: 0
              });
              
              logger.info("Customer account created successfully");
            }
          } catch (accountError) {
            // Log error but continue with booking
            logger.error("Error creating customer account:", accountError);
          }
        }
        
        // Insert into database
        const insertedBookings = await db.insert(bookings).values({
          name: booking.name,
          email: booking.email,
          phone: booking.phone,
          streetAddress: booking.streetAddress,
          addressLine2: booking.addressLine2,
          city: booking.city,
          state: booking.state,
          zipCode: booking.zipCode,
          notes: booking.notes,
          serviceType: booking.serviceType,
          preferredDate: booking.preferredDate,
          appointmentTime: booking.appointmentTime,
          status: 'active',
          pricingTotal: booking.pricingTotal ? booking.pricingTotal.toString() : null,
          pricingBreakdown: pricingBreakdownStr
        }).returning();

        logger.info("Booking successfully inserted into database");
        const newBooking = insertedBookings[0];

        // Also save to file storage for backward compatibility
        const bookingWithId = {
          ...booking,
          id: newBooking.id.toString(),
          createdAt: new Date()
        };

        fileBookings.push(bookingWithId);
        saveBookings(fileBookings);

        // Send customer confirmation email
        let customerEmailSent = false;
        let adminEmailSent = false;
        
        if (process.env.SENDGRID_API_KEY) {
          try {
            customerEmailSent = await sendBookingConfirmationEmail(bookingWithId);
            logger.info(`Customer confirmation email sent successfully: ${customerEmailSent}`);
          } catch (error: any) {
            logger.error("Error sending customer confirmation email:", error as Error);
            if (error?.response) {
              logger.error("SendGrid API error response for customer email:", error.response.body);
            }
            // We don't want to fail the booking if notifications fail
          }
          
          // Send admin notification email separately
          try {
            adminEmailSent = await sendAdminNotificationEmail(bookingWithId);
            logger.info(`Admin notification email sent successfully: ${adminEmailSent}`);
          } catch (error: any) {
            logger.error("Error sending admin notification email:", error as Error);
            if (error?.response) {
              logger.error("SendGrid API error response for admin email:", error.response.body);
            }
            // We don't want to fail the booking if notifications fail
          }
          
          logger.info(`Email sending summary - Customer: ${customerEmailSent}, Admin: ${adminEmailSent}`);
        }

        // Return success response
        res.status(200).json({
          success: true,
          message: "Booking confirmed successfully",
          booking: bookingWithId
        });
        
        // Exit the nested try/catch block
        return;
      } catch (parseError) {
        logger.error("Booking schema validation failed:", parseError);
        if (parseError instanceof ZodError) {
          return res.status(400).json({
            success: false,
            message: "Invalid booking data",
            errors: parseError.errors
          });
        }
        throw parseError;
      }
    } catch (error) {
      logger.error("Booking validation error:", error as Error);

      if (error instanceof ZodError) {
        logger.error("Zod validation errors:", new Error(JSON.stringify(error.errors, null, 2)));
        return res.status(400).json({
          success: false,
          message: "Invalid booking data",
          errors: error.errors
        });
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      const stackTrace = error instanceof Error ? error.stack : 'No stack trace available';
      
      logger.error(`Booking submission error details: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
      logger.debug(`Stack trace: ${stackTrace}`);

      res.status(500).json({
        success: false,
        message: "An error occurred while processing your booking"
      });
    }
  });

  // Get all bookings
  app.get("/api/bookings", async (req, res) => {
    try {
      const dbBookings = await db.select().from(bookings).orderBy(bookings.preferredDate);

      // Format bookings to match expected structure
      const formattedBookings = dbBookings.map(booking => {
        let pricingBreakdown = null;
        if (booking.pricingBreakdown) {
          try {
            // Try to parse the JSON
            pricingBreakdown = JSON.parse(booking.pricingBreakdown);
          } catch (e) {
            logger.error('Error parsing pricingBreakdown JSON:', e as Error);
            // Log the problematic data for debugging
            logger.info('Attempting to fix problematic pricing data');
            
            try {
              // Function to help with deeply nested JSON
              const fixNestedJson = (jsonStr: string) => {
                // First, handle the case of over-escaped JSON (common in the DB)
                if (jsonStr.includes('\\"')) {
                  try {
                    // Try to parse it as a JSON string that contains escaped JSON
                    const unescaped = JSON.parse(`"${jsonStr.replace(/^"|"$/g, '').replace(/\\"/g, '"')}"`);
                    return JSON.parse(unescaped);
                  } catch (error) {
                    // Failed to parse as nested JSON
                  }
                }
                
                // Replace single quotes with double quotes
                let fixedJson = jsonStr.replace(/'/g, '"');
                
                // Add missing quotes around property names
                fixedJson = fixedJson.replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
                
                // Add missing quotes around property values that are not numbers or booleans
                fixedJson = fixedJson.replace(/:\s*([a-zA-Z][a-zA-Z0-9_]*)\s*([,}])/g, ':"$1"$2');
                
                return JSON.parse(fixedJson);
              };
              
              // Replace double-escaped quotes
              let intermediateJson = booking.pricingBreakdown
                .replace(/\\\\"/g, '\\"') // Replace \\" with \"
                .replace(/\\"/g, '"')     // Replace \" with "
                .replace(/"{/g, '{')      // Replace "{ with {
                .replace(/}"/g, '}');     // Replace }" with }
              
              // Handle the case where the string might be an array-like string with JSON objects
              if (intermediateJson.startsWith('"[') || intermediateJson.endsWith(']"')) {
                intermediateJson = intermediateJson.replace(/^"|"$/g, '');
              }
              
              // Try to parse the fixed JSON
              pricingBreakdown = JSON.parse(intermediateJson);
              logger.info('Successfully fixed and parsed JSON with intermediate approach');
            } catch (intermediateError) {
              try {
                // As a last resort, try to extract valid JSON substrings
                const jsonMatches = booking.pricingBreakdown.match(/\{[^{}]*\}/g);
                if (jsonMatches && jsonMatches.length > 0) {
                  pricingBreakdown = jsonMatches.map(jsonStr => {
                    try {
                      return JSON.parse(jsonStr.replace(/\\"/g, '"'));
                    } catch (err) {
                      return null;
                    }
                  }).filter(Boolean);
                  
                  logger.info('Extracted valid JSON objects from malformed string');
                } else {
                  // If all attempts fail, create a basic empty object
                  logger.error('Could not extract valid JSON objects');
                  pricingBreakdown = {};
                }
              } catch (finalError) {
                // If all attempts fail, create a basic empty object
                logger.error('All JSON parsing attempts failed:', finalError as Error);
                pricingBreakdown = {};
              }
            }
          }
        }

        return {
          ...booking,
          id: booking.id.toString(),
          pricingTotal: booking.pricingTotal ? parseFloat(booking.pricingTotal) : null,
          pricingBreakdown,
          createdAt: booking.createdAt?.toISOString()
        };
      });

      res.json({ bookings: formattedBookings });
    } catch (error) {
      logger.error("Error fetching bookings:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch bookings"
      });
    }
  });

  // Get booking by ID
  app.get("/api/booking/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID"
        });
      }

      const result = await db.select().from(bookings).where(eq(bookings.id, id));

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Booking not found"
        });
      }

      const booking = result[0];

      // Parse pricing breakdown if it exists
      let pricingBreakdown = null;
      if (booking.pricingBreakdown) {
        try {
          // Try to parse the JSON
          pricingBreakdown = JSON.parse(booking.pricingBreakdown);
        } catch (e) {
          logger.error('Error parsing pricingBreakdown JSON:', e as Error);
          // Log the problematic data for debugging
          logger.info('Attempting to fix problematic pricing data');
            
          try {
            // Function to help with deeply nested JSON
            const fixNestedJson = (jsonStr: string) => {
              // First, handle the case of over-escaped JSON (common in the DB)
              if (jsonStr.includes('\\"')) {
                try {
                  // Try to parse it as a JSON string that contains escaped JSON
                  const unescaped = JSON.parse(`"${jsonStr.replace(/^"|"$/g, '').replace(/\\"/g, '"')}"`);
                  return JSON.parse(unescaped);
                } catch (error) {
                  // Failed to parse as nested JSON
                }
              }
              
              // Replace single quotes with double quotes
              let fixedJson = jsonStr.replace(/'/g, '"');
              
              // Add missing quotes around property names
              fixedJson = fixedJson.replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
              
              // Add missing quotes around property values that are not numbers or booleans
              fixedJson = fixedJson.replace(/:\s*([a-zA-Z][a-zA-Z0-9_]*)\s*([,}])/g, ':"$1"$2');
              
              return JSON.parse(fixedJson);
            };
            
            // Replace double-escaped quotes
            let intermediateJson = booking.pricingBreakdown
              .replace(/\\\\"/g, '\\"') // Replace \\" with \"
              .replace(/\\"/g, '"')     // Replace \" with "
              .replace(/"{/g, '{')      // Replace "{ with {
              .replace(/}"/g, '}');     // Replace }" with }
            
            // Handle the case where the string might be an array-like string with JSON objects
            if (intermediateJson.startsWith('"[') || intermediateJson.endsWith(']"')) {
              intermediateJson = intermediateJson.replace(/^"|"$/g, '');
            }
            
            // Try to parse the fixed JSON
            pricingBreakdown = JSON.parse(intermediateJson);
            logger.info('Successfully fixed and parsed JSON with intermediate approach');
          } catch (intermediateError) {
            try {
              // As a last resort, try to extract valid JSON substrings
              const jsonMatches = booking.pricingBreakdown.match(/\{[^{}]*\}/g);
              if (jsonMatches && jsonMatches.length > 0) {
                pricingBreakdown = jsonMatches.map((jsonStr: string) => {
                  try {
                    return JSON.parse(jsonStr.replace(/\\"/g, '"'));
                  } catch (err) {
                    return null;
                  }
                }).filter(Boolean);
                
                logger.info('Extracted valid JSON objects from malformed string');
              } else {
                // If all attempts fail, create a basic empty object
                logger.error('Could not extract valid JSON objects');
                pricingBreakdown = {};
              }
            } catch (finalError) {
              // If all attempts fail, create a basic empty object
              logger.error('All JSON parsing attempts failed:', finalError as Error);
              pricingBreakdown = {};
            }
          }
        }
      }

      const formattedBooking = {
        ...booking,
        id: booking.id.toString(),
        pricingTotal: booking.pricingTotal ? parseFloat(booking.pricingTotal) : null,
        pricingBreakdown,
        createdAt: booking.createdAt?.toISOString()
      };

      res.json({ success: true, booking: formattedBooking });
    } catch (error) {
      logger.error("Error fetching booking:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch booking"
      });
    }
  });

  // Update booking status (e.g., for cancellations)
  app.post("/api/bookings/:id/cancel", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID"
        });
      }

      // Update the booking in the database
      const result = await db.update(bookings)
        .set({
          status: 'cancelled',
          notes: reason ? `CANCELLED - Reason: ${reason}` : 'CANCELLED'
        })
        .where(eq(bookings.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Booking not found"
        });
      }

      // Also update in file storage for backward compatibility
      fileBookings = fileBookings.map(b => {
        if (b.id === id.toString()) {
          return { ...b, status: 'cancelled', notes: reason ? `CANCELLED - Reason: ${reason}` : 'CANCELLED' };
        }
        return b;
      });
      saveBookings(fileBookings);

      res.json({
        success: true,
        message: "Booking cancelled successfully"
      });
    } catch (error) {
      logger.error("Error cancelling booking:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to cancel booking"
      });
    }
  });

  app.post("/api/bookings/:id/approve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID"
        });
      }

      // Update the booking in the database
      const result = await db.update(bookings)
        .set({ status: 'active' })
        .where(eq(bookings.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Booking not found"
        });
      }

      // Also update in file storage for backward compatibility
      fileBookings = fileBookings.map(b => {
        if (b.id === id.toString()) {
          return { ...b, status: 'active' };
        }
        return b;
      });
      saveBookings(fileBookings);

      // Send confirmation email
      try {
        if (process.env.SENDGRID_API_KEY) {
          const booking = result[0];
          await sendBookingConfirmationEmail(booking);
          logger.info("Confirmation email sent successfully");
        }
      } catch (error) {
        logger.error("Error sending confirmation:", error as Error);
        // Don't fail the approval if email fails
      }

      res.json({
        success: true,
        message: "Booking approved successfully"
      });
    } catch (error) {
      logger.error("Error approving booking:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to approve booking"
      });
    }
  });

  app.post("/api/bookings/:id/decline", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID"
        });
      }

      // Update the booking in the database
      const result = await db.update(bookings)
        .set({
          status: 'cancelled',
          notes: reason ? `DECLINED - Reason: ${reason}` : 'DECLINED'
        })
        .where(eq(bookings.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Booking not found"
        });
      }

      // Also update in file storage for backward compatibility
      fileBookings = fileBookings.map(b => {
        if (b.id === id.toString()) {
          return { ...b, status: 'cancelled', notes: reason ? `DECLINED - Reason: ${reason}` : 'DECLINED' };
        }
        return b;
      });
      saveBookings(fileBookings);

      res.json({
        success: true,
        message: "Booking declined successfully"
      });
    } catch (error) {
      logger.error("Error declining booking:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to decline booking"
      });
    }
  });

  // Update booking details (Quick Edit)
  app.put("/api/bookings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = {...req.body};
      const sendUpdateEmail = updates.sendUpdateEmail === true;
      
      // Remove the sendUpdateEmail flag from updates so it doesn't get stored
      if (updates.sendUpdateEmail !== undefined) {
        delete updates.sendUpdateEmail;
      }
      
      // Make sure createdAt is a proper Date object if it exists
      if (updates.createdAt && typeof updates.createdAt === 'string') {
        // Don't send createdAt in update - it will be preserved
        delete updates.createdAt;
      }

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID"
        });
      }

      // First, get the original booking for comparison if we need to send an email
      let originalBooking = null;
      if (sendUpdateEmail) {
        const bookingResult = await db.select().from(bookings).where(eq(bookings.id, id));
        if (bookingResult.length > 0) {
          originalBooking = bookingResult[0];
        } else {
          return res.status(404).json({
            success: false,
            message: "Booking not found"
          });
        }
      }
      
      // Handle pricingBreakdown - if it's a string, parse it
      if (typeof updates.pricingBreakdown === 'string') {
        try {
          // Try to parse the JSON
          updates.pricingBreakdown = JSON.parse(updates.pricingBreakdown);
        } catch (e) {
          logger.error('Error parsing pricingBreakdown JSON in update:', e as Error);
          // Log the problematic data for debugging
          logger.info('Attempting to fix problematic pricing data in update');
          
          try {
            // Function to help with deeply nested JSON
            const fixNestedJson = (jsonStr: string) => {
              // First, handle the case of over-escaped JSON (common in the DB)
              if (jsonStr.includes('\\"')) {
                try {
                  // Try to parse it as a JSON string that contains escaped JSON
                  const unescaped = JSON.parse(`"${jsonStr.replace(/^"|"$/g, '').replace(/\\"/g, '"')}"`);
                  return JSON.parse(unescaped);
                } catch (error) {
                  // Failed to parse as nested JSON
                }
              }
              
              // Replace single quotes with double quotes
              let fixedJson = jsonStr.replace(/'/g, '"');
              
              // Add missing quotes around property names
              fixedJson = fixedJson.replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
              
              // Add missing quotes around property values that are not numbers or booleans
              fixedJson = fixedJson.replace(/:\s*([a-zA-Z][a-zA-Z0-9_]*)\s*([,}])/g, ':"$1"$2');
              
              return JSON.parse(fixedJson);
            };
            
            // Replace double-escaped quotes
            let intermediateJson = updates.pricingBreakdown
              .replace(/\\\\"/g, '\\"') // Replace \\" with \"
              .replace(/\\"/g, '"')     // Replace \" with "
              .replace(/"{/g, '{')      // Replace "{ with {
              .replace(/}"/g, '}');     // Replace }" with }
            
            // Handle the case where the string might be an array-like string with JSON objects
            if (intermediateJson.startsWith('"[') || intermediateJson.endsWith(']"')) {
              intermediateJson = intermediateJson.replace(/^"|"$/g, '');
            }
            
            // Try to parse the fixed JSON
            updates.pricingBreakdown = JSON.parse(intermediateJson);
            logger.info('Successfully fixed and parsed JSON with intermediate approach in update');
          } catch (intermediateError) {
            try {
              // As a last resort, try to extract valid JSON substrings
              const jsonMatches = updates.pricingBreakdown.match(/\{[^{}]*\}/g);
              if (jsonMatches && jsonMatches.length > 0) {
                updates.pricingBreakdown = jsonMatches.map((jsonStr: string) => {
                  try {
                    return JSON.parse(jsonStr.replace(/\\"/g, '"'));
                  } catch (err) {
                    return null;
                  }
                }).filter(Boolean);
                
                logger.info('Extracted valid JSON objects from malformed string in update');
              } else {
                // If all attempts fail, create a basic empty object
                logger.error('Could not extract valid JSON objects in update');
                updates.pricingBreakdown = {};
              }
            } catch (finalError) {
              // If all attempts fail, create a basic empty object
              logger.error('All JSON parsing attempts failed in update:', finalError as Error);
              updates.pricingBreakdown = {};
            }
          }
        }
      }

      // Update the booking in the database
      const result = await db.update(bookings)
        .set(updates)
        .where(eq(bookings.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Booking not found"
        });
      }

      // Also update in file storage for backward compatibility
      fileBookings = fileBookings.map(b => {
        if (b.id === id.toString()) {
          return { ...b, ...updates };
        }
        return b;
      });
      saveBookings(fileBookings);

      // Send notification email if requested
      let emailSent = false;
      if (sendUpdateEmail && originalBooking) {
        try {
          // Import the email service function
          const { sendBookingUpdateEmail } = await import('./services/emailService');
          
          // Calculate what fields have changed
          const updatedBooking = result[0];
          const changes: Record<string, any> = {};
          
          // Compare fields and add to changes if they're different
          for (const key in updates) {
            if (Object.prototype.hasOwnProperty.call(updates, key) && 
                updates[key] !== originalBooking[key]) {
              changes[key] = updates[key];
            }
          }
          
          // Only send email if there were actual changes
          if (Object.keys(changes).length > 0) {
            emailSent = await sendBookingUpdateEmail(updatedBooking, changes);
            logger.info(`Booking update email ${emailSent ? 'sent' : 'failed to send'} for booking ID ${id}`);
          } else {
            logger.info(`No changes detected for booking ID ${id}, skipping update email`);
          }
        } catch (emailError) {
          logger.error("Error sending booking update email:", emailError as Error);
        }
      }

      res.json({
        success: true,
        message: "Booking updated successfully",
        booking: result[0],
        emailSent: sendUpdateEmail ? emailSent : null
      });
    } catch (error) {
      logger.error("Error updating booking:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to update booking"
      });
    }
  });

  // Customer API Endpoints
  
  // Register a new customer
  app.post("/api/customers/register", async (req: Request, res: Response) => {
    try {
      const { name, email, phone, password, streetAddress, addressLine2, city, state, zipCode } = req.body;
      
      // Validate input data
      try {
        insertCustomerSchema.parse({
          name,
          email,
          phone,
          password,
          streetAddress,
          addressLine2,
          city,
          state,
          zipCode
        });
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          return res.status(400).json({
            success: false,
            message: "Invalid customer data",
            errors: validationError.errors
          });
        }
        throw validationError;
      }
      
      // Check if customer already exists
      const existingCustomer = await storage.getCustomerByEmail(email);
      
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: "A customer with this email already exists"
        });
      }
      
      // Create new customer
      const newCustomer = await storage.createCustomer({
        name,
        email,
        phone,
        password,
        streetAddress,
        addressLine2,
        city,
        state,
        zipCode,
        loyaltyPoints: 0
      });
      
      // Don't return the password
      const { password: _, ...customerWithoutPassword } = newCustomer;
      
      res.status(201).json({
        success: true,
        message: "Customer registered successfully",
        customer: customerWithoutPassword
      });
    } catch (error) {
      logger.error("Error registering customer:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to register customer"
      });
    }
  });
  
  // Customer login
  app.post("/api/customers/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      // Validate credentials
      const customer = await storage.validateCustomerCredentials(email, password);
      
      if (!customer) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }
      
      // Don't return the password
      const { password: _, ...customerWithoutPassword } = customer;
      
      res.json({
        success: true,
        message: "Login successful",
        customer: customerWithoutPassword
      });
    } catch (error) {
      logger.error("Error logging in customer:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to login"
      });
    }
  });
  
  // Get customer profile
  app.get("/api/customers/profile/:id", async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      
      if (isNaN(customerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID"
        });
      }
      
      const customer = await storage.getCustomerById(customerId);
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }
      
      // Don't return the password
      const { password, ...customerWithoutPassword } = customer;
      
      res.json({
        success: true,
        customer: customerWithoutPassword
      });
    } catch (error) {
      logger.error("Error fetching customer profile:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch customer profile"
      });
    }
  });
  
  // Update customer profile
  app.put("/api/customers/profile/:id", async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      const updates = req.body;
      
      if (isNaN(customerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID"
        });
      }
      
      // Don't allow updating the email or loyalty points directly
      delete updates.email;
      delete updates.loyaltyPoints;
      delete updates.memberSince;
      delete updates.lastLogin;
      delete updates.verificationToken;
      delete updates.isVerified;
      delete updates.passwordResetToken;
      delete updates.passwordResetExpires;
      
      const updatedCustomer = await storage.updateCustomer(customerId, updates);
      
      // Don't return the password
      const { password, ...customerWithoutPassword } = updatedCustomer;
      
      res.json({
        success: true,
        message: "Profile updated successfully",
        customer: customerWithoutPassword
      });
    } catch (error) {
      logger.error("Error updating customer profile:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to update profile"
      });
    }
  });

  // Push Notification API Endpoints
  
  // Get VAPID public key for web push subscription
  app.get("/api/push/vapid-public-key", (req: Request, res: Response) => {
    try {
      const publicKey = pushNotificationService.getPublicKey();
      
      res.json({
        success: true,
        publicKey
      });
    } catch (error) {
      logger.error('Error getting VAPID public key', error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to get VAPID public key"
      });
    }
  });
  
  // Save push subscription for a customer
  app.post("/api/customers/:id/push-subscription", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      const { subscription } = req.body;
      
      // Validate the subscription object
      try {
        const validatedSubscription = pushSubscriptionSchema.parse(subscription);
        
        // Check if user exists
        const user = await storage.getCustomerById(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found"
          });
        }
        
        // Save the subscription
        const success = await pushNotificationService.saveSubscription(userId, validatedSubscription);
        
        if (!success) {
          return res.status(500).json({
            success: false,
            message: "Failed to save push subscription"
          });
        }
        
        // Send a test notification to confirm subscription
        await pushNotificationService.sendNotification(
          userId,
          "Notifications Enabled",
          "You will now receive booking notifications from Picture Perfect TV Install."
        );
        
        res.json({
          success: true,
          message: "Push subscription saved successfully"
        });
      } catch (validationError) {
        logger.error('Invalid push subscription format', validationError as Error);
        return res.status(400).json({
          success: false,
          message: "Invalid push subscription format"
        });
      }
    } catch (error) {
      logger.error('Error saving push subscription', error as Error);
      res.status(500).json({
        success: false,
        message: "An error occurred while saving push subscription"
      });
    }
  });
  
  // Update notification settings for a customer
  app.put("/api/customers/:id/notification-settings", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      const { settings, enabled } = req.body;
      
      // Check if user exists
      const user = await storage.getCustomerById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      // Update database record
      const updateData: any = {};
      
      // Update notification enabled/disabled status if provided
      if (typeof enabled === 'boolean') {
        updateData.notificationsEnabled = enabled;
        
        // If notifications are being disabled, we don't need to update settings
        if (!enabled) {
          await pushNotificationService.disableNotifications(userId);
          
          return res.json({
            success: true,
            message: "Notifications disabled successfully"
          });
        }
      }
      
      // Update notification settings if provided
      if (settings) {
        try {
          const validatedSettings = notificationSettingsSchema.parse(settings);
          updateData.notificationSettings = validatedSettings;
          
          // Update the user's notification settings
          await db.update(customers)
            .set({ notificationSettings: validatedSettings as any })
            .where(eq(customers.id, userId));
          
          res.json({
            success: true,
            message: "Notification settings updated successfully"
          });
        } catch (validationError) {
          logger.error('Invalid notification settings format', validationError as Error);
          return res.status(400).json({
            success: false,
            message: "Invalid notification settings format"
          });
        }
      } else {
        res.json({
          success: true,
          message: "No changes made to notification settings"
        });
      }
    } catch (error) {
      logger.error('Error updating notification settings', error as Error);
      res.status(500).json({
        success: false,
        message: "An error occurred while updating notification settings"
      });
    }
  });
  
  // Get customer bookings
  app.get("/api/customers/:id/bookings", async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      
      if (isNaN(customerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID"
        });
      }
      
      const bookings = await storage.getCustomerBookings(customerId);
      
      res.json({
        success: true,
        bookings
      });
    } catch (error) {
      logger.error("Error fetching customer bookings:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch bookings"
      });
    }
  });
  
  // Customer update their booking
  app.put("/api/customers/bookings/:id", async (req: Request, res: Response) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { preferredDate, appointmentTime, notes, status } = req.body;
      
      if (isNaN(bookingId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID"
        });
      }
      
      // Load the existing booking
      const existingBookingResult = await db.select().from(bookings).where(eq(bookings.id, bookingId));
      
      if (existingBookingResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Booking not found"
        });
      }
      
      const existingBooking = existingBookingResult[0];
      
      // Only allow editing of active bookings (except for cancellation)
      if (existingBooking.status !== 'active' && status !== 'cancelled') {
        return res.status(400).json({
          success: false,
          message: "Only active bookings can be updated"
        });
      }
      
      // If this is a cancellation, we don't need to check for time slot conflicts
      // Otherwise check if this time slot is already booked by someone else
      if (status !== 'cancelled' && preferredDate && appointmentTime) {
        const existingBookings = await db.select().from(bookings).where(
          and(
            sql`DATE(${bookings.preferredDate}) = ${preferredDate}`,
            eq(bookings.appointmentTime, appointmentTime),
            eq(bookings.status, 'active'),
            sql`${bookings.id} != ${bookingId}`
          )
        );
        
        if (existingBookings.length > 0) {
          return res.status(409).json({
            success: false,
            message: "This time slot is already booked. Please select another time."
          });
        }
      }
      
      // Prepare updates
      const updates: any = {};
      if (preferredDate) updates.preferredDate = preferredDate;
      if (appointmentTime) updates.appointmentTime = appointmentTime;
      if (notes !== undefined) updates.notes = notes;
      if (status) updates.status = status;
      
      // Update the booking
      const result = await db.update(bookings)
        .set(updates)
        .where(eq(bookings.id, bookingId))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Failed to update booking"
        });
      }
      
      // Send appropriate notification email
      try {
        if (status === 'cancelled') {
          // Import the email service function for cancellation
          const { sendBookingCancellationEmail } = await import('./services/emailService');
          
          // Send cancellation email
          await sendBookingCancellationEmail(result[0]);
          logger.info(`Customer booking cancellation email sent for booking ID ${bookingId}`);
        } else {
          // Import the email service function for updates
          const { sendBookingUpdateEmail } = await import('./services/emailService');
          
          // Send update email
          await sendBookingUpdateEmail(result[0], updates);
          logger.info(`Customer booking update email sent for booking ID ${bookingId}`);
        }
      } catch (emailError) {
        logger.error("Error sending customer booking email:", emailError as Error);
        // We don't want to fail the request if the email fails
      }
      
      res.json({
        success: true,
        message: status === 'cancelled' ? "Booking cancelled successfully" : "Booking updated successfully",
        booking: result[0]
      });
    } catch (error) {
      logger.error("Error updating customer booking:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to update booking"
      });
    }
  });
  
  // Reset password request
  app.post("/api/customers/reset-password-request", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      // Request password reset
      const resetToken = await storage.requestPasswordReset(email);
      
      // Even if the email doesn't exist, still return success
      // This is to prevent email enumeration attacks
      res.json({
        success: true,
        message: "If your email exists in our system, you will receive a password reset link shortly"
      });
      
      // If a token was generated, send an email with the reset link
      if (resetToken) {
        // TODO: Implement sending reset email here
        logger.info(`Password reset requested for ${email}. Token: ${resetToken}`);
      }
    } catch (error) {
      logger.error("Error requesting password reset:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to process password reset request"
      });
    }
  });
  
  // Reset password
  app.post("/api/customers/reset-password", async (req: Request, res: Response) => {
    try {
      const { email, token, newPassword } = req.body;
      
      if (!email || !token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields"
        });
      }
      
      // Try to reset the password
      const success = await storage.resetPassword(email, token, newPassword);
      
      if (!success) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset token"
        });
      }
      
      res.json({
        success: true,
        message: "Password reset successful"
      });
    } catch (error) {
      logger.error("Error resetting password:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to reset password"
      });
    }
  });
  
  // Verify customer email
  app.get("/api/customers/verify/:email/:token", async (req: Request, res: Response) => {
    try {
      const { email, token } = req.params;
      
      const success = await storage.verifyCustomer(email, token);
      
      if (!success) {
        return res.status(400).json({
          success: false,
          message: "Invalid verification token"
        });
      }
      
      res.json({
        success: true,
        message: "Email verified successfully"
      });
    } catch (error) {
      logger.error("Error verifying email:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to verify email"
      });
    }
  });
  
  // Admin customer management endpoints
  
  // List all customers (admin)
  app.get("/api/admin/customers", async (req: Request, res: Response) => {
    try {
      const { password } = req.query;
      
      if (!verifyAdminPassword(password as string)) {
        return res.status(401).json({
          success: false,
          message: "Invalid password"
        });
      }
      
      // Get all customers from database
      const result = await db.select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        streetAddress: customers.streetAddress,
        city: customers.city,
        state: customers.state,
        zipCode: customers.zipCode,
        loyaltyPoints: customers.loyaltyPoints,
        memberSince: customers.memberSince,
        lastLogin: customers.lastLogin,
        isVerified: customers.isVerified
      }).from(customers);
      
      res.json({
        success: true,
        customers: result
      });
    } catch (error) {
      logger.error("Error fetching customers:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch customers"
      });
    }
  });
  
  // Get customer details (admin)
  app.get("/api/admin/customers/:id", async (req: Request, res: Response) => {
    try {
      const { password } = req.query;
      const customerId = parseInt(req.params.id);
      
      if (!verifyAdminPassword(password as string)) {
        return res.status(401).json({
          success: false,
          message: "Invalid password"
        });
      }
      
      if (isNaN(customerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID"
        });
      }
      
      const customer = await storage.getCustomerById(customerId);
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }
      
      // Don't return the password
      const { password: _, ...customerWithoutPassword } = customer;
      
      res.json({
        success: true,
        customer: customerWithoutPassword
      });
    } catch (error) {
      logger.error("Error fetching customer details:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch customer details"
      });
    }
  });
  
  // Update customer (admin)
  app.put("/api/admin/customers/:id", async (req: Request, res: Response) => {
    try {
      const { password, ...updates } = req.body;
      const customerId = parseInt(req.params.id);
      
      if (!verifyAdminPassword(password)) {
        return res.status(401).json({
          success: false,
          message: "Invalid password"
        });
      }
      
      if (isNaN(customerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID"
        });
      }
      
      const updatedCustomer = await storage.updateCustomer(customerId, updates);
      
      // Don't return the password
      const { password: _, ...customerWithoutPassword } = updatedCustomer;
      
      res.json({
        success: true,
        message: "Customer updated successfully",
        customer: customerWithoutPassword
      });
    } catch (error) {
      logger.error("Error updating customer:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to update customer"
      });
    }
  });
  
  // Admin endpoints
  // The adminPassword variable is no longer needed here because it's managed by verifyAdminPassword function.


  // Admin login
  app.post("/api/admin/login", (req: Request, res: Response) => {
    const { password } = req.body;

    if (verifyAdminPassword(password)) {
      res.json({
        success: true,
        message: "Login successful"
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }
  });

  // Reset admin password
  app.post("/api/admin/reset-password", (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    if (verifyAdminPassword(currentPassword)) {
      // Update password (This updates the environment variable, not a local variable)
      process.env.ADMIN_PASSWORD = newPassword;
      res.json({
        success: true,
        message: "Password updated successfully"
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }
  });

  // Clear all bookings
  app.post("/api/admin/clear-bookings", async (req: Request, res: Response) => {
    try {
      const { password } = req.body;

      // Verify admin password
      if (!verifyAdminPassword(password)) {
        return res.status(401).json({
          success: false,
          message: "Invalid password"
        });
      }

      // Clear bookings from database
      await db.delete(bookings);

      // Clear bookings from file storage
      fileBookings = [];
      saveBookings(fileBookings);

      res.json({
        success: true,
        message: "All bookings have been cleared"
      });
    } catch (error) {
      logger.error("Error clearing bookings:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to clear bookings"
      });
    }
  });
  
  // Business Hours endpoints
  
  // Get all business hours (Admin)
  app.get("/api/admin/business-hours", async (req: Request, res: Response) => {
    try {
      const { password } = req.query;
      
      if (!verifyAdminPassword(password as string)) {
        return res.status(401).json({
          success: false,
          message: "Invalid password"
        });
      }
      
      const businessHours = await storage.getBusinessHours();
      
      res.json({
        success: true,
        businessHours
      });
    } catch (error) {
      logger.error('Error fetching business hours', error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch business hours"
      });
    }
  });
  
  // Get all business hours (Public) - No authentication needed
  app.get("/api/business-hours", async (req: Request, res: Response) => {
    try {
      const businessHours = await storage.getBusinessHours();
      
      logger.debug('Fetched business hours for client', { 
        businessHoursCount: businessHours.length
      });
      
      res.json({
        success: true,
        businessHours
      });
    } catch (error) {
      logger.error('Error fetching business hours for client', error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch business hours"
      });
    }
  });
  
  // Get business hours for specific day
  app.get("/api/admin/business-hours/:dayOfWeek", async (req: Request, res: Response) => {
    try {
      const { password } = req.query;
      const dayOfWeek = parseInt(req.params.dayOfWeek);
      
      if (!verifyAdminPassword(password as string)) {
        return res.status(401).json({
          success: false,
          message: "Invalid password"
        });
      }
      
      // Validate day of week
      if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return res.status(400).json({
          success: false,
          message: "Invalid day of week. Must be a number between 0 (Sunday) and 6 (Saturday)"
        });
      }
      
      const hours = await storage.getBusinessHoursForDay(dayOfWeek);
      
      if (!hours) {
        return res.status(404).json({
          success: false,
          message: "Business hours not found for the specified day"
        });
      }
      
      res.json({
        success: true,
        businessHours: hours
      });
    } catch (error) {
      logger.error('Error fetching business hours for day', error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch business hours for the specified day"
      });
    }
  });
  
  // Update business hours for a specific day
  app.post("/api/admin/business-hours/:dayOfWeek", async (req: Request, res: Response) => {
    try {
      const { password, startTime, endTime, isAvailable } = req.body;
      const dayOfWeek = parseInt(req.params.dayOfWeek);
      
      if (!verifyAdminPassword(password)) {
        return res.status(401).json({
          success: false,
          message: "Invalid password"
        });
      }
      
      // Validate day of week
      if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return res.status(400).json({
          success: false,
          message: "Invalid day of week. Must be a number between 0 (Sunday) and 6 (Saturday)"
        });
      }
      
      // Validate input data
      try {
        businessHoursSchema.parse({
          dayOfWeek,
          startTime,
          endTime,
          isAvailable: isAvailable !== undefined ? isAvailable : true
        });
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          return res.status(400).json({
            success: false,
            message: "Invalid business hours data",
            errors: validationError.errors
          });
        }
        throw validationError;
      }
      
      // Update business hours in storage
      const updatedHours = await storage.updateBusinessHours(dayOfWeek, {
        startTime,
        endTime,
        isAvailable: isAvailable !== undefined ? isAvailable : true
      });
      
      res.json({
        success: true,
        message: "Business hours updated successfully",
        businessHours: updatedHours
      });
    } catch (error) {
      logger.error('Error updating business hours', error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to update business hours"
      });
    }
  });
  
  // API endpoint to get booking archives
  app.get("/api/booking-archives", async (req: Request, res: Response) => {
    try {
      // Verify admin password
      const password = req.query.adminPassword as string;
      if (!verifyAdminPassword(password)) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - Invalid admin password"
        });
      }
      
      // Get archives from the database
      const archives = await storage.getBookingArchives();
      
      // Sort by archivedAt date, most recent first
      archives.sort((a, b) => {
        if (!a.archivedAt || !b.archivedAt) return 0;
        return new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime();
      });
      
      res.json({
        success: true,
        archives
      });
    } catch (error) {
      logger.error('Error fetching booking archives', error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch booking archives"
      });
    }
  });

  // System Settings API Routes
  app.get("/api/admin/system-settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json({
        success: true,
        settings
      });
    } catch (error) {
      logger.error('Error fetching system settings', error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch system settings"
      });
    }
  });
  
  app.get("/api/admin/system-settings/:name", async (req: Request, res: Response) => {
    try {
      const name = req.params.name;
      const setting = await storage.getSystemSettingByName(name);
      
      if (!setting) {
        return res.status(404).json({
          success: false,
          message: "System setting not found"
        });
      }
      
      res.json({
        success: true,
        setting
      });
    } catch (error) {
      logger.error('Error fetching system setting', error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch system setting"
      });
    }
  });
  
  app.post("/api/admin/system-settings/:name", async (req: Request, res: Response) => {
    try {
      const { password, value } = req.body;
      const name = req.params.name;
      
      if (!verifyAdminPassword(password)) {
        return res.status(401).json({
          success: false,
          message: "Invalid password"
        });
      }
      
      if (value === undefined) {
        return res.status(400).json({
          success: false,
          message: "Value is required"
        });
      }
      
      const updatedSetting = await storage.updateSystemSetting(name, value);
      res.json({
        success: true,
        message: "System setting updated successfully",
        setting: updatedSetting
      });
    } catch (error) {
      logger.error('Error updating system setting', error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to update system setting"
      });
    }
  });
  
  // Public API for system settings (only specific settings)
  app.get("/api/system-settings/booking-buffer", async (req: Request, res: Response) => {
    try {
      const setting = await storage.getSystemSettingByName('bookingBufferHours');
      
      if (!setting) {
        return res.status(404).json({
          success: false,
          message: "Setting not found"
        });
      }
      
      res.json({
        success: true,
        bookingBufferHours: setting.bookingBufferHours
      });
    } catch (error) {
      logger.error('Error fetching booking buffer setting', error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch booking buffer setting"
      });
    }
  });

  // Delete a booking (with archive option)
  app.delete("/api/bookings/:id", async (req, res) => {
    const { id } = req.params;
    const { reason, note, skipArchive, sendCancellationEmail } = req.query;
    
    try {
      if (isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID"
        });
      }
      
      // First, check if the booking exists in the database
      const bookingId = parseInt(id);
      
      try {
        // Get the booking before deletion to use for email notification
        const booking = await storage.getBooking(bookingId);
        
        if (!booking) {
          return res.status(404).json({
            success: false,
            message: "Booking not found"
          });
        }
        
        // Use storage interface to handle deletion and archiving
        await storage.deleteBooking(bookingId, 
          skipArchive === 'true' ? undefined : (reason as string || 'admin-deleted'), 
          note as string
        );
        
        // Send cancellation email if requested
        if (sendCancellationEmail === 'true' && booking.email) {
          try {
            const emailResult = await sendBookingCancellationEmail(booking, reason as string);
            if (emailResult) {
              logger.info(`Cancellation email sent to ${booking.email}`);
            } else {
              logger.warn(`Failed to send cancellation email to ${booking.email}`);
            }
          } catch (emailError) {
            logger.error('Error sending cancellation email', emailError as Error);
            // Continue with the deletion even if email fails
          }
        }
        
        res.json({ 
          success: true, 
          message: skipArchive === 'true' 
            ? "Booking permanently deleted" 
            : `Booking deleted and archived. ${sendCancellationEmail === 'true' ? 'Cancellation notification sent.' : ''}`
        });
      } catch (error) {
        if ((error as Error).message === 'Booking not found') {
          return res.status(404).json({ 
            success: false,
            message: "Booking not found" 
          });
        }
        throw error;
      }
    } catch (error) {
      logger.error('Error deleting booking', error as Error);
      res.status(500).json({ 
        success: false,
        message: "Failed to delete booking" 
      });
    }
  });
  
  // Get all booking archives
  app.get("/api/admin/booking-archives", async (req, res) => {
    try {
      // Verify admin password
      const { password } = req.query;
      if (!verifyAdminPassword(password as string)) {
        return res.status(401).json({ 
          success: false, 
          message: "Unauthorized" 
        });
      }
      
      const archives = await storage.getBookingArchives();
      
      res.json({
        success: true,
        archives
      });
    } catch (error) {
      logger.error('Error fetching booking archives', error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch booking archives"
      });
    }
  });
  
  // Get a specific booking archive by ID
  app.get("/api/admin/booking-archives/:id", async (req, res) => {
    try {
      // Verify admin password
      const { password } = req.query;
      if (!verifyAdminPassword(password as string)) {
        return res.status(401).json({ 
          success: false, 
          message: "Unauthorized" 
        });
      }
      
      const { id } = req.params;
      if (isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: "Invalid archive ID"
        });
      }
      
      const archive = await storage.getBookingArchiveById(parseInt(id));
      
      if (!archive) {
        return res.status(404).json({
          success: false,
          message: "Archive not found"
        });
      }
      
      res.json({
        success: true,
        archive
      });
    } catch (error) {
      logger.error('Error fetching booking archive', error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch booking archive"
      });
    }
  });
  
  // Get booking archives by reason
  app.get("/api/admin/booking-archives/reason/:reason", async (req, res) => {
    try {
      // Verify admin password
      const { password } = req.query;
      if (!verifyAdminPassword(password as string)) {
        return res.status(401).json({ 
          success: false, 
          message: "Unauthorized" 
        });
      }
      
      const { reason } = req.params;
      const archives = await storage.getBookingArchivesByReason(reason);
      
      res.json({
        success: true,
        archives
      });
    } catch (error) {
      logger.error('Error fetching booking archives by reason', error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch booking archives"
      });
    }
  });
  
  // Get booking archives by customer email
  app.get("/api/admin/booking-archives/email/:email", async (req, res) => {
    try {
      // Verify admin password
      const { password } = req.query;
      if (!verifyAdminPassword(password as string)) {
        return res.status(401).json({ 
          success: false, 
          message: "Unauthorized" 
        });
      }
      
      const { email } = req.params;
      const archives = await storage.getBookingArchivesByEmail(email);
      
      res.json({
        success: true,
        archives
      });
    } catch (error) {
      logger.error('Error fetching booking archives by email', error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch booking archives"
      });
    }
  });

  // Promotions endpoints
  app.get("/api/promotions", async (req: Request, res: Response) => {
    try {
      // Get active promotions from database
      let dbPromotions;
      try {
        dbPromotions = await db.select().from(promotions);
      } catch (dbError) {
        logger.error("Database error when fetching promotions:", dbError as Error);
        // If there's a database error, return an empty array
        return res.json({
          success: true,
          promotions: []
        });
      }
      
      // Check if we have valid dates for any time-limited promotions
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Filter promotions based on date ranges if they exist
      const activePromotions = dbPromotions.filter(promo => {
        // If no dates are specified, or isActive is explicitly false, use the isActive flag
        if (!promo.startDate && !promo.endDate) {
          return promo.isActive;
        }
        
        // If we have a date range, check if today falls within it
        if (promo.startDate && promo.endDate) {
          return promo.isActive && promo.startDate <= today && promo.endDate >= today;
        }
        
        // If only start date, check if today is after start date
        if (promo.startDate && !promo.endDate) {
          return promo.isActive && promo.startDate <= today;
        }
        
        // If only end date, check if today is before end date
        if (!promo.startDate && promo.endDate) {
          return promo.isActive && promo.endDate >= today;
        }
        
        return promo.isActive;
      });
      
      // Map to expected format
      const formattedPromotions = activePromotions.map(p => ({
        id: p.id.toString(),
        title: p.title,
        description: p.description,
        linkText: p.linkText,
        linkUrl: p.linkUrl,
        backgroundColor: p.backgroundColor,
        textColor: p.textColor,
        startDate: p.startDate,
        endDate: p.endDate,
        priority: p.priority,
        isActive: p.isActive
      }));
      
      // Add cache headers to prevent too many requests (10 minutes)
      res.setHeader('Cache-Control', 'public, max-age=600');
      
      res.json({
        success: true,
        promotions: formattedPromotions
      });
    } catch (error) {
      logger.error("Error fetching promotions:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch promotions"
      });
    }
  });

  // Admin: Create promotion
  app.post("/api/admin/promotions", async (req: Request, res: Response) => {
    try {
      const { password, promotion } = req.body;

      // Verify admin password
      if (!verifyAdminPassword(password)) {
        logger.auth('Invalid password for creating promotion');
        return res.status(401).json({
          success: false,
          message: "Invalid admin password"
        });
      }

      // Validate promotion data
      try {
        const validPromotion = promotionSchema.parse(promotion);
        
        // Insert promotion into database
        const result = await db.insert(promotions).values({
          title: validPromotion.title,
          description: validPromotion.description,
          linkText: validPromotion.linkText,
          linkUrl: validPromotion.linkUrl,
          backgroundColor: validPromotion.backgroundColor,
          textColor: validPromotion.textColor,
          startDate: validPromotion.startDate,
          endDate: validPromotion.endDate,
          priority: validPromotion.priority,
          isActive: validPromotion.isActive !== undefined ? validPromotion.isActive : true
        }).returning();

        res.status(201).json({
          success: true,
          message: "Promotion created successfully",
          promotion: result[0]
        });
      } catch (validationError) {
        logger.error("Promotion validation error:", validationError);
        
        if (validationError instanceof ZodError) {
          return res.status(400).json({
            success: false,
            message: "Invalid promotion data",
            errors: validationError.errors
          });
        }
        
        throw validationError;
      }
    } catch (error) {
      logger.error("Error creating promotion:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to create promotion"
      });
    }
  });

  // Admin: Update promotion
  app.put("/api/admin/promotions/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { password, promotion } = req.body;
      
      // Verify admin password
      if (!verifyAdminPassword(password)) {
        logger.auth('Invalid password for updating promotion');
        return res.status(401).json({
          success: false,
          message: "Invalid admin password"
        });
      }
      
      // Parse the ID
      const promotionId = parseInt(id);
      if (isNaN(promotionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid promotion ID"
        });
      }
      
      // Validate promotion data
      try {
        const validPromotion = promotionSchema.parse(promotion);
        
        // Update promotion in database
        const result = await db.update(promotions)
          .set({
            title: validPromotion.title,
            description: validPromotion.description,
            linkText: validPromotion.linkText,
            linkUrl: validPromotion.linkUrl,
            backgroundColor: validPromotion.backgroundColor,
            textColor: validPromotion.textColor,
            startDate: validPromotion.startDate,
            endDate: validPromotion.endDate,
            priority: validPromotion.priority,
            isActive: validPromotion.isActive,
            updatedAt: new Date()
          })
          .where(eq(promotions.id, promotionId))
          .returning();
          
        if (result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Promotion not found"
          });
        }
        
        res.json({
          success: true,
          message: "Promotion updated successfully",
          promotion: result[0]
        });
      } catch (validationError) {
        logger.error("Promotion validation error:", validationError);
        
        if (validationError instanceof ZodError) {
          return res.status(400).json({
            success: false,
            message: "Invalid promotion data",
            errors: validationError.errors
          });
        }
        
        throw validationError;
      }
    } catch (error) {
      logger.error("Error updating promotion:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to update promotion"
      });
    }
  });
  
  // Admin: Delete promotion
  app.delete("/api/admin/promotions/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { password } = req.query;
      
      // Verify admin password
      if (!verifyAdminPassword(password as string)) {
        logger.auth('Invalid password for deleting promotion');
        return res.status(401).json({
          success: false,
          message: "Invalid admin password"
        });
      }
      
      // Parse the ID
      const promotionId = parseInt(id);
      if (isNaN(promotionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid promotion ID"
        });
      }
      
      // Delete promotion from database
      const result = await db.delete(promotions)
        .where(eq(promotions.id, promotionId))
        .returning();
        
      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Promotion not found"
        });
      }
      
      res.json({
        success: true,
        message: "Promotion deleted successfully"
      });
    } catch (error) {
      logger.error("Error deleting promotion:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to delete promotion"
      });
    }
  });

  // Create and return HTTP server
  const http = await import("http");
  const server = http.createServer(app);

  return server;
}