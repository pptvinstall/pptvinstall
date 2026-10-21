import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from "ws";
import * as schema from "@shared/schema";
import { attachDatabasePoolErrorHandler } from "./services/databasePoolErrorHandler";

import "./env";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// Register before the pool is used. An unexpected idle WebSocket disconnect
// must not crash the service or dump credential-bearing Neon client state.
attachDatabasePoolErrorHandler(pool);

export const db = drizzle({ client: pool, schema });

export async function checkDatabaseConnection(timeoutMs = 8000): Promise<void> {
  await Promise.race([
    db.execute(sql`SELECT 1`),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Database preflight timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}
