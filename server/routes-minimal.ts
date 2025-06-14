import { type Express } from "express";
import { type Server } from "http";

export async function registerRoutes(app: Express): Promise<void> {
  // In-memory booking storage for testing
  let bookingStorage = [
    {
      id: "1",
      customerName: "Michael Johnson",
      email: "michael@example.com", 
      phone: "404-555-0123",
      selectedDate: new Date().toISOString().split('T')[0],
      selectedTime: "2:00 PM",
      services: [
        { type: "TV Wall Mount Installation", details: { tvSize: "65 inch" } }
      ],
      totalPrice: 250,
      status: "confirmed",
      address: "123 Main St, Atlanta, GA 30303",
      notes: "Hide cables behind wall",
      createdAt: new Date().toISOString()
    },
    {
      id: "2", 
      customerName: "Sarah Williams",
      email: "sarah@example.com",
      phone: "404-555-0456",
      selectedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      selectedTime: "10:00 AM",
      services: [
        { type: "Smart Home Setup", details: { devices: ["Thermostat", "Security System"] } }
      ],
      totalPrice: 450,
      status: "pending",
      address: "456 Oak Ave, Atlanta, GA 30309",
      notes: "Customer prefers morning appointments",
      createdAt: new Date().toISOString()
    }
  ];

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      message: "Server running with admin calendar support"
    });
  });

  // Simple admin password verification
  function verifyAdminPassword(password: string | undefined): boolean {
    return password === 'admin123' || password === 'test';
  }

  // Admin authentication endpoint
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    
    if (verifyAdminPassword(password)) {
      res.json({
        success: true,
        message: "Authentication successful"
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }
  });

  // Admin bookings endpoint - returns current booking data
  app.get("/api/admin/bookings", (req, res) => {
    const { password } = req.query;
    const authHeader = req.headers.authorization;
    const tokenPassword = authHeader?.replace('Bearer ', '');
    
    if (!verifyAdminPassword(password as string) && !verifyAdminPassword(tokenPassword)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    res.json(bookingStorage);
  });

  // Update booking status endpoint
  app.patch("/api/admin/bookings/:id", (req, res) => {
    const { password } = req.query;
    const authHeader = req.headers.authorization;
    const tokenPassword = authHeader?.replace('Bearer ', '');
    
    if (!verifyAdminPassword(password as string) && !verifyAdminPassword(tokenPassword)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Find and update the booking in memory
    const bookingIndex = bookingStorage.findIndex(booking => booking.id === id);
    if (bookingIndex !== -1) {
      bookingStorage[bookingIndex].status = status;
      res.json({
        success: true,
        message: `Booking ${id} status updated to ${status}`,
        booking: bookingStorage[bookingIndex]
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Booking ${id} not found`
      });
    }
  });

  // Delete booking endpoint
  app.delete("/api/admin/bookings/:id", (req, res) => {
    const { password } = req.query;
    const authHeader = req.headers.authorization;
    const tokenPassword = authHeader?.replace('Bearer ', '');
    
    if (!verifyAdminPassword(password as string) && !verifyAdminPassword(tokenPassword)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const { id } = req.params;

    // Find and remove the booking from memory
    const bookingIndex = bookingStorage.findIndex(booking => booking.id === id);
    if (bookingIndex !== -1) {
      const deletedBooking = bookingStorage.splice(bookingIndex, 1)[0];
      res.json({
        success: true,
        message: `Booking ${id} deleted successfully`,
        deletedBooking
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Booking ${id} not found`
      });
    }
  });

  // 404 for other API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "Endpoint not found" });
  });
}