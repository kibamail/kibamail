/**
 * Integration tests for Segment Listing (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/segments - List segments with cursor-based pagination
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { GET, POST } from "@/app/(main)/api/v1/segments/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestWorkspace,
  get,
  post,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

/**
 * Helper to create a test segment
 */
async function createTestSegment(apiKey: CreatedApiKey, name: string) {
  const segmentData = {
    name,
    conditions: {
      field: "status",
      operator: "eq",
      value: "SUBSCRIBED",
    },
  };
  const request = post("/segments", segmentData, apiKey.key);
  const response = await POST(request);
  return await response.json();
}

/**
 * Setup: Create a test workspace and API key
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

describe("GET /api/v1/segments", () => {
  test("should list segments with default limit", async () => {
    await createTestSegment(fullAccessApiKey, "Segment 1");
    await createTestSegment(fullAccessApiKey, "Segment 2");
    await createTestSegment(fullAccessApiKey, "Segment 3");

    const request = get("/segments", fullAccessApiKey.key);
    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("segment_list");
    expect(responseData.data).toBeDefined();
    expect(responseData.hasMore).toBeDefined();
    expect(responseData.data.length).toBeGreaterThanOrEqual(3);
  });

  test("should paginate through segments", async () => {
    // Create 50 segments to test pagination
    const segments = [];
    for (let i = 1; i <= 50; i++) {
      const segment = await createTestSegment(
        fullAccessApiKey,
        `Pagination Test ${i}`,
      );
      segments.push(segment);
    }

    // First page
    const firstRequest = get("/segments?limit=20", fullAccessApiKey.key);
    const firstResponse = await GET(firstRequest);
    const firstData = await firstResponse.json();

    expect(firstData.object).toBe("segment_list");
    expect(firstData.data).toHaveLength(20);
    expect(firstData.hasMore).toBe(true);

    // Second page using after cursor
    const lastIdFromFirstPage = firstData.data[firstData.data.length - 1].id;
    const secondRequest = get(
      `/segments?limit=20&after=${lastIdFromFirstPage}`,
      fullAccessApiKey.key,
    );
    const secondResponse = await GET(secondRequest);
    const secondData = await secondResponse.json();

    expect(secondData.object).toBe("segment_list");
    expect(secondData.data).toHaveLength(20);
    expect(secondData.hasMore).toBe(true);

    // Third page
    const lastIdFromSecondPage = secondData.data[secondData.data.length - 1].id;
    const thirdRequest = get(
      `/segments?limit=20&after=${lastIdFromSecondPage}`,
      fullAccessApiKey.key,
    );
    const thirdResponse = await GET(thirdRequest);
    const thirdData = await thirdResponse.json();

    expect(thirdData.object).toBe("segment_list");
    expect(thirdData.data.length).toBeGreaterThanOrEqual(10);
  });

  test("should not include cursor item in results", async () => {
    const segment1 = await createTestSegment(fullAccessApiKey, "Cursor Test 1");
    await createTestSegment(fullAccessApiKey, "Cursor Test 2");

    const request = get(
      `/segments?limit=10&after=${segment1.id}`,
      fullAccessApiKey.key,
    );
    const response = await GET(request);
    const responseData = await response.json();

    expect(responseData.object).toBe("segment_list");
    const ids = responseData.data.map((s: any) => s.id);
    expect(ids).not.toContain(segment1.id);
  });

  test("should support before cursor for backward pagination", async () => {
    const _segment1 = await createTestSegment(
      fullAccessApiKey,
      "Before Test 1",
    );
    const _segment2 = await createTestSegment(
      fullAccessApiKey,
      "Before Test 2",
    );
    const segment3 = await createTestSegment(fullAccessApiKey, "Before Test 3");

    const request = get(
      `/segments?limit=10&before=${segment3.id}`,
      fullAccessApiKey.key,
    );
    const response = await GET(request);
    const responseData = await response.json();

    expect(responseData.object).toBe("segment_list");
    const ids = responseData.data.map((s: any) => s.id);
    expect(ids).not.toContain(segment3.id);
  });

  test("should support custom limit", async () => {
    await createTestSegment(fullAccessApiKey, "Limit Test 1");
    await createTestSegment(fullAccessApiKey, "Limit Test 2");
    await createTestSegment(fullAccessApiKey, "Limit Test 3");
    await createTestSegment(fullAccessApiKey, "Limit Test 4");
    await createTestSegment(fullAccessApiKey, "Limit Test 5");

    const request = get("/segments?limit=3", fullAccessApiKey.key);
    const response = await GET(request);
    const responseData = await response.json();

    expect(responseData.object).toBe("segment_list");
    expect(responseData.data.length).toBeLessThanOrEqual(3);
  });

  test("should enforce maximum limit of 100", async () => {
    const request = get("/segments?limit=200", fullAccessApiKey.key);
    const response = await GET(request);
    const responseData = await response.json();

    expect(responseData.object).toBe("segment_list");
    expect(responseData.data.length).toBeLessThanOrEqual(100);
  });

  test("should return empty array when no segments exist", async () => {
    const newWorkspace = createTestWorkspace();
    const newApiKey = await createFullAccessApiKey(newWorkspace.id);

    const request = get("/segments", newApiKey.key);
    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("segment_list");
    expect(responseData.data).toBeDefined();
    expect(responseData.data).toHaveLength(0);
    expect(responseData.hasMore).toBe(false);

    await cleanupWorkspace(newWorkspace.id);
  });

  test("should only return segments for authenticated workspace", async () => {
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    // Create segment in other workspace
    await createTestSegment(otherApiKey, "Other Workspace Segment");

    // List segments for original workspace
    const request = get("/segments", fullAccessApiKey.key);
    const response = await GET(request);
    const responseData = await response.json();

    // Should not include segment from other workspace
    const names = responseData.data.map((s: any) => s.name);
    expect(names).not.toContain("Other Workspace Segment");

    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should include all segment fields in response", async () => {
    const segment = await createTestSegment(fullAccessApiKey, "Field Test");

    const request = get("/segments", fullAccessApiKey.key);
    const response = await GET(request);
    const responseData = await response.json();

    const foundSegment = responseData.data.find(
      (s: any) => s.id === segment.id,
    );

    expect(foundSegment).toBeDefined();
    expect(foundSegment.id).toBeDefined();
    expect(foundSegment.name).toBeDefined();
    expect(foundSegment.conditions).toBeDefined();
    expect(foundSegment.description).toBeDefined();
  });

  test("should reject request with missing Authorization header", async () => {
    const request = get("/segments");

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(
      ErrorCode.MISSING_AUTHORIZATION_HEADER,
    );
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject request without read:segments scope", async () => {
    const writeOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:segments"],
    });

    const request = get("/segments", writeOnlyKey.key);
    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should set hasMore to false when no more results", async () => {
    const newWorkspace = createTestWorkspace();
    const newApiKey = await createFullAccessApiKey(newWorkspace.id);

    // Create exactly 5 segments
    for (let i = 1; i <= 5; i++) {
      await createTestSegment(newApiKey, `HasMore Test ${i}`);
    }

    const request = get("/segments?limit=10", newApiKey.key);
    const response = await GET(request);
    const responseData = await response.json();

    expect(responseData.data).toHaveLength(5);
    expect(responseData.hasMore).toBe(false);

    await cleanupWorkspace(newWorkspace.id);
  });
});
