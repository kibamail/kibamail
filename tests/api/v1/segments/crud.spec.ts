/**
 * Integration tests for Individual Segment Operations (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/segments/[segmentId] - Get specific segment
 * - PUT /api/v1/segments/[segmentId] - Update specific segment
 * - DELETE /api/v1/segments/[segmentId] - Delete specific segment
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { GET, PUT, DELETE } from "@/app/api/v1/segments/[segmentId]/route";
import { POST } from "@/app/api/v1/segments/route";
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
import { ErrorType, ErrorCode } from "@/lib/api/error-codes";

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

describe("GET /api/v1/segments/[segmentId]", () => {
  test("should retrieve a segment by ID", async () => {
    const createdSegment = await createTestSegment(fullAccessApiKey, "Retrieve Test");
    const request = get(`/segments/${createdSegment.id}`, fullAccessApiKey.key);
    const params = Promise.resolve({ segmentId: createdSegment.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("segment");
    expect(responseData.id).toBe(createdSegment.id);
    expect(responseData.name).toBe("Retrieve Test");
    expect(responseData.conditions).toBeDefined();
    expect(responseData.description).toBeDefined();
  });

  test("should return 404 for non-existent segment", async () => {
    const request = get("/segments/non_existent_id", fullAccessApiKey.key);
    const params = Promise.resolve({ segmentId: "non_existent_id" });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toContain("not found");
    expect(responseData.error.requestId).toBeDefined();
    expect(responseData.error.requestId).toMatch(/^req_/);
  });

  test("should not retrieve segment from different workspace", async () => {
    const createdSegment = await createTestSegment(fullAccessApiKey, "Workspace Test");

    // Create different workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const request = get(`/segments/${createdSegment.id}`, otherApiKey.key);
    const params = Promise.resolve({ segmentId: createdSegment.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toContain("not found");
    expect(responseData.error.requestId).toBeDefined();
    expect(responseData.error.requestId).toMatch(/^req_/);

    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should reject request without read:segments scope", async () => {
    const createdSegment = await createTestSegment(fullAccessApiKey, "Scope Test");
    const writeOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:segments"],
    });

    const request = get(`/segments/${createdSegment.id}`, writeOnlyApiKey.key);
    const params = Promise.resolve({ segmentId: createdSegment.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });
});

describe("PUT /api/v1/segments/[segmentId]", () => {
  test("should update segment name", async () => {
    const createdSegment = await createTestSegment(fullAccessApiKey, "Original Name");
    const updateData = { name: "Updated Name" };
    const request = put(`/segments/${createdSegment.id}`, updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ segmentId: createdSegment.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("segment");
    expect(responseData.id).toBe(createdSegment.id);
  });

  test("should update segment conditions", async () => {
    const createdSegment = await createTestSegment(fullAccessApiKey, "Conditions Test");
    const updateData = {
      conditions: {
        $and: [
          {
            field: "status",
            operator: "eq",
            value: "SUBSCRIBED",
          },
          {
            field: "country",
            operator: "eq",
            value: "US",
          },
        ],
      },
    };
    const request = put(`/segments/${createdSegment.id}`, updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ segmentId: createdSegment.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.id).toBeDefined();
  });

  test("should update segment description", async () => {
    const createdSegment = await createTestSegment(fullAccessApiKey, "Description Test");
    const updateData = { description: "New description" };
    const request = put(`/segments/${createdSegment.id}`, updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ segmentId: createdSegment.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.id).toBeDefined();
  });

  test("should update multiple fields at once", async () => {
    const createdSegment = await createTestSegment(fullAccessApiKey, "Multi Test");
    const updateData = {
      name: "Updated Multi",
      description: "New description",
      conditions: {
        field: "status",
        operator: "ne",
        value: "UNSUBSCRIBED",
      },
    };
    const request = put(`/segments/${createdSegment.id}`, updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ segmentId: createdSegment.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.id).toBeDefined();
  });

  test("should reject update with invalid conditions", async () => {
    const createdSegment = await createTestSegment(fullAccessApiKey, "Validation Test");
    const updateData = {
      conditions: {
        field: "status",
        operator: "invalid_operator",
        value: "SUBSCRIBED",
      },
    };
    const request = put(`/segments/${createdSegment.id}`, updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ segmentId: createdSegment.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toContain("Validation failed");
    expect(responseData.error.requestId).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.validationErrors.length).toBeGreaterThan(0);
  });

  test("should reject update without update:segments scope", async () => {
    const createdSegment = await createTestSegment(fullAccessApiKey, "Scope Update Test");
    const readOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:segments"],
    });

    const updateData = { name: "Should Fail" };
    const request = put(`/segments/${createdSegment.id}`, updateData, readOnlyApiKey.key);
    const params = Promise.resolve({ segmentId: createdSegment.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should return 404 when updating non-existent segment", async () => {
    const updateData = { name: "Does Not Exist" };
    const request = put("/segments/non_existent_id", updateData, fullAccessApiKey.key);
    const params = Promise.resolve({ segmentId: "non_existent_id" });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
    expect(responseData.error.requestId).toMatch(/^req_/);
  });
});

describe("DELETE /api/v1/segments/[segmentId]", () => {
  test("should delete a segment", async () => {
    const createdSegment = await createTestSegment(fullAccessApiKey, "Segment to Delete");
    const request = del(`/segments/${createdSegment.id}`, fullAccessApiKey.key);
    const params = Promise.resolve({ segmentId: createdSegment.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("segment");
    expect(responseData.id).toBe(createdSegment.id);

    // Verify segment is actually deleted
    const getRequest = get(`/segments/${createdSegment.id}`, fullAccessApiKey.key);
    const getParams = Promise.resolve({ segmentId: createdSegment.id });
    const getResponse = await GET(getRequest, { params: getParams });

    expect(getResponse.status).toBe(404);
  });

  test("should return 404 when deleting non-existent segment", async () => {
    const request = del("/segments/non_existent_id", fullAccessApiKey.key);
    const params = Promise.resolve({ segmentId: "non_existent_id" });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
    expect(responseData.error.requestId).toMatch(/^req_/);
  });

  test("should reject delete without delete:segments scope", async () => {
    const createdSegment = await createTestSegment(fullAccessApiKey, "Scope Delete Test");
    const readOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:segments"],
    });

    const request = del(`/segments/${createdSegment.id}`, readOnlyApiKey.key);
    const params = Promise.resolve({ segmentId: createdSegment.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should not delete segment from different workspace", async () => {
    const createdSegment = await createTestSegment(fullAccessApiKey, "Workspace Delete Test");

    // Create different workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const request = del(`/segments/${createdSegment.id}`, otherApiKey.key);
    const params = Promise.resolve({ segmentId: createdSegment.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toContain("not found");
    expect(responseData.error.requestId).toBeDefined();
    expect(responseData.error.requestId).toMatch(/^req_/);

    // Verify original segment still exists
    const getRequest = get(`/segments/${createdSegment.id}`, fullAccessApiKey.key);
    const getParams = Promise.resolve({ segmentId: createdSegment.id });
    const getResponse = await GET(getRequest, { params: getParams });

    expect(getResponse.status).toBe(200);

    await cleanupWorkspace(otherWorkspace.id);
  });
});
