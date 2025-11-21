/**
 * Test setup file
 *
 * This file is executed before running tests.
 * It sets up the test environment and configuration.
 */

import { beforeAll, afterAll } from "vitest";

// Mock API server configuration
export const MOCK_API_URL = process.env.MOCK_API_URL || "http://localhost:4010";
export const MOCK_API_KEY = "sk_test_mock_api_key_12345";

beforeAll(() => {
  console.log("🚀 Starting test suite...");
  console.log(`📡 Mock API URL: ${MOCK_API_URL}`);
});

afterAll(() => {
  console.log("✅ Test suite completed");
});
