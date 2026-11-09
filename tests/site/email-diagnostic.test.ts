import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { createGuardedTransport } from "../../server/outbound.ts";

test("manual SMTP diagnostic respects staging outbound suppression", async () => {
  const beforeEnv = process.env.APP_ENV;
  const beforeMode = process.env.OUTBOUND_MODE;
  try {
    process.env.APP_ENV = "staging";
    delete process.env.OUTBOUND_MODE;
    const transport = createGuardedTransport({
      service: "gmail",
      auth: { user: "invalid@example.invalid", pass: "not-a-real-password" },
    });
    // A suppressed diagnostic never initiates a connection or sends a mail.
    assert.equal(await transport.verify(), false);
  } finally {
    if (beforeEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = beforeEnv;
    if (beforeMode === undefined) delete process.env.OUTBOUND_MODE;
    else process.env.OUTBOUND_MODE = beforeMode;
  }
});

test("the SMTP diagnostic route is mounted after the admin auth middleware", () => {
  const routes = readFileSync(new URL("../../server/routes.ts", import.meta.url), "utf8");
  const authIndex = routes.indexOf('app.use("/api/admin", requireAdminToken)');
  const endpointIndex = routes.indexOf('app.get("/api/admin/email-diagnostic"');
  assert.ok(authIndex >= 0);
  assert.ok(endpointIndex > authIndex);
});
