import { type Express, Request as ExpressRequest, Response } from "express";
import { type Server } from "http";
import { db } from "./db";
import { bookingSchema, bookings } from "@shared/schema";
import { ZodError } from "zod";
import { loadBookings, saveBookings, ensureDataDirectory } from "./storage";
import { availabilityService, TimeSlot, BlockedDay } from "./services/availabilityService";
import { logger } from "./services/loggingService";
import { and, eq, sql } from "drizzle-orm";
import { sendBookingConfirmationEmail, sendAdminBookingNotificationEmail } from "./services/emailService";

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
      const isAvailable = availabilityService.isTimeSlotAvailable(
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
      logger.debug("Booking submission received:", req.body);
      const booking = bookingSchema.parse(req.body);
      logger.info("Booking validated successfully");

      // Check if this time slot is already booked
      const dateStr = new Date(booking.preferredDate).toISOString().split('T')[0]; // YYYY-MM-DD
      logger.debug(`Checking for existing bookings on date: ${dateStr} and time: ${booking.appointmentTime}`);

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

      // Send confirmation email
      try {
        if (process.env.SENDGRID_API_KEY) {
          await sendBookingConfirmationEmail(bookingWithId);
          await sendAdminBookingNotificationEmail(bookingWithId);
          logger.info("Confirmation emails sent successfully");
        }
      } catch (error) {
        logger.error("Error sending notifications:", error as Error);
        // We don't want to fail the booking if notifications fail
      }

      // Return success response
      res.status(200).json({
        success: true,
        message: "Booking confirmed successfully",
        booking: bookingWithId
      });
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
            pricingBreakdown = JSON.parse(booking.pricingBreakdown);
          } catch (e) {
            logger.error('Error parsing pricingBreakdown JSON:', e as Error);
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
          pricingBreakdown = JSON.parse(booking.pricingBreakdown);
        } catch (e) {
          logger.error('Error parsing pricingBreakdown JSON:', e as Error);
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
      const updates = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID"
        });
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

      res.json({
        success: true,
        message: "Booking updated successfully",
        booking: result[0]
      });
    } catch (error) {
      logger.error("Error updating booking:", error as Error);
      res.status(500).json({
        success: false,
        message: "Failed to update booking"
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


  // Create and return HTTP server
  const http = await import("http");
  const server = http.createServer(app);

  return server;
}