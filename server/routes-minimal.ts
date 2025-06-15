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

  // Customer booking submission endpoint
  app.post("/api/bookings/complete", (req, res) => {
    try {
      const {
        fullName,
        email,
        phone,
        address,
        notes,
        selectedDate,
        selectedTime,
        services,
        totalAmount
      } = req.body;

      // Generate a new booking ID
      const newBookingId = (bookingStorage.length + 1).toString();
      const confirmationNumber = `CONF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Create new booking object
      const newBooking = {
        id: newBookingId,
        customerName: fullName,
        email: email,
        phone: phone,
        selectedDate: selectedDate,
        selectedTime: selectedTime,
        services: services,
        totalPrice: totalAmount,
        status: "pending",
        address: `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`,
        notes: notes || "",
        confirmationNumber: confirmationNumber,
        createdAt: new Date().toISOString()
      };

      // Add to booking storage
      bookingStorage.push(newBooking);

      // Return success response
      res.json({
        success: true,
        message: "Booking created successfully",
        booking: {
          id: newBookingId,
          confirmationNumber: confirmationNumber,
          status: "pending"
        }
      });

    } catch (error) {
      console.error('Error creating booking:', error);
      res.status(500).json({
        success: false,
        message: "Failed to create booking"
      });
    }
  });

  // Business hours endpoint
  app.get("/api/business-hours", (req, res) => {
    const defaultBusinessHours = [
      { dayOfWeek: 0, startTime: "11:00", endTime: "19:00", isAvailable: true }, // Sunday
      { dayOfWeek: 1, startTime: "18:30", endTime: "22:30", isAvailable: true }, // Monday
      { dayOfWeek: 2, startTime: "18:30", endTime: "22:30", isAvailable: true }, // Tuesday
      { dayOfWeek: 3, startTime: "18:30", endTime: "22:30", isAvailable: true }, // Wednesday
      { dayOfWeek: 4, startTime: "18:30", endTime: "22:30", isAvailable: true }, // Thursday
      { dayOfWeek: 5, startTime: "18:30", endTime: "22:30", isAvailable: true }, // Friday
      { dayOfWeek: 6, startTime: "11:00", endTime: "19:00", isAvailable: true }, // Saturday
    ];
    
    res.json({
      success: true,
      businessHours: defaultBusinessHours
    });
  });

  // All bookings endpoint
  app.get("/api/bookings", (req, res) => {
    res.json(bookingStorage);
  });

  // 404 for other API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "Endpoint not found" });
  });
}