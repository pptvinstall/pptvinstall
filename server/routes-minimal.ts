import { type Express } from "express";
import { type Server } from "http";

export async function registerRoutes(app: Express): Promise<void> {
  // Health check endpoint only
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      message: "Clean foundation ready"
    });
  });

  // 404 for all other API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "Endpoint not found - clean build in progress" });
  });
}