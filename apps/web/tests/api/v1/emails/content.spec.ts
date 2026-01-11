/**
 * Integration tests for Get Transactional Email Content Endpoint (External API)
 *
 * Tests actual Next.js route handlers for:
 * - GET /api/v1/emails/[emailId]/content - Get email HTML/text content
 *
 * Note: These tests focus on error handling and authorization.
 * Full content retrieval tests require S3 integration.
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { GET } from "@/app/(main)/api/v1/emails/[emailId]/content/route";
import { ErrorCode } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  cleanupWorkspace,
  createFullAccessApiKey,
  createReadOnlyApiKey,
  createApiKeyWithoutSmtpSend,
  createTestWorkspace,
  get,
  type CreatedApiKey,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let otherWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;
let readOnlyApiKey: CreatedApiKey;
let noSmtpApiKey: CreatedApiKey;
let otherWorkspaceApiKey: CreatedApiKey;

// Test data
let emailWithContent: {
  id: string;
  sendingId: string;
};

let emailWithoutContent: {
  id: string;
  sendingId: string;
};

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  otherWorkspace = createTestWorkspace();

  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
  readOnlyApiKey = await createReadOnlyApiKey(testWorkspace.id);
  noSmtpApiKey = await createApiKeyWithoutSmtpSend(testWorkspace.id);
  otherWorkspaceApiKey = await createFullAccessApiKey(otherWorkspace.id);

  // Create email with content S3 key (content won't be retrievable without actual S3)
  const withContent = await prisma.transactionalEmail.create({
    data: {
      workspaceId: testWorkspace.id,
      sendingId: `sending-content-${testWorkspace.id}`,
      fromEmail: "sender@test-domain.com",
      toEmail: "recipient@example.com",
      subject: "Email with Content",
      htmlContentS3Key: "emails/test-content/html",
      textContentS3Key: "emails/test-content/text",
      status: "DELIVERED",
    },
  });

  emailWithContent = {
    id: withContent.id,
    sendingId: withContent.sendingId,
  };

  // Create email without content S3 key
  const withoutContent = await prisma.transactionalEmail.create({
    data: {
      workspaceId: testWorkspace.id,
      sendingId: `sending-no-content-${testWorkspace.id}`,
      fromEmail: "sender@test-domain.com",
      toEmail: "recipient@example.com",
      subject: "Email without Content",
      htmlContentS3Key: null,
      textContentS3Key: null,
      status: "DELIVERED",
    },
  });

  emailWithoutContent = {
    id: withoutContent.id,
    sendingId: withoutContent.sendingId,
  };
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
  await cleanupWorkspace(otherWorkspace.id);
});

// Helper to create request with params
function createGetRequest(emailId: string, apiKey?: string) {
  const request = get(`/emails/${emailId}/content`, apiKey);
  return { request, params: Promise.resolve({ emailId }) };
}

describe("GET /api/v1/emails/[emailId]/content", () => {
  test("should return 404 when email has no content S3 key", async () => {
    const { request, params } = createGetRequest(emailWithoutContent.id, fullAccessApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    expect(responseData.error.message).toContain("content not available");
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
    const { request, params } = createGetRequest(emailWithContent.id, otherWorkspaceApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });

  test("should reject request without smtp:send scope", async () => {
    const { request, params } = createGetRequest(emailWithContent.id, noSmtpApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });

  test("should reject read-only API key (requires smtp:send)", async () => {
    const { request, params } = createGetRequest(emailWithContent.id, readOnlyApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });

  test("should reject request without authentication", async () => {
    const { request, params } = createGetRequest(emailWithContent.id);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.MISSING_AUTHORIZATION_HEADER);
  });

  test("should reject request with invalid API key", async () => {
    const { request, params } = createGetRequest(emailWithContent.id, "invalid-api-key");

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.INVALID_API_KEY);
  });

  // Note: Testing actual S3 content retrieval requires S3 integration
  // The endpoint will return 404 if S3 file doesn't exist even with a valid S3 key
  test("should return 404 when S3 content is not available", async () => {
    const { request, params } = createGetRequest(emailWithContent.id, fullAccessApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    // Since we don't have actual S3 content, it should fail gracefully
    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });
});
