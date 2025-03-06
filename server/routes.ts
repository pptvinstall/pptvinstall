import { type Express, Request, Response } from "express";
import { type Server } from "http";
import { db } from "./db";
import { bookingSchema } from "@shared/schema";
import { ZodError } from "zod";
import { loadBookings, saveBookings, ensureDataDirectory } from "./storage";
import { googleCalendarService } from "./services/googleCalendarService";

// Load bookings from storage
ensureDataDirectory();
let bookings: any[] = loadBookings();

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

  // Booking endpoints
  app.post("/api/booking", (req, res) => {
    try {
      const booking = bookingSchema.parse(req.body);

      // Store booking
      const bookingWithId = { ...booking, id: Date.now().toString(), createdAt: new Date() };
      bookings.push(bookingWithId);

      // Save to storage
      saveBookings(bookings);

      // Return success response
      res.status(200).json({ 
        success: true, 
        message: "Booking confirmed successfully", 
        booking: bookingWithId 
      });
    } catch (error) {
      console.error("Booking validation error:", error);

      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking data",
          errors: error.errors
        });
      }

      res.status(500).json({
        success: false,
        message: "An error occurred while processing your booking"
      });
    }
  });

  // Get all bookings
  app.get("/api/bookings", (req, res) => {
    res.json({ bookings });
  });

  // Get booking by ID
  app.get("/api/booking/:id", (req, res) => {
    const booking = bookings.find(b => b.id === req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.json({ success: true, booking });
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