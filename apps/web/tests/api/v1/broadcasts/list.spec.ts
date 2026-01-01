/**
 * Integration tests for Broadcast List Operations (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/broadcasts - List broadcasts with pagination
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { GET as ListBroadcasts, POST as CreateBroadcast } from "@/app/(main)/api/v1/broadcasts/route";
import { ErrorCode } from "@/lib/api/error-codes";
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
 * Helper to create a test broadcast
 */
async function createTestBroadcast(apiKey: CreatedApiKey, name: string) {
  const request = post("/broadcasts", { name }, apiKey.key);
  const response = await CreateBroadcast(request);
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

describe("GET /api/v1/broadcasts", () => {
  test("should list broadcasts", async () => {
    // Create some broadcasts
    await createTestBroadcast(fullAccessApiKey, "List Broadcast 1");
    await createTestBroadcast(fullAccessApiKey, "List Broadcast 2");

    const request = get("/broadcasts", fullAccessApiKey.key);
    const response = await ListBroadcasts(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("broadcast_list");
    expect(responseData.data).toBeDefined();
    expect(Array.isArray(responseData.data)).toBe(true);
    expect(responseData.data.length).toBeGreaterThanOrEqual(2);
  });

  test("should return empty list for workspace with no broadcasts", async () => {
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const request = get("/broadcasts", otherApiKey.key);
    const response = await ListBroadcasts(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("broadcast_list");
    expect(responseData.data).toEqual([]);
    expect(responseData.hasMore).toBe(false);

    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should paginate broadcasts with limit", async () => {
    // Create enough broadcasts for pagination
    const createdIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const broadcast = await createTestBroadcast(
        fullAccessApiKey,
        `Paginate Broadcast ${i}`,
      );
      createdIds.push(broadcast.id);
    }

    const request = get("/broadcasts?limit=2", fullAccessApiKey.key);
    const response = await ListBroadcasts(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(2);
    expect(responseData.hasMore).toBe(true);
  });

  test("should paginate broadcasts with after cursor", async () => {
    // Create broadcasts
    const broadcast1 = await createTestBroadcast(fullAccessApiKey, "Cursor Test 1");
    await createTestBroadcast(fullAccessApiKey, "Cursor Test 2");

    // First page
    const firstRequest = get("/broadcasts?limit=1", fullAccessApiKey.key);
    const firstResponse = await ListBroadcasts(firstRequest);
    const firstData = await firstResponse.json();

    expect(firstData.data.length).toBe(1);
    const firstId = firstData.data[0].id;

    // Second page using after cursor
    const secondRequest = get(`/broadcasts?limit=1&after=${firstId}`, fullAccessApiKey.key);
    const secondResponse = await ListBroadcasts(secondRequest);
    const secondData = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondData.data.length).toBeGreaterThanOrEqual(1);
    expect(secondData.data[0].id).not.toBe(firstId);
  });

  test("should only list broadcasts from own workspace", async () => {
    // Create broadcast in main workspace
    const mainBroadcast = await createTestBroadcast(
      fullAccessApiKey,
      "Main Workspace Broadcast",
    );

    // Create different workspace with its own broadcast
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);
    const otherBroadcast = await createTestBroadcast(
      otherApiKey,
      "Other Workspace Broadcast",
    );

    // List from main workspace
    const mainRequest = get("/broadcasts", fullAccessApiKey.key);
    const mainResponse = await ListBroadcasts(mainRequest);
    const mainData = await mainResponse.json();

    const mainIds = mainData.data.map((b: { id: string }) => b.id);
    expect(mainIds).toContain(mainBroadcast.id);
    expect(mainIds).not.toContain(otherBroadcast.id);

    // List from other workspace
    const otherRequest = get("/broadcasts", otherApiKey.key);
    const otherResponse = await ListBroadcasts(otherRequest);
    const otherData = await otherResponse.json();

    const otherIds = otherData.data.map((b: { id: string }) => b.id);
    expect(otherIds).toContain(otherBroadcast.id);
    expect(otherIds).not.toContain(mainBroadcast.id);

    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should reject request without read:broadcasts scope", async () => {
    const writeOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:broadcasts"],
    });

    const request = get("/broadcasts", writeOnlyApiKey.key);
    const response = await ListBroadcasts(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });

  test("should return broadcasts in descending order by default", async () => {
    // Create broadcasts with known order
    const first = await createTestBroadcast(fullAccessApiKey, "Order Test First");
    const second = await createTestBroadcast(fullAccessApiKey, "Order Test Second");
    const third = await createTestBroadcast(fullAccessApiKey, "Order Test Third");

    const request = get("/broadcasts?limit=10", fullAccessApiKey.key);
    const response = await ListBroadcasts(request);
    const responseData = await response.json();

    const ids = responseData.data.map((b: { id: string }) => b.id);
    const firstIndex = ids.indexOf(first.id);
    const secondIndex = ids.indexOf(second.id);
    const thirdIndex = ids.indexOf(third.id);

    // Most recent should come first (descending order)
    expect(thirdIndex).toBeLessThan(secondIndex);
    expect(secondIndex).toBeLessThan(firstIndex);
  });
});
