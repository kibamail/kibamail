/**
 * Integration tests for Individual Tag Operations (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/tags/[tagId] - Get specific tag
 * - PUT /api/v1/tags/[tagId] - Update specific tag
 * - DELETE /api/v1/tags/[tagId] - Delete specific tag
 */

import { GET, PUT, DELETE } from "@/app/api/v1/tags/[tagId]/route";
import { POST } from "@/app/api/v1/tags/route";
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
 * Helper to create a test tag
 */
async function createTestTag(apiKey: CreatedApiKey, name: string, color?: string) {
  const tagData = { name, ...(color && { color }) };
  const request = post("/tags", tagData, apiKey.key);
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

describe("GET /api/v1/tags/[tagId]", () => {
  test("should retrieve a tag by ID", async () => {
    const createdTag = await createTestTag(fullAccessApiKey, "Retrieve Test");
    const request = get(`/tags/${createdTag.id}`, fullAccessApiKey.key);
    const params = Promise.resolve({ tagId: createdTag.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.type).toBe("tag");
    expect(responseData.id).toBe(createdTag.id);
    expect(responseData.name).toBe("Retrieve Test");
    expect(responseData.color).toBeDefined();
  });

  test("should return 404 for non-existent tag", async () => {
    const request = get("/tags/non_existent_id", fullAccessApiKey.key);
    const params = Promise.resolve({ tagId: "non_existent_id" });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("not found");
  });

  test("should not retrieve tag from different workspace", async () => {
    const createdTag = await createTestTag(fullAccessApiKey, "Workspace Test");

    // Create different workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const request = get(`/tags/${createdTag.id}`, otherApiKey.key);
    const params = Promise.resolve({ tagId: createdTag.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toContain("not found");

    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should reject request without read:tags scope", async () => {
    const createdTag = await createTestTag(fullAccessApiKey, "Scope Test");
    const writeOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:tags"],
    });

    const request = get(`/tags/${createdTag.id}`, writeOnlyApiKey.key);
    const params = Promise.resolve({ tagId: createdTag.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toContain("scope");
  });
});

describe("PUT /api/v1/tags/[tagId]", () => {
  test("should update tag name", async () => {
    const createdTag = await createTestTag(fullAccessApiKey, "Original Name");
    const updateData = { name: "Updated Name" };
    const request = put(`/tags/${createdTag.id}`, updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ tagId: createdTag.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.type).toBe("tag");
    expect(responseData.id).toBe(createdTag.id);
  });

  test("should update tag color", async () => {
    const createdTag = await createTestTag(fullAccessApiKey, "Color Test");
    const updateData = { color: "#FF0000" };
    const request = put(`/tags/${createdTag.id}`, updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ tagId: createdTag.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.id).toBeDefined();
  });

  test("should update both name and color", async () => {
    const createdTag = await createTestTag(fullAccessApiKey, "Both Test");
    const updateData = { name: "Updated Both", color: "#00FF00" };
    const request = put(`/tags/${createdTag.id}`, updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ tagId: createdTag.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.id).toBeDefined();
  });

  test("should reject update with duplicate name in same workspace", async () => {
    await createTestTag(fullAccessApiKey, "Existing Tag");
    const tagToUpdate = await createTestTag(fullAccessApiKey, "Tag to Update");

    const updateData = { name: "Existing Tag" };
    const request = put(`/tags/${tagToUpdate.id}`, updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ tagId: tagToUpdate.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(409);
    expect(responseData.error).toContain("already exists");
  });

  test("should reject update with invalid color format", async () => {
    const createdTag = await createTestTag(fullAccessApiKey, "Color Validation");
    const updateData = { color: "invalid" };
    const request = put(`/tags/${createdTag.id}`, updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ tagId: createdTag.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBe("Validation failed");
  });

  test("should reject update without update:tags scope", async () => {
    const createdTag = await createTestTag(fullAccessApiKey, "Scope Update Test");
    const readOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:tags"],
    });

    const updateData = { name: "Should Fail" };
    const request = put(`/tags/${createdTag.id}`, updateData, readOnlyApiKey.key);
    const params = Promise.resolve({ tagId: createdTag.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toContain("scope");
  });

  test("should return 404 when updating non-existent tag", async () => {
    const updateData = { name: "Does Not Exist" };
    const request = put("/tags/non_existent_id", updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ tagId: "non_existent_id" });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
  });
});

describe("DELETE /api/v1/tags/[tagId]", () => {
  test("should delete a tag", async () => {
    const createdTag = await createTestTag(fullAccessApiKey, "Tag to Delete");
    const request = del(`/tags/${createdTag.id}`, fullAccessApiKey.key);
    const params = Promise.resolve({ tagId: createdTag.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.type).toBe("tag");
    expect(responseData.id).toBe(createdTag.id);

    // Verify tag is actually deleted
    const getRequest = get(`/tags/${createdTag.id}`, fullAccessApiKey.key);
    const getParams = Promise.resolve({ tagId: createdTag.id });
    const getResponse = await GET(getRequest, { params: getParams });

    expect(getResponse.status).toBe(404);
  });

  test("should return 404 when deleting non-existent tag", async () => {
    const request = del("/tags/non_existent_id", fullAccessApiKey.key);
    const params = Promise.resolve({ tagId: "non_existent_id" });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
  });

  test("should reject delete without delete:tags scope", async () => {
    const createdTag = await createTestTag(fullAccessApiKey, "Scope Delete Test");
    const readOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:tags"],
    });

    const request = del(`/tags/${createdTag.id}`, readOnlyApiKey.key);
    const params = Promise.resolve({ tagId: createdTag.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toContain("scope");
  });

  test("should not delete tag from different workspace", async () => {
    const createdTag = await createTestTag(fullAccessApiKey, "Workspace Delete Test");

    // Create different workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const request = del(`/tags/${createdTag.id}`, otherApiKey.key);
    const params = Promise.resolve({ tagId: createdTag.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toContain("not found");

    // Verify original tag still exists
    const getRequest = get(`/tags/${createdTag.id}`, fullAccessApiKey.key);
    const getParams = Promise.resolve({ tagId: createdTag.id });
    const getResponse = await GET(getRequest, { params: getParams });

    expect(getResponse.status).toBe(200);

    await cleanupWorkspace(otherWorkspace.id);
  });
});
