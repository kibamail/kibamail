/**
 * Integration tests for Topic Creation (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/topics - Create new topic
 */

import { POST } from "@/app/api/v1/topics/route";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  cleanupWorkspace,
  post,
  apiRequest,
  type TestWorkspace,
  type CreatedApiKey
} from "@/tests/utils";
import { ErrorType, ErrorCode } from "@/lib/api/error-codes";

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
      name: "Product Updates"
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
      visibility: "PUBLIC" as const,
      defaultOptIn: true
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
      visibility: "PRIVATE" as const
    };
    const request = post("/topics", topicData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("topic");
    expect(responseData.id).toBeDefined();
  });
  test("should reject request with missing Authorization header", async () => {
    const topicData = { name: "Test Topic" };
    const request = apiRequest("/topics").method("POST").body(topicData).build();

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_AUTHORIZATION_HEADER);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject request without write:topics scope", async () => {
    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:topics"]
    });

    const topicData = { name: "Test Topic" };
    const request = post("/topics", topicData, readOnlyKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject topic with empty name", async () => {
    const topicData = {
      name: ""
      };
    const request = post("/topics", topicData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject topic with name exceeding max length", async () => {
    const topicData = {
      name: "A".repeat(101), // Exceeds 100 character limit
      };
    const request = post("/topics", topicData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });});
