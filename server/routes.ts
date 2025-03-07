import { type Express, Request, Response } from "express";
import { type Server } from "http";
import { db } from "./db";
import { bookingSchema, bookings } from "@shared/schema";
import { ZodError } from "zod";
import { loadBookings, saveBookings, ensureDataDirectory } from "./storage";
import { googleCalendarService } from "./services/googleCalendarService";
import { and, eq, sql } from "drizzle-orm";
import { sendBookingConfirmationEmail, sendAdminBookingNotificationEmail } from "./services/emailService";

// Load bookings from storage
ensureDataDirectory();
let fileBookings: any[] = loadBookings();

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Google Calendar API endpoints with caching
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

      // Get unavailable time slots from Google Calendar
      const unavailableSlots = await googleCalendarService.getUnavailableTimeSlots(start, end);

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
      console.error("Error fetching calendar availability:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch calendar availability"
      });
    }
  });

  // Check specific time slot availability
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
        console.error("Database error checking bookings:", dbError);
        // Continue with checking Google Calendar
      }

      // Get data for a 7-day window around the requested date
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      // Get unavailable time slots from Google Calendar
      const unavailableSlots = await googleCalendarService.getUnavailableTimeSlots(startDate, endDate);

      // Check if the specific time slot is available
      const isAvailable = googleCalendarService.isTimeSlotAvailable(
        date as string,
        timeSlot as string,
        unavailableSlots
      );

      res.json({ 
        success: true, 
        isAvailable 
      });
    } catch (error) {
      console.error("Error checking time slot availability:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check time slot availability"
      });
    }
  });

  // Add endpoint to get blocked time slots
  app.get("/api/admin/blocked-times", async (req, res) => {
    try {
      const { startDate, endDate, password } = req.query;

      // Verify admin password
      if (password !== adminPassword) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid password" 
        });
      }

      // Parse dates
      const start = startDate ? new Date(startDate as string) : new Date();
      const end = endDate ? new Date(endDate as string) : new Date(start);
      end.setMonth(end.getMonth() + 1); // Default to 1 month range if no end date

      // Get blocked slots from Google Calendar
      const blockedSlots = await googleCalendarService.getBlockedTimeSlots(start, end);

      res.json({
        success: true,
        blockedSlots
      });
    } catch (error) {
      console.error("Error fetching blocked time slots:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch blocked time slots"
      });
    }
  });

  // Modify existing /api/admin/availability endpoint to include more options
  app.post("/api/admin/availability", async (req, res) => {
    try {
      const { password, action, data } = req.body;

      // Verify admin password
      if (password !== adminPassword) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid password" 
        });
      }

      switch (action) {
        case 'blockTimeSlot':
          // Block a specific time slot
          const { date, startTime, endTime, reason } = data;
          await googleCalendarService.blockTimeSlot(date, startTime, endTime, reason);
          break;

        case 'unblockTimeSlot':
          // Unblock a previously blocked time slot
          const { eventId } = data;
          await googleCalendarService.unblockTimeSlot(eventId);
          break;

        case 'setRecurringBlock':
          // Set a recurring blocked time
          const { dayOfWeek, recurringStartTime, recurringEndTime, untilDate } = data;
          await googleCalendarService.setRecurringBlock(
            dayOfWeek,
            recurringStartTime,
            recurringEndTime,
            untilDate
          );
          break;

        case 'setBusinessHours':
          // Set business hours for specific days
          const { businessHours } = data;
          await googleCalendarService.setBusinessHours(businessHours);
          break;

        default:
          return res.status(400).json({
            success: false,
            message: "Invalid action specified"
          });
      }

      res.json({
        success: true,
        message: "Availability updated successfully"
      });
    } catch (error) {
      console.error("Error updating availability:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update availability"
      });
    }
  });

  // Booking endpoints
  app.post("/api/booking", async (req, res) => {
    try {
      console.log("Booking submission received:", req.body);
      const booking = bookingSchema.parse(req.body);
      console.log("Booking validated successfully");

      // Check if this time slot is already booked
      const dateStr = new Date(booking.preferredDate).toISOString().split('T')[0]; // YYYY-MM-DD
      console.log("Checking for existing bookings on date:", dateStr, "and time:", booking.appointmentTime);

      const existingBookings = await db.select().from(bookings).where(
        and(
          sql`DATE(${bookings.preferredDate}) = ${dateStr}`,
          eq(bookings.appointmentTime, booking.appointmentTime),
          eq(bookings.status, 'active')
        )
      );

      if (existingBookings.length > 0) {
        console.log("Time slot already booked, returning conflict error");
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

      console.log("Preparing to insert booking into database");
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

      console.log("Booking successfully inserted into database");
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
          console.log("Confirmation emails sent successfully");
        }
      } catch (error) {
        console.error("Error sending notifications:", error);
        // We don't want to fail the booking if notifications fail
      }

      // Return success response
      res.status(200).json({ 
        success: true, 
        message: "Booking confirmed successfully", 
        booking: bookingWithId 
      });
    } catch (error) {
      console.error("Booking validation error:", error);

      if (error instanceof ZodError) {
        console.error("Zod validation errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({
          success: false,
          message: "Invalid booking data",
          errors: error.errors
        });
      }

      console.error("Booking submission error details:", error instanceof Error ? error.message : String(error));
      console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace available');

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
            console.error('Error parsing pricingBreakdown JSON:', e);
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
      console.error("Error fetching bookings:", error);
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
          console.error('Error parsing pricingBreakdown JSON:', e);
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
      console.error("Error fetching booking:", error);
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
      console.error("Error cancelling booking:", error);
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
          console.log("Confirmation email sent successfully");
        }
      } catch (error) {
        console.error("Error sending confirmation:", error);
        // Don't fail the approval if email fails
      }

      res.json({ 
        success: true, 
        message: "Booking approved successfully" 
      });
    } catch (error) {
      console.error("Error approving booking:", error);
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
      console.error("Error declining booking:", error);
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
      console.error("Error updating booking:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update booking"
      });
    }
  });

  // Admin endpoints
  // Default admin password (for development only, should use env var in production)
  let adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  // Admin login
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;

    if (password === adminPassword) {
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
  app.post("/api/admin/reset-password", (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    if (currentPassword !== adminPassword) {
      return res.status(401).json({ 
        success: false, 
        message: "Current password is incorrect" 
      });
    }

    // Update password
    adminPassword = newPassword;

    res.json({ 
      success: true, 
      message: "Password updated successfully" 
    });
  });

  // Clear all bookings
  app.post("/api/admin/clear-bookings", async (req, res) => {
    try {
      const { password } = req.body;

      // Verify admin password
      if (password !== adminPassword) {
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
      console.error("Error clearing bookings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to clear bookings"
      });
    }
  });

  //Simplified logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    res.on("finish", () => {
      if (path.startsWith("/api")) {
        const duration = Date.now() - start;
        log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      }
    });

    next();
  });

  // Create and return HTTP server
  const http = await import("http");
  const server = http.createServer(app);

  return server;
}

const log = (message: string) => {
  console.log(message);
};