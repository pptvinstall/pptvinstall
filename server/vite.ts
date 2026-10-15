import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { applyPageMeta, getPageMeta, notFoundMeta } from "@shared/seo/pageMeta";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      const meta = getPageMeta(req.originalUrl.split("?")[0]);
      res
        .status(meta ? 200 : 404)
        .set({ "Content-Type": "text/html" })
        .end(applyPageMeta(page, meta ?? notFoundMeta(req.originalUrl.split("?")[0])));
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "../dist/public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Hashed build files (/assets/*) never change, so browsers may keep them for a year.
  // Everything else must be rechecked: the HTML shell, the service worker, manifest,
  // and unhashed images. index.html is never served from here (index: false) so it
  // always goes through the handler below with no-cache and per-page meta.
  app.use(
    express.static(distPath, {
      index: false,
      setHeaders(res, filePath) {
        const rel = path.relative(distPath, filePath).split(path.sep).join("/");
        if (rel.startsWith("assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (rel === "sw.js" || rel.endsWith(".html") || rel.endsWith(".webmanifest") || rel === "manifest.json") {
          res.setHeader("Cache-Control", "no-cache");
        } else {
          res.setHeader("Cache-Control", "public, max-age=86400");
        }
      },
    }),
  );

  const template = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");

  // Every page is the same app shell, but with its own title, description and
  // canonical so Google indexes each page separately. Unknown paths get a real
  // 404 status (the app still renders its friendly not-found page).
  app.use("*", (req, res) => {
    const requestPath = req.originalUrl.split("?")[0];
    const meta = getPageMeta(requestPath);
    res.setHeader("Cache-Control", "no-cache");
    res
      .status(meta ? 200 : 404)
      .type("html")
      .send(applyPageMeta(template, meta ?? notFoundMeta(requestPath)));
  });
}
