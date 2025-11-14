/**
 * Integration tests for Topic Creation (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/topics - Create new topic
 */

import { POST } from "@/app/api/v1/topics/route";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  cleanupWorkspace,
  post,
  apiRequest,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

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

describe("POST /api/v1/topics", () => {
  test("should create a new topic with required fields", async () => {
    const topicData = {
      name: "Product Updates",
      slug: "product-updates",
    };
    const request = post("/topics", topicData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("topic");
    expect(responseData.id).toBeDefined();
  });

  test("should create a topic with all fields", async () => {
    const topicData = {
      name: "Newsletter",
      description: "Weekly newsletter with updates",
      slug: "newsletter",
      visibility: "PUBLIC" as const,
      isPrimary: true,
    };
    const request = post("/topics", topicData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("topic");
    expect(responseData.id).toBeDefined();
  });

  test("should create a private topic", async () => {
    const topicData = {
      name: "Internal Updates",
      slug: "internal-updates",
      visibility: "PRIVATE" as const,
    };
    const request = post("/topics", topicData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("topic");
    expect(responseData.id).toBeDefined();
  });

  test("should reject duplicate slug in same workspace", async () => {
    const topicData = {
      name: "Duplicate Topic",
      slug: "duplicate-slug",
    };

    const firstRequest = post("/topics", topicData, fullAccessApiKey.key);
    await POST(firstRequest);

    const duplicateRequest = post("/topics", topicData, fullAccessApiKey.key);
    const response = await POST(duplicateRequest);
    const responseData = await response.json();

    expect(response.status).toBe(409);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("already exists");
  });

  test("should allow same slug in different workspaces", async () => {
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const topicData = {
      name: "Shared Slug",
      slug: "shared-slug",
    };

    const firstRequest = post("/topics", topicData, fullAccessApiKey.key);
    const firstResponse = await POST(firstRequest);
    expect(firstResponse.status).toBe(201);

    const secondRequest = post("/topics", topicData, otherApiKey.key);
    const secondResponse = await POST(secondRequest);
    expect(secondResponse.status).toBe(201);

    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should reject request with missing Authorization header", async () => {
    const topicData = { name: "Test Topic", slug: "test-topic" };
    const request = apiRequest("/topics").method("POST").body(topicData).build();

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("Authorization header");
  });

  test("should reject request without write:topics scope", async () => {
    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:topics"],
    });

    const topicData = { name: "Test Topic", slug: "test-topic" };
    const request = post("/topics", topicData, readOnlyKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("scope");
  });

  test("should reject topic with empty name", async () => {
    const topicData = {
      name: "",
      slug: "empty-name",
    };
    const request = post("/topics", topicData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBe("Validation failed");
  });

  test("should reject topic with name exceeding max length", async () => {
    const topicData = {
      name: "A".repeat(101), // Exceeds 100 character limit
      slug: "long-name",
    };
    const request = post("/topics", topicData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBe("Validation failed");
  });

  test("should reject topic with invalid slug format", async () => {
    const topicData = {
      name: "Invalid Slug",
      slug: "Invalid Slug!", // Contains spaces and special chars
    };
    const request = post("/topics", topicData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBe("Validation failed");
  });

  test("should trim whitespace from name and slug", async () => {
    const topicData = {
      name: "  Trimmed Topic  ",
      slug: "  trimmed-topic-unique  ",
    };
    const request = post("/topics", topicData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();
  });
});
