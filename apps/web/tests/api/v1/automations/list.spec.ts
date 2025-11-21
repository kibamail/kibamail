/**
 * Integration tests for Automation Listing (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/automations - List automations with cursor-based pagination
 */

import { GET } from "@/app/api/v1/automations/route";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  cleanupWorkspace,
  get,
  apiRequest,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";
import { ErrorType, ErrorCode } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

/**
 * Helper to create test automations
 */
async function createTestAutomations(workspaceId: string, count: number) {
  const automations = [];
  for (let i = 0; i < count; i++) {
    const automation = await prisma.automation.create({
      data: {
        workspaceId,
        name: `Automation ${i + 1}`,
        description: `Description for automation ${i + 1}`,
        status: i === 0 ? "DRAFT" : "PUBLISHED",
        version: 1,
        triggerType: "CONTACT_SUBSCRIBED",
        nodes: [
          {
            id: `trigger-${i}`,
            type: "contact-subscribed",
            position: { x: 0, y: 0 },
            data: {},
          },
        ],
        edges: [],
      },
    });
    automations.push(automation);
  }
  return automations;
}

/**
 * Setup: Create a test workspace, API keys, and test automations
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);

  // Create 30 automations (1 DRAFT, 29 PUBLISHED)
  await createTestAutomations(testWorkspace.id, 30);
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("GET /api/v1/automations", () => {
  test("should list PUBLISHED automations by default with cursor-based pagination", async () => {
    const request = get("/automations", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("automation_list");
    expect(responseData.data).toBeDefined();
    expect(responseData.data.length).toBe(20); // Default limit
    expect(responseData.hasMore).toBe(true); // Should have more since we have 29 PUBLISHED

    const automation = responseData.data[0];
    expect(automation.id).toBeDefined();
    expect(automation.name).toBeDefined();
    expect(automation.status).toBe("PUBLISHED");
    expect(automation.nodes).toBeDefined();
    expect(automation.edges).toBeDefined();
  });

  test("should filter automations by status=DRAFT", async () => {
    const request = apiRequest("/automations")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    request.nextUrl.searchParams.set("status", "DRAFT");

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("automation_list");
    expect(responseData.data.length).toBe(1); // Only 1 DRAFT
    expect(responseData.hasMore).toBe(false);
    expect(responseData.data[0].status).toBe("DRAFT");
  });

  test("should reject request with missing Authorization header", async () => {
    const request = get("/automations");

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_AUTHORIZATION_HEADER);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject request without read:automations scope", async () => {
    const writeOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:automations"],
    });

    const request = get("/automations", writeOnlyApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should paginate through automations with custom limit", async () => {
    const request = apiRequest("/automations")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    request.nextUrl.searchParams.set("limit", "10");

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(10);
    expect(responseData.hasMore).toBe(true);
  });

  test("should paginate with after cursor", async () => {
    // Get first page
    const firstRequest = apiRequest("/automations")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();
    firstRequest.nextUrl.searchParams.set("limit", "10");

    const firstResponse = await GET(firstRequest);
    const firstData = await firstResponse.json();

    expect(firstData.data.length).toBe(10);
    const cursorId = firstData.data[9].id;

    // Get second page using cursor
    const secondRequest = apiRequest("/automations")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();
    secondRequest.nextUrl.searchParams.set("limit", "10");
    secondRequest.nextUrl.searchParams.set("after", cursorId);

    const secondResponse = await GET(secondRequest);
    const secondData = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondData.data.length).toBe(10);

    // Ensure cursor automation is excluded
    expect(secondData.data.every((a: any) => a.id !== cursorId)).toBe(true);

    // Ensure no overlap
    const firstPageIds = firstData.data.map((a: any) => a.id);
    const secondPageIds = secondData.data.map((a: any) => a.id);
    const overlap = firstPageIds.filter((id: string) =>
      secondPageIds.includes(id)
    );
    expect(overlap.length).toBe(0);
  });

  test("should respect custom limit parameter", async () => {
    const request = apiRequest("/automations")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();
    request.nextUrl.searchParams.set("limit", "5");

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(5);
    expect(responseData.hasMore).toBe(true);
  });

  test("should enforce maximum limit of 100", async () => {
    const request = apiRequest("/automations")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();
    request.nextUrl.searchParams.set("limit", "200");

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBeLessThanOrEqual(100);
  });
});
