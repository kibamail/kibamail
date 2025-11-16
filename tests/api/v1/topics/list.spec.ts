/**
 * Integration tests for Topic Listing (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/topics - List topics with cursor-based pagination
 */

import { GET } from "@/app/api/v1/topics/route";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Topic } from "@prisma/client";
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
import { prisma } from "@/lib/db";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

/**
 * Helper to create multiple test topics
 */
async function createTestTopics(workspaceId: string, count: number) {
  const topics = [];
  for (let i = 0; i < count; i++) {
    const topic = await prisma.topic.create({
      data: {
        workspaceId,
        name: `Topic ${i + 1}`,
        description: `Description for topic ${i + 1}`,
        visibility: i % 2 === 0 ? "PUBLIC" : "PRIVATE",
      },
    });
    topics.push(topic);
  }
  return topics;
}

/**
 * Setup: Create a test workspace, API keys, and test topics
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);

  // Create 50 topics for thorough pagination testing
  await createTestTopics(testWorkspace.id, 50);
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("GET /api/v1/topics", () => {
  test("should list topics with cursor-based pagination (default limit)", async () => {
    const request = get("/topics", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("topic_list");
    expect(responseData.data).toBeDefined();
    expect(responseData.data.length).toBe(20); // Default limit
    expect(responseData.hasMore).toBe(true); // Should have more since we have 50 total

    const topic = responseData.data[0];
    expect(topic.id).toBeDefined();
    expect(topic.name).toBeDefined();
    expect(topic.visibility).toBeDefined();
    expect(topic.defaultOptIn).toBeDefined();
  });

  test("should reject request with missing Authorization header", async () => {
    const request = get("/topics");

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("Authorization header");
  });

  test("should reject request without read:topics scope", async () => {
    const writeOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:topics"],
    });

    const request = get("/topics", writeOnlyApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("scope");
  });

  test("should paginate through all 50 topics with 10 per page", async () => {
    let allTopics: Topic[] = [];
    let cursor: string | null = null;
    let pageCount = 0;
    let hasMore = true;

    // Paginate through all topics
    while (hasMore && pageCount < 10) {
      // Safety limit to prevent infinite loops
      const request = apiRequest("/topics")
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
      expect(responseData.object).toBe("topic_list");
      expect(responseData.data).toBeDefined();

      // Add topics to our collection
      allTopics.push(...responseData.data);

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

    // Validate we got all 50 topics
    expect(allTopics.length).toBe(50);
    expect(pageCount).toBe(5); // 50 topics / 10 per page = 5 pages
    expect(hasMore).toBe(false);

    // Validate no duplicate topics
    const topicIds = allTopics.map((topic) => topic.id);
    const uniqueIds = new Set(topicIds);
    expect(uniqueIds.size).toBe(50);

    // Validate all topics have required fields
    allTopics.forEach((topic) => {
      expect(topic.name).toBeDefined();
      expect(topic.id).toBeDefined();
    });
  });

  test("should exclude cursor topic from results", async () => {
    // Get first page
    const firstRequest = apiRequest("/topics")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();
    firstRequest.nextUrl.searchParams.set("limit", "10");

    const firstResponse = await GET(firstRequest);
    const firstData = await firstResponse.json();

    expect(firstData.data.length).toBe(10);
    const cursorTopicId = firstData.data[9].id; // Use last topic as cursor

    // Get second page using cursor
    const secondRequest = apiRequest("/topics")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();
    secondRequest.nextUrl.searchParams.set("limit", "10");
    secondRequest.nextUrl.searchParams.set("after", cursorTopicId);

    const secondResponse = await GET(secondRequest);
    const secondData = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondData.object).toBe("topic_list");
    expect(secondData.data).toBeDefined();
    expect(secondData.data.length).toBe(10);
    expect(secondData.hasMore).toBe(true);

    // Ensure the cursor topic is excluded from results
    expect(
      secondData.data.every((topic: Topic) => topic.id !== cursorTopicId)
    ).toBe(true);

    // Ensure no overlap between pages
    const firstPageIds = firstData.data.map((topic: Topic) => topic.id);
    const secondPageIds = secondData.data.map((topic: Topic) => topic.id);
    const overlap = firstPageIds.filter((id: string) =>
      secondPageIds.includes(id)
    );
    expect(overlap.length).toBe(0);
  });

  test("should handle before cursor for reverse pagination", async () => {
    // Get second page first
    const firstRequest = apiRequest("/topics")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();
    firstRequest.nextUrl.searchParams.set("limit", "10");

    const firstResponse = await GET(firstRequest);
    const firstData = await firstResponse.json();
    const firstPageLastTopicId = firstData.data[9].id;

    // Get third page to get a cursor
    const secondRequest = apiRequest("/topics")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();
    secondRequest.nextUrl.searchParams.set("limit", "10");
    secondRequest.nextUrl.searchParams.set("after", firstPageLastTopicId);

    const secondResponse = await GET(secondRequest);
    const secondData = await secondResponse.json();
    const thirdPageFirstTopicId = secondData.data[0].id;

    // Now use before cursor to go back
    const beforeRequest = apiRequest("/topics")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();
    beforeRequest.nextUrl.searchParams.set("limit", "10");
    beforeRequest.nextUrl.searchParams.set("before", thirdPageFirstTopicId);

    const beforeResponse = await GET(beforeRequest);
    const beforeData = await beforeResponse.json();

    expect(beforeResponse.status).toBe(200);
    expect(beforeData.object).toBe("topic_list");
    expect(beforeData.data).toBeDefined();
    expect(beforeData.data.length).toBe(10);

    // Ensure the before cursor topic is excluded
    expect(
      beforeData.data.every((topic: Topic) => topic.id !== thirdPageFirstTopicId)
    ).toBe(true);
  });

  test("should respect custom limit parameter", async () => {
    const request = apiRequest("/topics")
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
    const request = apiRequest("/topics")
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
