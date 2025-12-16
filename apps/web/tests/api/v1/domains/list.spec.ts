/**
 * Integration tests for Sending Domain Listing (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/domains - List sending domains with pagination
 */

import { POST, GET } from "@/app/api/v1/domains/route";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  cleanupWorkspace,
  post,
  get,
  apiRequest,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";
import { ErrorType, ErrorCode } from "@/lib/api/error-codes";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

/**
 * Helper to create a test sending domain
 */
async function createTestDomain(apiKey: CreatedApiKey, name: string) {
  const domainData = { name };
  const request = post("/domains", domainData, apiKey.key);
  const response = await POST(request);
  return await response.json();
}

/**
 * Setup: Create a test workspace and API keys for authentication
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("GET /api/v1/domains", () => {
  test("should list sending domains for workspace", async () => {
    // Create some domains first
    await createTestDomain(fullAccessApiKey, "list-test-1.example.com");
    await createTestDomain(fullAccessApiKey, "list-test-2.example.com");

    const request = get("/domains", fullAccessApiKey.key);
    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("sending_domain_list");
    expect(responseData.data).toBeDefined();
    expect(Array.isArray(responseData.data)).toBe(true);
    expect(responseData.data.length).toBeGreaterThanOrEqual(2);
    expect(responseData.hasMore).toBeDefined();
  });

  test("should return empty list for workspace with no domains", async () => {
    // Create a new workspace with no domains
    const emptyWorkspace = createTestWorkspace();
    const emptyApiKey = await createFullAccessApiKey(emptyWorkspace.id);

    const request = get("/domains", emptyApiKey.key);
    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("sending_domain_list");
    expect(responseData.data).toEqual([]);
    expect(responseData.hasMore).toBe(false);

    await cleanupWorkspace(emptyWorkspace.id);
  });

  test("should support pagination with limit parameter", async () => {
    const request = get("/domains?limit=1", fullAccessApiKey.key);
    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBeLessThanOrEqual(1);
  });

  test("should support cursor-based pagination with after parameter", async () => {
    // Get first page
    const firstRequest = get("/domains?limit=1", fullAccessApiKey.key);
    const firstResponse = await GET(firstRequest);
    const firstData = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstData.data.length).toBe(1);

    // Get second page using cursor
    const afterCursor = firstData.data[0].id;
    const secondRequest = get(`/domains?limit=1&after=${afterCursor}`, fullAccessApiKey.key);
    const secondResponse = await GET(secondRequest);
    const secondData = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    // The second page should have different items
    if (secondData.data.length > 0) {
      expect(secondData.data[0].id).not.toBe(afterCursor);
    }
  });

  test("should not list domains from other workspaces", async () => {
    // Create another workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    // Create domain in other workspace
    await createTestDomain(otherApiKey, "other-workspace.example.com");

    // List domains in original workspace - should not include the other workspace's domain
    const request = get("/domains", fullAccessApiKey.key);
    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    const domainNames = responseData.data.map((d: { name: string }) => d.name);
    expect(domainNames).not.toContain("other-workspace.example.com");

    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should reject request without read:domains scope", async () => {
    const writeOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:domains"],
    });

    const request = get("/domains", writeOnlyKey.key);
    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });

  test("should reject request with missing Authorization header", async () => {
    const request = apiRequest("/domains").method("GET").build();
    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_AUTHORIZATION_HEADER);
  });

  test("should include all required fields in each domain", async () => {
    const request = get("/domains", fullAccessApiKey.key);
    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);

    if (responseData.data.length > 0) {
      const domain = responseData.data[0];
      expect(domain.id).toBeDefined();
      expect(domain.name).toBeDefined();
      expect(typeof domain.dkimVerified).toBe("boolean");
      expect(typeof domain.returnPathVerified).toBe("boolean");
      expect(typeof domain.trackingVerified).toBe("boolean");
      expect(typeof domain.openTrackingEnabled).toBe("boolean");
      expect(typeof domain.clickTrackingEnabled).toBe("boolean");
      expect(domain.dnsRecords).toBeDefined();
      expect(domain.createdAt).toBeDefined();
    }
  });
});
