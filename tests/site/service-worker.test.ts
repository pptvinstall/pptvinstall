import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

function worker(fetcher: (request: { url: string }) => Promise<Response>, cached?: Response, brokenStorage = false) {
  const listeners: Record<string, (event: any) => void> = {};
  const writes: unknown[] = [];
  vm.runInNewContext(readFileSync(new URL("../../client/public/sw.js", import.meta.url), "utf8"), {
    self: { location: { origin: "https://pptvinstall.com" }, addEventListener(name: string, callback: any) { listeners[name] = callback; } },
    fetch: fetcher, URL, Response,
    caches: {
      async match() { return cached; },
      async open() {
        if (brokenStorage) throw new Error("Quota exceeded");
        return { async put(...args: unknown[]) { writes.push(args); }, async keys() { return []; }, async delete() {} };
      },
    },
  });
  return async (path: string, destination: string, mode = "cors") => {
    let response: Promise<Response> | undefined;
    const pending: Promise<unknown>[] = [];
    listeners.fetch({
      request: { url: path.startsWith("http") ? path : "https://pptvinstall.com" + path, method: "GET", destination, mode },
      respondWith(result: Promise<Response>) { response = result; },
      waitUntil(result: Promise<unknown>) { pending.push(result); },
    });
    const result = await response;
    await Promise.all(pending);
    return { result, writes };
  };
}

test("online named images refresh rather than remaining stale forever", async () => {
  const run = worker(async () => new Response("new image"), new Response("old image"));
  const { result, writes } = await run("/logo.png", "image");
  assert.equal(await result?.text(), "new image");
  assert.equal(writes.length, 1);
});
test("offline images can fall back to cached media", async () => {
  const run = worker(async () => { throw new TypeError("offline"); }, new Response("cached image"));
  assert.equal(await (await run("/logo.png", "image")).result?.text(), "cached image");
});
test("cache quota failures cannot break online media", async () => {
  const run = worker(async () => new Response("image"), undefined, true);
  assert.equal(await (await run("/logo.png", "image")).result?.text(), "image");
});
test("private media and no-store responses are not persisted", async () => {
  for (const policy of ["private, max-age=0", "no-store"]) {
    const run = worker(async () => new Response("image", { headers: { "Cache-Control": policy } }));
    assert.equal((await run("/logo.png", "image")).writes.length, 0);
  }
});
test("navigation and API failures never fall back to cached HTML or private data", async () => {
  const run = worker(async () => { throw new TypeError("offline"); }, new Response("stale private page"));
  for (const [path, destination, mode] of [["/q/private", "document", "navigate"], ["/api/bookings", "", "cors"]]) {
    const { result, writes } = await run(path, destination, mode);
    assert.equal(result?.status, 503);
    assert.equal(result?.headers.get("cache-control"), "no-store");
    assert.equal(writes.length, 0);
  }
});
test("third-party media is left to its origin", async () => {
  const run = worker(async () => { throw new Error("should not be called"); });
  assert.equal((await run("https://third-party.example/image.png", "image")).result, undefined);
});
