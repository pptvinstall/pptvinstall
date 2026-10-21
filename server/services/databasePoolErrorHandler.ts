import type { EventEmitter } from "node:events";

// Neon Pool uses node-postgres pool semantics: idle clients can lose their
// WebSocket connection independently of an in-flight request. Without a
// listener, Node treats the pool's "error" event as an uncaught exception.
// The pool removes the disconnected client; subsequent queries may reconnect.
//
// Do not log the Error object, its stack, or the Client object. Neon errors
// can include connectionParameters and a connectionString with credentials.
export function attachDatabasePoolErrorHandler(
  pool: EventEmitter,
  log: (message: string) => void = (message) => console.error(message),
): void {
  pool.on("error", () => {
    log("[database] Idle pool connection lost; client discarded. The next query can reconnect.");
  });
}
