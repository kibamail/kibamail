/**
 * Integration tests for Get Transactional Email Endpoint (External API)
 *
 * Tests actual Next.js route handlers for:
 * - GET /api/v1/emails/[emailId] - Get transactional email details
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { GET } from "@/app/(main)/api/v1/emails/[emailId]/route";
import { ErrorCode } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  cleanupWorkspace,
  createFullAccessApiKey,
  createReadOnlyApiKey,
  createTestWorkspace,
  get,
  type CreatedApiKey,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let otherWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;
let readOnlyApiKey: CreatedApiKey;
let otherWorkspaceApiKey: CreatedApiKey;

// Test data
let testEmail: {
  id: string;
  sendingId: string;
};

let deliveredEmail: {
  id: string;
  sendingId: string;
};

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  otherWorkspace = createTestWorkspace();

  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
  readOnlyApiKey = await createReadOnlyApiKey(testWorkspace.id);
  otherWorkspaceApiKey = await createFullAccessApiKey(otherWorkspace.id);

  // Create a test transactional email with all fields
  const created = await prisma.transactionalEmail.create({
    data: {
      workspaceId: testWorkspace.id,
      sendingId: `sending-detail-${testWorkspace.id}`,
      fromEmail: "sender@test-domain.com",
      fromName: "Test Sender",
      replyToEmail: "reply@test-domain.com",
      replyToName: "Reply Handler",
      toEmail: "recipient@example.com",
      subject: "Test Email Subject",
      previewText: "This is the preview text",
      htmlContentS3Key: "test/email-content/html",
      textContentS3Key: "test/email-content/text",
      status: "QUEUED",
      openTrackingEnabled: true,
      clickTrackingEnabled: true,
      metadata: { orderId: "12345", campaign: "welcome" },
      tags: ["transactional", "welcome"],
      sentAt: new Date(),
    },
  });

  testEmail = {
    id: created.id,
    sendingId: created.sendingId,
  };

  // Create a delivered email with timestamps
  const delivered = await prisma.transactionalEmail.create({
    data: {
      workspaceId: testWorkspace.id,
      sendingId: `sending-delivered-${testWorkspace.id}`,
      fromEmail: "sender@test-domain.com",
      fromName: "Test Sender",
      toEmail: "delivered@example.com",
      subject: "Delivered Email",
      status: "DELIVERED",
      openTrackingEnabled: true,
      clickTrackingEnabled: true,
      sentAt: new Date(Date.now() - 3600000), // 1 hour ago
      deliveredAt: new Date(Date.now() - 3500000), // 50 min ago
      firstOpenedAt: new Date(Date.now() - 1800000), // 30 min ago
      firstClickedAt: new Date(Date.now() - 900000), // 15 min ago
      openCount: 3,
      clickCount: 2,
      totalEvents: 6,
      lastResponseCode: 250,
      lastResponseMessage: "OK",
    },
  });

  deliveredEmail = {
    id: delivered.id,
    sendingId: delivered.sendingId,
  };
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
  await cleanupWorkspace(otherWorkspace.id);
});

// Helper to create request with params
function createGetRequest(emailId: string, apiKey?: string) {
  const request = get(`/emails/${emailId}`, apiKey);
  return { request, params: Promise.resolve({ emailId }) };
}

describe("GET /api/v1/emails/[emailId]", () => {
  test("should return email details with all fields", async () => {
    const { request, params } = createGetRequest(testEmail.id, fullAccessApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("transactional_email");
    expect(responseData.id).toBe(testEmail.id);
    expect(responseData.sendingId).toBe(testEmail.sendingId);

    // Check from
    expect(responseData.from).toBeDefined();
    expect(responseData.from.email).toBe("sender@test-domain.com");
    expect(responseData.from.name).toBe("Test Sender");

    // Check replyTo
    expect(responseData.replyTo).toBeDefined();
    expect(responseData.replyTo.email).toBe("reply@test-domain.com");
    expect(responseData.replyTo.name).toBe("Reply Handler");

    // Check recipient
    expect(responseData.to).toBe("recipient@example.com");

    // Check content
    expect(responseData.subject).toBe("Test Email Subject");
    expect(responseData.previewText).toBe("This is the preview text");

    // Check status
    expect(responseData.status).toBe("queued");

    // Check tracking
    expect(responseData.openTrackingEnabled).toBe(true);
    expect(responseData.clickTrackingEnabled).toBe(true);

    // Check metadata
    expect(responseData.metadata).toBeDefined();
    expect(responseData.metadata.orderId).toBe("12345");
    expect(responseData.metadata.campaign).toBe("welcome");

    // Check tags
    expect(responseData.tags).toContain("transactional");
    expect(responseData.tags).toContain("welcome");

    // Check timestamps
    expect(responseData.createdAt).toBeDefined();
    expect(responseData.sentAt).toBeDefined();
  });

  test("should return email with engagement stats", async () => {
    const { request, params } = createGetRequest(deliveredEmail.id, fullAccessApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.status).toBe("delivered");

    // Check engagement stats
    expect(responseData.openCount).toBe(3);
    expect(responseData.clickCount).toBe(2);
    expect(responseData.totalEvents).toBe(6);

    // Check timestamps
    expect(responseData.deliveredAt).toBeDefined();
    expect(responseData.firstOpenedAt).toBeDefined();
    expect(responseData.firstClickedAt).toBeDefined();

    // Check response info
    expect(responseData.lastResponseCode).toBe(250);
    expect(responseData.lastResponseMessage).toBe("OK");
  });

  test("should return 404 for non-existent email", async () => {
    const { request, params } = createGetRequest("nonexistent-id", fullAccessApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });

  test("should return 404 for email from different workspace", async () => {
    const { request, params } = createGetRequest(testEmail.id, otherWorkspaceApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });

  test("should reject read-only API key (requires smtp:send scope)", async () => {
    const { request, params } = createGetRequest(testEmail.id, readOnlyApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    // Read-only keys don't have smtp:send scope
    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });

  test("should reject request without authentication", async () => {
    const { request, params } = createGetRequest(testEmail.id);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.MISSING_AUTHORIZATION_HEADER);
  });

  test("should reject request with invalid API key", async () => {
    const { request, params } = createGetRequest(testEmail.id, "invalid-api-key");

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.INVALID_API_KEY);
  });
});
