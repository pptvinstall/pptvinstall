#!/usr/bin/env node

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname;

const envFiles = [
  path.join(projectRoot, ".env.local"),
  path.join(projectRoot, ".env"),
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: false });
  }
}

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "ADMIN_EMAIL",
  "EMAIL_FROM",
];

const OPTIONAL_EMAIL_ENV_VARS = [
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
];

const REQUIRED_TABLES = [
  "bookings",
  "booking_archives",
  "business_hours",
  "customers",
  "promotions",
  "system_settings",
];

function getMaskedDatabaseTarget(rawUrl) {
  if (!rawUrl) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);
    return {
      protocol: parsed.protocol,
      host: parsed.hostname,
      database: parsed.pathname,
    };
  } catch {
    return { invalid: true };
  }
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

async function run() {
  const startedAt = Date.now();
  const presentEnv = Object.fromEntries(
    REQUIRED_ENV_VARS.map((key) => [key, Boolean(process.env[key])]),
  );
  const emailEnv = Object.fromEntries(
    OPTIONAL_EMAIL_ENV_VARS.map((key) => [key, Boolean(process.env[key])]),
  );

  const missingRequiredEnv = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  const result = {
    status: "healthy",
    checkedAt: new Date().toISOString(),
    durationMs: 0,
    env: {
      required: presentEnv,
      email: emailEnv,
      databaseTarget: getMaskedDatabaseTarget(process.env.DATABASE_URL),
    },
    database: {
      reachable: false,
      queryOk: false,
      requiredTablesPresent: false,
      tablesFound: [],
      missingTables: [],
      error: null,
    },
  };

  if (missingRequiredEnv.length > 0) {
    result.status = "unhealthy";
    result.database.error = `Missing required environment variables: ${missingRequiredEnv.join(", ")}`;
    result.durationMs = Date.now() - startedAt;
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    await withTimeout(sql`SELECT 1 AS ok`, 8000, "database connectivity check");
    result.database.reachable = true;
    result.database.queryOk = true;

    const tables = await withTimeout(
      sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY(${REQUIRED_TABLES})
        ORDER BY table_name
      `,
      8000,
      "required tables check",
    );

    result.database.tablesFound = tables.map((row) => row.table_name);
    result.database.missingTables = REQUIRED_TABLES.filter(
      (table) => !result.database.tablesFound.includes(table),
    );
    result.database.requiredTablesPresent = result.database.missingTables.length === 0;

    if (!result.database.requiredTablesPresent) {
      result.status = "unhealthy";
    } else if (!emailEnv.GMAIL_USER || !emailEnv.GMAIL_APP_PASSWORD) {
      result.status = "degraded";
    }
  } catch (error) {
    result.status = "unhealthy";
    result.database.error = error instanceof Error ? error.message : String(error);
  }

  result.durationMs = Date.now() - startedAt;
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.status === "unhealthy" ? 1 : 0);
}

run().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: "unhealthy",
        checkedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
