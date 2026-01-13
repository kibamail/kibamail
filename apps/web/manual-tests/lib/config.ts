/**
 * Manual Test Configuration
 *
 * Loads environment configuration for manual tests.
 * Uses .env.local for development database connection.
 */

import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

export interface ManualTestConfig {
  databaseUrl: string;
  apiBaseUrl: string;
  mailpitUrl: string;
}

/**
 * Load and validate manual test configuration from environment.
 */
export function loadConfig(): ManualTestConfig {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not found in .env.local");
  }

  return {
    databaseUrl,
    apiBaseUrl: process.env.API_BASE_URL || "http://localhost:18092/api",
    mailpitUrl: process.env.MAILPIT_URL || "http://localhost:8025",
  };
}

export const testConfig = loadConfig();
