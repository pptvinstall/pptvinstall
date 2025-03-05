
import { type Express } from "express";
import { type Server } from "http";
import { db } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Add other API routes here as needed
  
  // Create and return HTTP server
  const http = await import("http");
  const server = http.createServer(app);
  
  return server;
}
