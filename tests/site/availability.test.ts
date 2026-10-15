import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchTakenSlots } from "../../client/src/lib/availability.ts";

test("valid availability preserves taken slots and bypasses browser cache", async () => {
  const controller = new AbortController();
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, "/api/availability?date=2026-11-27");
    assert.equal(options?.cache, "no-store");
    assert.equal(options?.signal, controller.signal);
    return Response.json(["11:00 AM"]);
  };
  assert.deepEqual(await fetchTakenSlots("2026-11-27", controller.signal, request), ["11:00 AM"]);
});
test("empty successful availability is valid", async () => {
  assert.deepEqual(await fetchTakenSlots("2026-11-27", undefined, async () => Response.json([])), []);
});
test("HTTP failures and malformed payloads cannot appear bookable", async () => {
  for (const response of [
    Response.json({ message: "Rate limited" }, { status: 429 }),
    Response.json({ message: "Database offline" }, { status: 503 }),
    Response.json({ slots: [] }),
    Response.json([123]),
    new Response("not JSON"),
  ]) {
    await assert.rejects(() => fetchTakenSlots("2026-11-27", undefined, async () => response));
  }
});
test("network failures propagate for visible retry handling", async () => {
  await assert.rejects(() => fetchTakenSlots("2026-11-27", undefined, async () => { throw new TypeError("offline"); }));
});
test("aborted requests cannot produce availability", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => fetchTakenSlots("2026-11-27", controller.signal, async (_url, options) => {
    options?.signal?.throwIfAborted();
    return Response.json([]);
  }), { name: "AbortError" });
});
