import express, { type Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { getCityBySlug } from "../client/src/data/city-pages";
import { getPageMetadata } from "../client/src/lib/page-metadata";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function replaceMeta(html: string, key: "name" | "property", name: string, value: string) {
  const escaped = escapeHtml(value);
  const pattern = new RegExp(`<meta\\s+${key}="${name}"[\\s\\S]*?\\/>`, "i");
  const tag = `<meta ${key}="${name}" content="${escaped}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

function applyDocumentMetadata(html: string, pathname: string) {
  const cityMatch = pathname.match(/^\/areas\/([a-z0-9-]+)\/?$/i);
  const city = cityMatch ? getCityBySlug(cityMatch[1].toLowerCase()) : undefined;
  const metadata = getPageMetadata(pathname, city);
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`);
  out = replaceMeta(out, "name", "description", metadata.description);
  out = replaceMeta(out, "name", "robots", metadata.robots);
  out = replaceMeta(out, "property", "og:title", metadata.title);
  out = replaceMeta(out, "property", "og:description", metadata.description);
  out = replaceMeta(out, "name", "twitter:title", metadata.title);
  out = replaceMeta(out, "name", "twitter:description", metadata.description);

  if (metadata.canonical) {
    const canonical = escapeHtml(metadata.canonical);
    const canonicalTag = `<link rel="canonical" href="${canonical}" />`;
    out = /<link\s+rel="canonical"[\s\S]*?\/>/i.test(out)
      ? out.replace(/<link\s+rel="canonical"[\s\S]*?\/>/i, canonicalTag)
      : out.replace("</head>", `    ${canonicalTag}\n  </head>`);
    out = replaceMeta(out, "property", "og:url", metadata.canonical);
  } else {
    out = out.replace(/\s*<link\s+rel="canonical"[\s\S]*?\/>/i, "");
    out = out.replace(/\s*<meta\s+property="og:url"[\s\S]*?\/>/i, "");
  }

  return { html: out, metadata };
}

// Only Vite's content-addressed build output can safely live in caches for a year.
// HTML, service workers, manifests and named images must revalidate after deploys.
export function serveStaticFrom(app: Express, distPath: string) {
  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
  }

  const indexPath = path.resolve(distPath, "index.html");

  app.use(express.static(distPath, {
    maxAge: 0,
    index: false,
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

    const template = fs.readFileSync(indexPath, "utf8");
    const { html, metadata } = applyDocumentMetadata(template, req.path);
    res.setHeader("Cache-Control", metadata.sensitive ? "no-store" : "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (metadata.robots.startsWith("noindex")) res.setHeader("X-Robots-Tag", metadata.robots);
    if (metadata.sensitive) res.setHeader("Referrer-Policy", "no-referrer");
    return res.status(metadata.known ? 200 : 404).type("html").send(req.method === "HEAD" ? "" : html);
  });
}
