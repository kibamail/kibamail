/**
 * Integration tests for Individual Topic Operations (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/topics/[topicId] - Get specific topic
 * - PUT /api/v1/topics/[topicId] - Update specific topic
 * - DELETE /api/v1/topics/[topicId] - Delete specific topic
 */

import { GET, PUT, DELETE } from "@/app/api/v1/topics/[topicId]/route";
import { POST } from "@/app/api/v1/topics/route";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  cleanupWorkspace,
  post,
  get,
  put,
  del,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

/**
 * Helper to create a test topic
 */
async function createTestTopic(apiKey: CreatedApiKey, name: string) {
  const topicData = { name };
  const request = post("/topics", topicData, apiKey.key);
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

describe("GET /api/v1/topics/[topicId]", () => {
  test("should retrieve a topic by ID", async () => {
    const createdTopic = await createTestTopic(fullAccessApiKey, "Retrieve Test");
    const request = get(`/topics/${createdTopic.id}`, fullAccessApiKey.key);
    const params = Promise.resolve({ topicId: createdTopic.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("topic");
    expect(responseData.id).toBe(createdTopic.id);
    expect(responseData.name).toBe("Retrieve Test");
    expect(responseData.visibility).toBeDefined();
    expect(responseData.defaultOptIn).toBeDefined();
  });

  test("should return 404 for non-existent topic", async () => {
    const request = get("/topics/non_existent_id", fullAccessApiKey.key);
    const params = Promise.resolve({ topicId: "non_existent_id" });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("not found");
  });

  test("should not retrieve topic from different workspace", async () => {
    const createdTopic = await createTestTopic(fullAccessApiKey, "Workspace Test");

    // Create different workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const request = get(`/topics/${createdTopic.id}`, otherApiKey.key);
    const params = Promise.resolve({ topicId: createdTopic.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toContain("not found");

    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should reject request without read:topics scope", async () => {
    const createdTopic = await createTestTopic(fullAccessApiKey, "Scope Test");
    const writeOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:topics"],
    });

    const request = get(`/topics/${createdTopic.id}`, writeOnlyApiKey.key);
    const params = Promise.resolve({ topicId: createdTopic.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toContain("scope");
  });
});

describe("PUT /api/v1/topics/[topicId]", () => {
  test("should update topic name", async () => {
    const createdTopic = await createTestTopic(fullAccessApiKey, "Original Name");
    const updateData = { name: "Updated Name" };
    const request = put(`/topics/${createdTopic.id}`, updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ topicId: createdTopic.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("topic");
    expect(responseData.id).toBe(createdTopic.id);
  });
  test("should update topic visibility", async () => {
    const createdTopic = await createTestTopic(fullAccessApiKey, "Visibility Test");
    const updateData = { visibility: "PRIVATE" as const };
    const request = put(`/topics/${createdTopic.id}`, updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ topicId: createdTopic.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.id).toBeDefined();
  });
  test("should update defaultOptIn flag", async () => {
    const createdTopic = await createTestTopic(fullAccessApiKey, "OptIn Test");
    const updateData = { defaultOptIn: true };
    const request = put(`/topics/${createdTopic.id}`, updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ topicId: createdTopic.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.id).toBeDefined();
  });

  test("should update multiple fields at once", async () => {
    const createdTopic = await createTestTopic(fullAccessApiKey, "Multi Test");
    const updateData = {
      name: "Updated Multi",
      visibility: "PRIVATE" as const,
      description: "New description",
      defaultOptIn: true,
    };
    const request = put(`/topics/${createdTopic.id}`, updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ topicId: createdTopic.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.id).toBeDefined();
  });
  test("should reject update without update:topics scope", async () => {
    const createdTopic = await createTestTopic(fullAccessApiKey, "Scope Update Test");
    const readOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:topics"],
    });

    const updateData = { name: "Should Fail" };
    const request = put(`/topics/${createdTopic.id}`, updateData, readOnlyApiKey.key);
    const params = Promise.resolve({ topicId: createdTopic.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toContain("scope");
  });

  test("should return 404 when updating non-existent topic", async () => {
    const updateData = { name: "Does Not Exist" };
    const request = put("/topics/non_existent_id", updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ topicId: "non_existent_id" });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
  });
});

describe("DELETE /api/v1/topics/[topicId]", () => {
  test("should delete a topic", async () => {
    const createdTopic = await createTestTopic(fullAccessApiKey, "Topic to Delete");
    const request = del(`/topics/${createdTopic.id}`, fullAccessApiKey.key);
    const params = Promise.resolve({ topicId: createdTopic.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("topic");
    expect(responseData.id).toBe(createdTopic.id);

    // Verify topic is actually deleted
    const getRequest = get(`/topics/${createdTopic.id}`, fullAccessApiKey.key);
    const getParams = Promise.resolve({ topicId: createdTopic.id });
    const getResponse = await GET(getRequest, { params: getParams });

    expect(getResponse.status).toBe(404);
  });

  test("should return 404 when deleting non-existent topic", async () => {
    const request = del("/topics/non_existent_id", fullAccessApiKey.key);
    const params = Promise.resolve({ topicId: "non_existent_id" });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
  });

  test("should reject delete without delete:topics scope", async () => {
    const createdTopic = await createTestTopic(fullAccessApiKey, "Scope Delete Test");
    const readOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:topics"],
    });

    const request = del(`/topics/${createdTopic.id}`, readOnlyApiKey.key);
    const params = Promise.resolve({ topicId: createdTopic.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toContain("scope");
  });

  test("should not delete topic from different workspace", async () => {
    const createdTopic = await createTestTopic(fullAccessApiKey, "Workspace Delete Test");

    // Create different workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const request = del(`/topics/${createdTopic.id}`, otherApiKey.key);
    const params = Promise.resolve({ topicId: createdTopic.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toContain("not found");

    // Verify original topic still exists
    const getRequest = get(`/topics/${createdTopic.id}`, fullAccessApiKey.key);
    const getParams = Promise.resolve({ topicId: createdTopic.id });
    const getResponse = await GET(getRequest, { params: getParams });

    expect(getResponse.status).toBe(200);

    await cleanupWorkspace(otherWorkspace.id);
  });
});
