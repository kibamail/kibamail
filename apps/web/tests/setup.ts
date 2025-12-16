/**
 * Test setup file
 * Loads environment variables before tests run
 */

import * as dotenv from "dotenv";
import * as path from "node:path";

// Load .env.test file with override to ensure all variables are set
dotenv.config({
  path: path.resolve(process.cwd(), ".env.test"),
  override: true,
});

// Disable Prisma query logs during tests
// process.env.DISABLE_PRISMA_LOGS = "true";
