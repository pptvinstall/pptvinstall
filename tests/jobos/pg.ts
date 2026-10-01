import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createRequire } from "node:module";
import * as jobosSchema from "../../shared/jobos-schema";
import * as fullSchema from "../../shared/schema";

// drizzle-kit/api only loads through CommonJS under tsx.
const { generateDrizzleJson, generateMigration } = createRequire(import.meta.url)("drizzle-kit/api") as typeof import("drizzle-kit/api");

/** DDL generated from the live Drizzle schema (no committed SQL to drift). */
export async function ddlFor(schema: Record<string, unknown>): Promise<string[]> {
  return generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));
}

export async function createTestDb(opts: { fullSchema?: boolean } = {}) {
  const client = new PGlite();
  const statements = await ddlFor(opts.fullSchema ? fullSchema : jobosSchema);
  for (const stmt of statements) await client.exec(stmt);
  const db = drizzle(client, { schema: jobosSchema });
  return { db, client, statements };
}
