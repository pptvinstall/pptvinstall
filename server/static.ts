import express, { type Express } from "express";
import fs from "node:fs";
import path from "node:path";

// Only Vite's content-addressed build output can safely live in caches for a year.
// HTML, service workers, manifests and named images must revalidate after deploys.
export function serveStaticFrom(app: Express, distPath: string) {
  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
  }

  app.use(express.static(distPath, {
    maxAge: 0,
    setHeaders(res, filePath) {
      const relative = path.relative(distPath, filePath).split(path.sep).join("/");
      const immutable = /^assets\/.*-[A-Za-z0-9_-]{8,}\.[^/]+$/.test(relative);
      res.setHeader("Cache-Control", immutable ? "public, max-age=31536000, immutable" : "no-cache");
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }));

  // A deleted chunk or missing API must remain a 404, never cached HTML posing
  // as JavaScript/JSON. Only document navigations receive the SPA shell.
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api/") || req.path === "/api" ||
        req.path.startsWith("/assets/") || path.extname(req.path) ||
        !req.accepts("html")) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(404).end();
    }
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.sendFile(path.resolve(distPath, "index.html"));
  });
}
