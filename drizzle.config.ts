import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// This line is the fix: it loads your .env file / secrets
dotenv.config(); 

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});