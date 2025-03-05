
import { type Express, Request, Response } from "express";
import { type Server } from "http";
import { db } from "./db";
import { bookingSchema } from "@shared/schema";
import { ZodError } from "zod";
import { loadBookings, saveBookings, ensureDataDirectory } from "./storage";

// Load bookings from storage
ensureDataDirectory();
let bookings: any[] = loadBookings();

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
  
  // Create and return HTTP server
  const http = await import("http");
  const server = http.createServer(app);
  
  return server;
}
