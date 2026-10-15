import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import type { Server } from "node:http";
import { serveStaticFrom } from "../../server/static";

let directory: string;
let server: Server;
let base: string;
before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "pptv-static-"));
  await mkdir(path.join(directory, "assets"));
  await Promise.all([
    writeFile(path.join(directory, "index.html"), "<!doctype html><h1>Book a TV install</h1>"),
    writeFile(path.join(directory, "sw.js"), "// worker"),
    writeFile(path.join(directory, "assets", "index-AbCd1234.js"), "// hashed bundle"),
    writeFile(path.join(directory, "logo.svg"), "<svg />"),
  ]);
  const app = express();
  serveStaticFrom(app, directory);
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  base = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (directory) await rm(directory, { recursive: true, force: true });
});

test("root, direct index, SPA routes and service worker revalidate", async () => {
  for (const route of ["/", "/index.html", "/quote", "/booking", "/sw.js", "/logo.svg"]) {
    const response = await fetch(base + route, { headers: { Accept: "text/html" } });
    assert.equal(response.status, 200, route);
    assert.equal(response.headers.get("cache-control"), "no-cache", route);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }
});
test("hashed build assets stay immutable", async () => {
  const response = await fetch(base + "/assets/index-AbCd1234.js");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
});
test("missing chunks, images and APIs return 404 instead of the app shell", async () => {
  for (const route of ["/assets/deleted-AbCd1234.js", "/missing.png", "/api/missing"]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 404, route);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(await response.text(), "");
  }
});
test("non-document requests do not fall through to HTML", async () => {
  const response = await fetch(base + "/missing", { headers: { Accept: "application/json" } });
  assert.equal(response.status, 404);
});

test("owner and customer-token pages send privacy and indexing headers before JavaScript runs", async () => {
  for (const route of ["/admin", "/admin/jobs", "/dashboard", "/q/private-token", "/payment/success", "/confirmation"]) {
    const response = await fetch(base + route, { headers: { Accept: "text/html" } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  }
});
