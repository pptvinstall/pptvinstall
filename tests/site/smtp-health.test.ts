import assert from "node:assert/strict";
import { test } from "node:test";
import { getSmtpAuthenticationState } from "../../server/outbound.ts";

test("SMTP health distinguishes no credentials from configured-but-unverified", () => {
  const oldUser = process.env.GMAIL_USER;
  const oldPass = process.env.GMAIL_APP_PASSWORD;
  const oldEnv = process.env.APP_ENV;
  const oldMode = process.env.OUTBOUND_MODE;
  try {
    process.env.APP_ENV = "production";
    delete process.env.OUTBOUND_MODE;
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;

    assert.equal(getSmtpAuthenticationState().status, "not_configured");
    assert.equal(getSmtpAuthenticationState().configured, false);

    process.env.GMAIL_USER = "smtp-test@example.invalid";
    process.env.GMAIL_APP_PASSWORD = "placeholder-only-not-a-secret";
    const state = getSmtpAuthenticationState();
    assert.equal(state.configured, true);
    assert.notEqual(state.status, "connected");
    assert.deepEqual(Object.keys(state).sort(), ["checkedAt", "configured", "status"].sort());
    assert.equal(JSON.stringify(state).includes("placeholder-only-not-a-secret"), false);
  } finally {
    if (oldUser === undefined) delete process.env.GMAIL_USER; else process.env.GMAIL_USER = oldUser;
    if (oldPass === undefined) delete process.env.GMAIL_APP_PASSWORD; else process.env.GMAIL_APP_PASSWORD = oldPass;
    if (oldEnv === undefined) delete process.env.APP_ENV; else process.env.APP_ENV = oldEnv;
    if (oldMode === undefined) delete process.env.OUTBOUND_MODE; else process.env.OUTBOUND_MODE = oldMode;
  }
});

test("staging health always reports outbound SMTP as suppressed", () => {
  const original = process.env.APP_ENV;
  const oldUser = process.env.GMAIL_USER;
  const oldPass = process.env.GMAIL_APP_PASSWORD;
  const oldMode = process.env.OUTBOUND_MODE;
  try {
    process.env.APP_ENV = "staging";
    delete process.env.OUTBOUND_MODE;
    process.env.GMAIL_USER = "smtp-test@example.invalid";
    process.env.GMAIL_APP_PASSWORD = "placeholder-only-not-a-secret";
    assert.equal(getSmtpAuthenticationState().status, "suppressed");
  } finally {
    if (original === undefined) delete process.env.APP_ENV; else process.env.APP_ENV = original;
    if (oldUser === undefined) delete process.env.GMAIL_USER; else process.env.GMAIL_USER = oldUser;
    if (oldPass === undefined) delete process.env.GMAIL_APP_PASSWORD; else process.env.GMAIL_APP_PASSWORD = oldPass;
    if (oldMode === undefined) delete process.env.OUTBOUND_MODE; else process.env.OUTBOUND_MODE = oldMode;
  }
});
