import { EventEmitter } from "node:events";
import assert from "node:assert/strict";
import test from "node:test";
import { attachDatabasePoolErrorHandler } from "../../server/services/databasePoolErrorHandler";

test("idle database pool connection errors do not terminate the process", () => {
  const pool = new EventEmitter();
  const messages: string[] = [];
  attachDatabasePoolErrorHandler(pool, (message) => messages.push(message));

  assert.equal(pool.listenerCount("error"), 1);
  assert.doesNotThrow(() => {
    pool.emit("error", new Error("Connection terminated unexpectedly"));
  });
  assert.equal(messages.length, 1);
  assert.match(messages[0], /connection lost/i);
});

test("pool errors never log credentials or the Error/client object", () => {
  const pool = new EventEmitter();
  const messages: string[] = [];
  attachDatabasePoolErrorHandler(pool, (message) => messages.push(message));

  const unsafeValue = "TEST_ONLY_SECRET_DO_NOT_LOG";
  const error = Object.assign(new Error(`Database failed ${unsafeValue}`), {
    connectionString: unsafeValue,
    client: {
      connectionParameters: { password: unsafeValue },
    },
  });

  assert.doesNotThrow(() => pool.emit("error", error, error.client));
  assert.equal(messages.length, 1);
  assert.equal(messages[0].includes(unsafeValue), false);
  assert.equal(messages[0].includes("postgresql://"), false);
  assert.equal(messages[0].includes("example.invalid"), false);
});
