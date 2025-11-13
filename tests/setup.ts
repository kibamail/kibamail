/**
 * Test setup file
 * Loads environment variables before tests run
 */

import * as dotenv from "dotenv";
import * as path from "node:path";

// Disable Prisma query logs during tests
// process.env.DISABLE_PRISMA_LOGS = "true";

// Load .env.local file first
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });
