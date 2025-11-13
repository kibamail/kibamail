/**
 * Test setup file
 * Loads environment variables before tests run
 */

import * as dotenv from "dotenv";
import * as path from "node:path";

// Set NODE_ENV to development (required for env schema validation)
process.env.NODE_ENV = "development";

// Disable Prisma query logs during tests
process.env.DISABLE_PRISMA_LOGS = "true";

// Load .env.local file first
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });
