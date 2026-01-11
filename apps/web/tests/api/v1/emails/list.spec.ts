/**
 * Integration tests for List Transactional Emails Endpoint (External API)
 *
 * Tests actual Next.js route handlers for:
 * - GET /api/v1/emails - List transactional emails with filters and pagination
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { GET } from "@/app/(main)/api/v1/emails/route";
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
let fullAccessApiKey: CreatedApiKey;
let readOnlyApiKey: CreatedApiKey;

// Test data
const testEmails: Array<{
  id: string;
  sendingId: string;
  status: "QUEUED" | "SENDING" | "DELIVERED" | "BOUNCED" | "COMPLAINED" | "FAILED";
  subject: string;
  toEmail: string;
}> = [];

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
  readOnlyApiKey = await createReadOnlyApiKey(testWorkspace.id);

  // Create test transactional emails with different statuses
  const emailsToCreate = [
    { status: "DELIVERED" as const, subject: "Delivered Email 1", toEmail: "user1@example.com" },
    { status: "DELIVERED" as const, subject: "Delivered Email 2", toEmail: "user2@example.com" },
    { status: "BOUNCED" as const, subject: "Bounced Email", toEmail: "bounced@example.com" },
    { status: "COMPLAINED" as const, subject: "Complained Email", toEmail: "complained@example.com" },
    { status: "SENDING" as const, subject: "Sending Email", toEmail: "sending@example.com" },
    { status: "QUEUED" as const, subject: "Queued Email", toEmail: "queued@example.com" },
    { status: "FAILED" as const, subject: "Failed Email", toEmail: "failed@example.com" },
  ];

  for (let i = 0; i < emailsToCreate.length; i++) {
    const email = emailsToCreate[i];
    const created = await prisma.transactionalEmail.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingId: `sending-${testWorkspace.id}-${i}`,
        fromEmail: "sender@example.com",
        fromName: "Test Sender",
        toEmail: email.toEmail,
        subject: email.subject,
        status: email.status,
        openTrackingEnabled: true,
        clickTrackingEnabled: true,
        sentAt: new Date(),
      },
    });
    testEmails.push({
      id: created.id,
      sendingId: created.sendingId,
      status: email.status,
      subject: email.subject,
      toEmail: email.toEmail,
    });
  }
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("GET /api/v1/emails", () => {
  test("should list all transactional emails", async () => {
    const request = get("/emails", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("transactional_email_list");
    expect(Array.isArray(responseData.data)).toBe(true);
    expect(responseData.data.length).toBe(testEmails.length);
    expect(responseData.hasMore).toBe(false);
  });

  test("should return emails in descending order by createdAt", async () => {
    const request = get("/emails", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);

    // Verify descending order (most recent first)
    for (let i = 1; i < responseData.data.length; i++) {
      const prev = new Date(responseData.data[i - 1].createdAt);
      const curr = new Date(responseData.data[i].createdAt);
      expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
    }
  });

  test("should filter by status", async () => {
    const request = get("/emails?status=DELIVERED", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(2); // 2 delivered emails
    responseData.data.forEach((email: { status: string }) => {
      expect(email.status).toBe("delivered");
    });
  });

  test("should filter by bounced status", async () => {
    const request = get("/emails?status=BOUNCED", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(1);
    expect(responseData.data[0].status).toBe("bounced");
  });

  test("should filter by recipient (to)", async () => {
    const request = get("/emails?to=user1@example.com", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(1);
    expect(responseData.data[0].to).toBe("user1@example.com");
  });

  test("should filter by subject (partial match)", async () => {
    const request = get("/emails?subject=Bounced", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(1);
    expect(responseData.data[0].subject).toContain("Bounced");
  });

  test("should support pagination with limit", async () => {
    const request = get("/emails?limit=3", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(3);
    expect(responseData.hasMore).toBe(true);
  });

  test("should support cursor-based pagination with after", async () => {
    // First page
    const firstPageRequest = get("/emails?limit=3", fullAccessApiKey.key);
    const firstPageResponse = await GET(firstPageRequest);
    const firstPageData = await firstPageResponse.json();

    expect(firstPageData.data.length).toBe(3);
    expect(firstPageData.hasMore).toBe(true);

    // Get last ID from first page
    const lastId = firstPageData.data[firstPageData.data.length - 1].id;

    // Second page
    const secondPageRequest = get(`/emails?limit=3&after=${lastId}`, fullAccessApiKey.key);
    const secondPageResponse = await GET(secondPageRequest);
    const secondPageData = await secondPageResponse.json();

    expect(secondPageData.data.length).toBeGreaterThan(0);
    expect(secondPageData.data.length).toBeLessThanOrEqual(3);

    // Ensure no overlap between pages
    const firstPageIds = firstPageData.data.map((e: { id: string }) => e.id);
    const secondPageIds = secondPageData.data.map((e: { id: string }) => e.id);
    secondPageIds.forEach((id: string) => {
      expect(firstPageIds).not.toContain(id);
    });
  });

  test("should return email details with correct structure", async () => {
    const request = get("/emails", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);

    const email = responseData.data[0];
    expect(email).toHaveProperty("id");
    expect(email).toHaveProperty("sendingId");
    expect(email).toHaveProperty("from");
    expect(email.from).toHaveProperty("email");
    expect(email).toHaveProperty("to");
    expect(email).toHaveProperty("subject");
    expect(email).toHaveProperty("status");
    expect(email).toHaveProperty("openCount");
    expect(email).toHaveProperty("clickCount");
    expect(email).toHaveProperty("createdAt");
    expect(email).toHaveProperty("sentAt");
  });

  test("should return empty array when no emails match filter", async () => {
    const request = get("/emails?to=nonexistent@example.com", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data).toEqual([]);
    expect(responseData.hasMore).toBe(false);
  });

  test("should reject read-only API key (requires smtp:send scope)", async () => {
    const request = get("/emails", readOnlyApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    // Read-only keys don't have smtp:send scope
    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });

  test("should reject request without authentication", async () => {
    const request = get("/emails");

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.MISSING_AUTHORIZATION_HEADER);
  });

  test("should reject request with invalid API key", async () => {
    const request = get("/emails", "invalid-api-key");

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.INVALID_API_KEY);
  });
});
