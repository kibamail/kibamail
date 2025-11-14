/**
 * Integration tests for Tag Listing (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/tags - List tags with cursor-based pagination
 */

import { GET } from "@/app/api/v1/tags/route";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Tag } from "@prisma/client";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createReadOnlyApiKey,
  createTestApiKey,
  cleanupWorkspace,
  get,
  apiRequest,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";
import { prisma } from "@/lib/db";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;
let readOnlyApiKey: CreatedApiKey;

/**
 * Helper to create multiple test tags
 */
async function createTestTags(workspaceId: string, count: number) {
  const tags = [];
  for (let i = 0; i < count; i++) {
    const tag = await prisma.tag.create({
      data: {
        workspaceId,
        name: `Tag ${i + 1}`,
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0").toUpperCase()}`,
      },
    });
    tags.push(tag);
  }
  return tags;
}

/**
 * Setup: Create a test workspace, API keys, and test tags
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
  readOnlyApiKey = await createReadOnlyApiKey(testWorkspace.id);

  // Create 50 tags for thorough pagination testing
  await createTestTags(testWorkspace.id, 50);
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("GET /api/v1/tags", () => {
  test("should list tags with cursor-based pagination (default limit)", async () => {
    const request = get("/tags", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("tag_list");
    expect(responseData.data).toBeDefined();
    expect(responseData.data.length).toBe(20); // Default limit
    expect(responseData.hasMore).toBe(true); // Should have more since we have 50 total

    const tag = responseData.data[0];
    expect(tag.id).toBeDefined();
    expect(tag.name).toBeDefined();
    expect(tag.color).toBeDefined();
  });

  test("should reject request with missing Authorization header", async () => {
    const request = get("/tags");

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("Authorization header");
  });

  test("should reject request without read:tags scope", async () => {
    const writeOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:tags"], // Missing read:tags
    });

    const request = get("/tags", writeOnlyApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("scope");
  });

  test("should paginate through all 50 tags with 10 per page", async () => {
    let allTags: Tag[] = [];
    let cursor: string | null = null;
    let pageCount = 0;
    let hasMore = true;

    // Paginate through all tags
    while (hasMore && pageCount < 10) {
      // Safety limit to prevent infinite loops
      const request = apiRequest("/tags")
        .method("GET")
        .auth(fullAccessApiKey.key)
        .build();

      request.nextUrl.searchParams.set("limit", "10");
      if (cursor) {
        request.nextUrl.searchParams.set("after", cursor);
      }

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.object).toBe("tag_list");
      expect(responseData.data).toBeDefined();

      // Add tags to our collection
      allTags.push(...responseData.data);

      // Update pagination state
      hasMore = responseData.hasMore;
      cursor =
        responseData.data.length > 0
          ? responseData.data[responseData.data.length - 1].id
          : null;

      pageCount++;

      // Validate page size (should be 10 except possibly the last page)
      if (hasMore) {
        expect(responseData.data.length).toBe(10);
      } else {
        expect(responseData.data.length).toBeGreaterThan(0);
        expect(responseData.data.length).toBeLessThanOrEqual(10);
      }
    }

    // Validate we got all 50 tags
    expect(allTags.length).toBe(50);
    expect(pageCount).toBe(5); // 50 tags / 10 per page = 5 pages
    expect(hasMore).toBe(false);

    // Validate no duplicate tags
    const tagIds = allTags.map((tag) => tag.id);
    const uniqueIds = new Set(tagIds);
    expect(uniqueIds.size).toBe(50);

    // Validate all tags have required fields
    allTags.forEach((tag) => {
      expect(tag.name).toBeDefined();
      expect(tag.id).toBeDefined();
    });
  });

  test("should exclude cursor tag from results", async () => {
    // Get first page
    const firstRequest = apiRequest("/tags")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();
    firstRequest.nextUrl.searchParams.set("limit", "10");

    const firstResponse = await GET(firstRequest);
    const firstData = await firstResponse.json();

    expect(firstData.data.length).toBe(10);
    const cursorTagId = firstData.data[9].id; // Use last tag as cursor

    // Get second page using cursor
    const secondRequest = apiRequest("/tags")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();
    secondRequest.nextUrl.searchParams.set("limit", "10");
    secondRequest.nextUrl.searchParams.set("after", cursorTagId);

    const secondResponse = await GET(secondRequest);
    const secondData = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondData.object).toBe("tag_list");
    expect(secondData.data).toBeDefined();
    expect(secondData.data.length).toBe(10);
    expect(secondData.hasMore).toBe(true);

    // Ensure the cursor tag is excluded from results
    expect(
      secondData.data.every((tag: Tag) => tag.id !== cursorTagId)
    ).toBe(true);

    // Ensure no overlap between pages
    const firstPageIds = firstData.data.map((tag: Tag) => tag.id);
    const secondPageIds = secondData.data.map((tag: Tag) => tag.id);
    const overlap = firstPageIds.filter((id: string) =>
      secondPageIds.includes(id)
    );
    expect(overlap.length).toBe(0);
  });

  test("should handle before cursor for reverse pagination", async () => {
    // Get second page first
    const firstRequest = apiRequest("/tags")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();
    firstRequest.nextUrl.searchParams.set("limit", "10");

    const firstResponse = await GET(firstRequest);
    const firstData = await firstResponse.json();
    const firstPageLastTagId = firstData.data[9].id;

    // Get third page to get a cursor
    const secondRequest = apiRequest("/tags")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();
    secondRequest.nextUrl.searchParams.set("limit", "10");
    secondRequest.nextUrl.searchParams.set("after", firstPageLastTagId);

    const secondResponse = await GET(secondRequest);
    const secondData = await secondResponse.json();
    const thirdPageFirstTagId = secondData.data[0].id;

    // Now use before cursor to go back
    const beforeRequest = apiRequest("/tags")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();
    beforeRequest.nextUrl.searchParams.set("limit", "10");
    beforeRequest.nextUrl.searchParams.set("before", thirdPageFirstTagId);

    const beforeResponse = await GET(beforeRequest);
    const beforeData = await beforeResponse.json();

    expect(beforeResponse.status).toBe(200);
    expect(beforeData.object).toBe("tag_list");
    expect(beforeData.data).toBeDefined();
    expect(beforeData.data.length).toBe(10);

    // Ensure the before cursor tag is excluded
    expect(
      beforeData.data.every((tag: Tag) => tag.id !== thirdPageFirstTagId)
    ).toBe(true);
  });

  test("should respect custom limit parameter", async () => {
    const request = apiRequest("/tags")
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
    const request = apiRequest("/tags")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();
    request.nextUrl.searchParams.set("limit", "200"); // Request more than max

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBeLessThanOrEqual(100); // Should cap at 100
  });
});
