/**
 * Integration tests for Individual Broadcast Operations (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/broadcasts/[broadcastId] - Get specific broadcast
 * - PUT /api/v1/broadcasts/[broadcastId] - Update specific broadcast
 * - DELETE /api/v1/broadcasts/[broadcastId] - Delete specific broadcast
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  DELETE,
  GET,
  PUT,
} from "@/app/(main)/api/v1/broadcasts/[broadcastId]/route";
import { POST as CreateBroadcast } from "@/app/(main)/api/v1/broadcasts/route";
import { POST as CreateDomain } from "@/app/(main)/api/v1/domains/route";
import { POST as CreateSegment } from "@/app/(main)/api/v1/segments/route";
import { POST as CreateTopic } from "@/app/(main)/api/v1/topics/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestWorkspace,
  del,
  get,
  post,
  put,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

/**
 * Helper to create a test broadcast
 */
async function createTestBroadcast(
  apiKey: CreatedApiKey,
  data: {
    name: string;
    from?: string;
    emailContent?: {
      subject?: string;
      text?: string;
      html?: string;
      previewText?: string;
    };
  },
) {
  const request = post("/broadcasts", data, apiKey.key);
  const response = await CreateBroadcast(request);
  return await response.json();
}

/**
 * Helper to create a test sending domain
 */
async function createTestDomain(apiKey: CreatedApiKey, name: string) {
  const request = post("/domains", { name }, apiKey.key);
  const response = await CreateDomain(request);
  return await response.json();
}

/**
 * Helper to create a test topic
 */
async function createTestTopic(apiKey: CreatedApiKey, name: string) {
  const request = post("/topics", { name }, apiKey.key);
  const response = await CreateTopic(request);
  return await response.json();
}

/**
 * Helper to create a test segment
 */
async function createTestSegment(apiKey: CreatedApiKey, name: string) {
  const request = post(
    "/segments",
    {
      name,
      conditions: { field: "status", operator: "eq", value: "SUBSCRIBED" },
    },
    apiKey.key,
  );
  const response = await CreateSegment(request);
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

describe("GET /api/v1/broadcasts/[broadcastId]", () => {
  test("should retrieve a broadcast by ID", async () => {
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Get Test Broadcast",
    });
    const request = get(
      `/broadcasts/${createdBroadcast.id}`,
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("broadcast");
    expect(responseData.id).toBe(createdBroadcast.id);
    expect(responseData.name).toBe("Get Test Broadcast");
    expect(responseData.status).toBe("DRAFT");
  });

  test("should return 404 for non-existent broadcast", async () => {
    const request = get("/broadcasts/non_existent_id", fullAccessApiKey.key);
    const params = Promise.resolve({ broadcastId: "non_existent_id" });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_FOUND);
  });

  test("should not retrieve broadcast from different workspace", async () => {
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Cross Workspace Broadcast",
    });

    // Create different workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const request = get(`/broadcasts/${createdBroadcast.id}`, otherApiKey.key);
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_FOUND);

    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should reject request without read:broadcasts scope", async () => {
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Scope Test Broadcast",
    });
    const writeOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:broadcasts"],
    });

    const request = get(
      `/broadcasts/${createdBroadcast.id}`,
      writeOnlyApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });
});

describe("PUT /api/v1/broadcasts/[broadcastId]", () => {
  test("should update broadcast name", async () => {
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Original Name",
    });
    const updateData = { name: "Updated Name" };
    const request = put(
      `/broadcasts/${createdBroadcast.id}`,
      updateData,
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("broadcast");
    expect(responseData.name).toBe("Updated Name");
  });

  test("should update broadcast emailContent", async () => {
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Subject Update Broadcast",
    });
    const updateData = {
      emailContent: {
        subject: "New Subject Line",
        text: "Updated text content",
        html: "<p>Updated HTML</p>",
        previewText: "Updated preview",
      },
    };
    const request = put(
      `/broadcasts/${createdBroadcast.id}`,
      updateData,
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.emailContent.subject).toBe("New Subject Line");
    expect(responseData.emailContent.text).toBe("Updated text content");
    expect(responseData.emailContent.html).toBe("<p>Updated HTML</p>");
    expect(responseData.emailContent.previewText).toBe("Updated preview");
  });

  test("should update broadcast from email", async () => {
    await createTestDomain(fullAccessApiKey, "update-from.example.com");

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "From Update Broadcast",
    });
    const updateData = { from: "updated@update-from.example.com" };
    const request = put(
      `/broadcasts/${createdBroadcast.id}`,
      updateData,
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.from).toBe("updated@update-from.example.com");
  });

  test("should update broadcast topicId", async () => {
    const topic = await createTestTopic(fullAccessApiKey, "Update Topic");
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Topic Update Broadcast",
    });

    const updateData = { topicId: topic.id };
    const request = put(
      `/broadcasts/${createdBroadcast.id}`,
      updateData,
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.topicId).toBe(topic.id);
  });

  test("should update broadcast segmentId", async () => {
    const segment = await createTestSegment(fullAccessApiKey, "Update Segment");
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Segment Update Broadcast",
    });

    const updateData = { segmentId: segment.id };
    const request = put(
      `/broadcasts/${createdBroadcast.id}`,
      updateData,
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.segmentId).toBe(segment.id);
  });

  test("should clear topicId when set to null", async () => {
    const topic = await createTestTopic(fullAccessApiKey, "Clear Topic");
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Clear Topic Broadcast",
    });

    // First set topic
    await PUT(
      put(
        `/broadcasts/${createdBroadcast.id}`,
        { topicId: topic.id },
        fullAccessApiKey.key,
      ),
      { params: Promise.resolve({ broadcastId: createdBroadcast.id }) },
    );

    // Then clear it
    const updateData = { topicId: null };
    const request = put(
      `/broadcasts/${createdBroadcast.id}`,
      updateData,
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.topicId).toBeNull();
  });

  test("should not update non-draft broadcast", async () => {
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Non-Draft Broadcast",
    });

    // Manually set status to QUEUED_FOR_SENDING
    await prisma.broadcast.update({
      where: { id: createdBroadcast.id },
      data: { status: "QUEUED_FOR_SENDING" },
    });

    const updateData = { name: "Try to Update" };
    const request = put(
      `/broadcasts/${createdBroadcast.id}`,
      updateData,
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_EDITABLE);
  });

  test("should reject update with invalid from domain", async () => {
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Invalid From Broadcast",
    });

    const updateData = { from: "test@nonexistent-domain.com" };
    const request = put(
      `/broadcasts/${createdBroadcast.id}`,
      updateData,
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(
      ErrorCode.BROADCAST_INVALID_FROM_DOMAIN,
    );
  });

  test("should return 404 when updating non-existent broadcast", async () => {
    const updateData = { name: "Update Non-Existent" };
    const request = put(
      "/broadcasts/non_existent_id",
      updateData,
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: "non_existent_id" });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_FOUND);
  });

  test("should reject update without write:broadcasts scope", async () => {
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Scope Update Broadcast",
    });
    const readOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:broadcasts"],
    });

    const updateData = { name: "Updated Name" };
    const request = put(
      `/broadcasts/${createdBroadcast.id}`,
      updateData,
      readOnlyApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await PUT(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });
});

describe("DELETE /api/v1/broadcasts/[broadcastId]", () => {
  test("should delete a draft broadcast", async () => {
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Delete Test Broadcast",
    });
    const request = del(
      `/broadcasts/${createdBroadcast.id}`,
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("broadcast");
    expect(responseData.id).toBe(createdBroadcast.id);

    // Verify broadcast is actually deleted
    const getRequest = get(
      `/broadcasts/${createdBroadcast.id}`,
      fullAccessApiKey.key,
    );
    const getParams = Promise.resolve({ broadcastId: createdBroadcast.id });
    const getResponse = await GET(getRequest, { params: getParams });

    expect(getResponse.status).toBe(404);
  });

  test("should not delete non-draft broadcast", async () => {
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Non-Draft Delete Broadcast",
    });

    // Manually set status to SENT
    await prisma.broadcast.update({
      where: { id: createdBroadcast.id },
      data: { status: "SENT" },
    });

    const request = del(
      `/broadcasts/${createdBroadcast.id}`,
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_EDITABLE);
  });

  test("should return 404 when deleting non-existent broadcast", async () => {
    const request = del("/broadcasts/non_existent_id", fullAccessApiKey.key);
    const params = Promise.resolve({ broadcastId: "non_existent_id" });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_FOUND);
  });

  test("should reject delete without write:broadcasts scope", async () => {
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Scope Delete Broadcast",
    });
    const readOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:broadcasts"],
    });

    const request = del(
      `/broadcasts/${createdBroadcast.id}`,
      readOnlyApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });

  test("should not delete broadcast from different workspace", async () => {
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Cross Workspace Delete Broadcast",
    });

    // Create different workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const request = del(`/broadcasts/${createdBroadcast.id}`, otherApiKey.key);
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await DELETE(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_FOUND);

    // Verify original broadcast still exists
    const getRequest = get(
      `/broadcasts/${createdBroadcast.id}`,
      fullAccessApiKey.key,
    );
    const getParams = Promise.resolve({ broadcastId: createdBroadcast.id });
    const getResponse = await GET(getRequest, { params: getParams });

    expect(getResponse.status).toBe(200);

    await cleanupWorkspace(otherWorkspace.id);
  });
});
