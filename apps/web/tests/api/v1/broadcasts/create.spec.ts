/**
 * Integration tests for Broadcast Creation (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/broadcasts - Create new broadcast
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST as CreateBroadcast } from "@/app/(main)/api/v1/broadcasts/route";
import { POST as CreateDomain } from "@/app/(main)/api/v1/domains/route";
import { POST as CreateSegment } from "@/app/(main)/api/v1/segments/route";
import { POST as CreateTopic } from "@/app/(main)/api/v1/topics/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestWorkspace,
  post,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

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

describe("POST /api/v1/broadcasts", () => {
  test("should create a broadcast with only name", async () => {
    const broadcastData = { name: "My First Broadcast" };
    const request = post("/broadcasts", broadcastData, fullAccessApiKey.key);

    const response = await CreateBroadcast(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("broadcast");
    expect(responseData.id).toBeDefined();
    expect(responseData.name).toBe("My First Broadcast");
    expect(responseData.status).toBe("DRAFT");
    expect(responseData.from).toBeNull();
    expect(responseData.emailContent).toBeNull();
  });

  test("should create a broadcast with from email", async () => {
    // First create a sending domain
    await createTestDomain(fullAccessApiKey, "test-broadcast.example.com");

    const broadcastData = {
      name: "Broadcast with From",
      from: "hello@test-broadcast.example.com",
    };
    const request = post("/broadcasts", broadcastData, fullAccessApiKey.key);

    const response = await CreateBroadcast(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("broadcast");
    expect(responseData.from).toBe("hello@test-broadcast.example.com");
  });

  test("should create a broadcast with emailContent", async () => {
    const broadcastData = {
      name: "Broadcast with Subject",
      emailContent: {
        subject: "Welcome to our newsletter!",
        text: "Plain text content",
        html: "<p>HTML content</p>",
        previewText: "Preview text here",
      },
    };
    const request = post("/broadcasts", broadcastData, fullAccessApiKey.key);

    const response = await CreateBroadcast(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.emailContent).toBeDefined();
    expect(responseData.emailContent.subject).toBe(
      "Welcome to our newsletter!",
    );
    expect(responseData.emailContent.text).toBe("Plain text content");
    expect(responseData.emailContent.html).toBe("<p>HTML content</p>");
    expect(responseData.emailContent.previewText).toBe("Preview text here");
  });

  test("should create a broadcast with from, emailContent, and replyTo", async () => {
    await createTestDomain(fullAccessApiKey, "full-broadcast.example.com");

    const broadcastData = {
      name: "Full Broadcast",
      from: "news@full-broadcast.example.com",
      emailContent: { subject: "Important Update" },
      replyTo: "support@example.com",
    };
    const request = post("/broadcasts", broadcastData, fullAccessApiKey.key);

    const response = await CreateBroadcast(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.from).toBe("news@full-broadcast.example.com");
    expect(responseData.emailContent.subject).toBe("Important Update");
    expect(responseData.replyTo).toBe("support@example.com");
  });

  test("should create a broadcast with topicId", async () => {
    const topic = await createTestTopic(fullAccessApiKey, "Newsletter Topic");

    const broadcastData = {
      name: "Broadcast with Topic",
      topicId: topic.id,
    };
    const request = post("/broadcasts", broadcastData, fullAccessApiKey.key);

    const response = await CreateBroadcast(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.topicId).toBe(topic.id);
  });

  test("should create a broadcast with segmentId", async () => {
    const segment = await createTestSegment(
      fullAccessApiKey,
      "Active Subscribers",
    );

    const broadcastData = {
      name: "Broadcast with Segment",
      segmentId: segment.id,
    };
    const request = post("/broadcasts", broadcastData, fullAccessApiKey.key);

    const response = await CreateBroadcast(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.segmentId).toBe(segment.id);
  });

  test("should reject broadcast with invalid from domain", async () => {
    const broadcastData = {
      name: "Invalid Domain Broadcast",
      from: "hello@nonexistent-domain.com",
    };
    const request = post("/broadcasts", broadcastData, fullAccessApiKey.key);

    const response = await CreateBroadcast(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBe(
      ErrorCode.BROADCAST_INVALID_FROM_DOMAIN,
    );
  });

  test("should reject broadcast with invalid from email format", async () => {
    const broadcastData = {
      name: "Invalid Email Broadcast",
      from: "not-an-email",
    };
    const request = post("/broadcasts", broadcastData, fullAccessApiKey.key);

    const response = await CreateBroadcast(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
  });

  test("should reject broadcast with non-existent topicId", async () => {
    const broadcastData = {
      name: "Invalid Topic Broadcast",
      topicId: "non-existent-topic-id",
    };
    const request = post("/broadcasts", broadcastData, fullAccessApiKey.key);

    const response = await CreateBroadcast(request);
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.TOPIC_NOT_FOUND);
  });

  test("should reject broadcast with non-existent segmentId", async () => {
    const broadcastData = {
      name: "Invalid Segment Broadcast",
      segmentId: "non-existent-segment-id",
    };
    const request = post("/broadcasts", broadcastData, fullAccessApiKey.key);

    const response = await CreateBroadcast(request);
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.SEGMENT_NOT_FOUND);
  });

  test("should reject broadcast without name", async () => {
    const broadcastData = { emailContent: { subject: "Subject without name" } };
    const request = post("/broadcasts", broadcastData, fullAccessApiKey.key);

    const response = await CreateBroadcast(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
  });

  test("should reject request without write:broadcasts scope", async () => {
    const readOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:broadcasts"],
    });

    const broadcastData = { name: "Unauthorized Broadcast" };
    const request = post("/broadcasts", broadcastData, readOnlyApiKey.key);

    const response = await CreateBroadcast(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });

  test("should auto-create sender identity when from is provided", async () => {
    await createTestDomain(fullAccessApiKey, "auto-sender.example.com");

    const broadcastData = {
      name: "Auto Sender Broadcast",
      from: "automated@auto-sender.example.com",
    };
    const request = post("/broadcasts", broadcastData, fullAccessApiKey.key);

    const response = await CreateBroadcast(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.from).toBe("automated@auto-sender.example.com");
  });
});
