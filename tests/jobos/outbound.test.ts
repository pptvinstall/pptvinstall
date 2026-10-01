const PG = (h: string) => ["postgres:/", "", ["u", "x"].join(":") + "@" + h + "/db"].join("/");
import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeBoot, getAppEnv, maskRecipient, outboundSuppressed } from "../../server/outbound";
import { jobOsEnabled } from "../../server/jobos/routes";

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) saved[k] = process.env[k];
  for (const [k, v] of Object.entries(env)) (v === undefined ? delete process.env[k] : (process.env[k] = v));
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) (v === undefined ? delete process.env[k] : (process.env[k] = v));
  }
}

test("app env resolution", () => {
  withEnv({ APP_ENV: "staging", NODE_ENV: "production" }, () => assert.equal(getAppEnv(), "staging"));
  withEnv({ APP_ENV: undefined, NODE_ENV: "production" }, () => assert.equal(getAppEnv(), "production"));
  withEnv({ APP_ENV: undefined, NODE_ENV: "development" }, () => assert.equal(getAppEnv(), "development"));
});

test("outbound is suppressed in staging by default, live in production, and OUTBOUND_MODE can force suppression", () => {
  withEnv({ APP_ENV: "staging", OUTBOUND_MODE: undefined, STAGING_ALLOW_LIVE_OUTBOUND: undefined }, () => assert.equal(outboundSuppressed(), true));
  withEnv({ APP_ENV: "production", OUTBOUND_MODE: undefined }, () => assert.equal(outboundSuppressed(), false));
  withEnv({ APP_ENV: "production", OUTBOUND_MODE: "suppress" }, () => assert.equal(outboundSuppressed(), true));
  // "live" cannot silently un-suppress staging without a second, explicit opt-in.
  withEnv({ APP_ENV: "staging", OUTBOUND_MODE: "live", STAGING_ALLOW_LIVE_OUTBOUND: undefined }, () => assert.equal(outboundSuppressed(), true));
  withEnv({ APP_ENV: "staging", OUTBOUND_MODE: "live", STAGING_ALLOW_LIVE_OUTBOUND: "true" }, () => assert.equal(outboundSuppressed(), false));
});

test("staging refuses to boot against the production DB host or without an admin token", () => {
  withEnv({ APP_ENV: "staging" }, () => {
    assert.throws(() => assertSafeBoot({ DATABASE_URL: PG("ep-prod-1.neon.tech"), PRODUCTION_DB_HOST: "ep-prod-1.neon.tech", ADMIN_API_TOKEN: "t" } as never), /production database/);
    assert.throws(() => assertSafeBoot({ DATABASE_URL: PG("ep-stg.neon.tech") } as never), /ADMIN_API_TOKEN/);
    assert.doesNotThrow(() => assertSafeBoot({ DATABASE_URL: PG("ep-stg.neon.tech"), PRODUCTION_DB_HOST: "ep-prod-1.neon.tech", ADMIN_API_TOKEN: "t" } as never));
  });
  withEnv({ APP_ENV: "production" }, () => assert.doesNotThrow(() => assertSafeBoot({ DATABASE_URL: "postgres://x" } as never)));
});

test("recipients are masked in the outbox", () => {
  assert.equal(maskRecipient("jane@example.com"), "***@example.com");
  assert.equal(maskRecipient("+1 (404) 555-1234"), "***34");
  assert.equal(maskRecipient(["a@b.co"]), "***@b.co");
  assert.equal(maskRecipient(undefined), "***");
});

test("Job OS is off by default in production until explicitly enabled", () => {
  assert.equal(jobOsEnabled({ NODE_ENV: "production" } as never), false);
  assert.equal(jobOsEnabled({ NODE_ENV: "production", JOB_OS_ENABLED: "true" } as never), true);
  assert.equal(jobOsEnabled({ NODE_ENV: "development" } as never), true);
  assert.equal(jobOsEnabled({ NODE_ENV: "development", JOB_OS_ENABLED: "false" } as never), false);
  assert.equal(jobOsEnabled({ APP_ENV: "production" } as never), false);
});
