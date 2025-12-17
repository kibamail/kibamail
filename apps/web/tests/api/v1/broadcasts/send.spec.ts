/**
 * Integration tests for Send Broadcast Endpoint (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/broadcasts/[broadcastId]/send - Schedule broadcast for sending
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST as SendBroadcast } from "@/app/api/v1/broadcasts/[broadcastId]/send/route";
import { GET as GetBroadcast } from "@/app/api/v1/broadcasts/[broadcastId]/route";
import { POST as CreateBroadcast } from "@/app/api/v1/broadcasts/route";
import { POST as CreateDomain } from "@/app/api/v1/domains/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestWorkspace,
  get,
  post,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

/**
 * Helper to create a test broadcast
 */
async function createTestBroadcast(
  apiKey: CreatedApiKey,
  data: { name: string; from?: string; emailContent?: { subject?: string; text?: string; html?: string; previewText?: string } },
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
 * Helper to get a future date
 */
function getFutureDate(hoursFromNow: number = 1): string {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  return date.toISOString();
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

describe("POST /api/v1/broadcasts/[broadcastId]/send", () => {
  test("should schedule a complete broadcast for sending", async () => {
    // Create domain first
    await createTestDomain(fullAccessApiKey, "send-test.example.com");

    // Create broadcast with all required fields
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Send Test Broadcast",
      from: "news@send-test.example.com",
      emailContent: { subject: "Important Newsletter" },
    });

    const sendAt = getFutureDate(2);
    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      { sendAt },
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("broadcast");
    expect(responseData.status).toBe("QUEUED_FOR_SENDING");
    expect(responseData.sendAt).toBeDefined();
  });

  test("should reject sending broadcast without sender (from)", async () => {
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "No Sender Broadcast",
      emailContent: { subject: "Has subject but no sender" },
    });

    const sendAt = getFutureDate(1);
    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      { sendAt },
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
    expect(responseData.error.message).toContain("sender");
  });

  test("should reject sending broadcast without subject", async () => {
    await createTestDomain(fullAccessApiKey, "no-subject.example.com");

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "No Subject Broadcast",
      from: "news@no-subject.example.com",
    });

    const sendAt = getFutureDate(1);
    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      { sendAt },
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    // When no subject is provided, no email content is created,
    // so the error is about missing email content
    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
    expect(responseData.error.message).toContain("email content");
  });

  test("should reject sending broadcast without email content", async () => {
    await createTestDomain(fullAccessApiKey, "no-content.example.com");

    // Create broadcast with from but no subject (no email content created)
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "No Content Broadcast",
      from: "news@no-content.example.com",
    });

    const sendAt = getFutureDate(1);
    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      { sendAt },
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
  });

  test("should reject sending with past sendAt date", async () => {
    await createTestDomain(fullAccessApiKey, "past-date.example.com");

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Past Date Broadcast",
      from: "news@past-date.example.com",
      emailContent: { subject: "This should fail" },
    });

    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1);

    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      { sendAt: pastDate.toISOString() },
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
  });

  test("should reject sending without sendAt", async () => {
    await createTestDomain(fullAccessApiKey, "no-sendat.example.com");

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "No SendAt Broadcast",
      from: "news@no-sendat.example.com",
      emailContent: { subject: "Missing sendAt" },
    });

    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      {},
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
  });

  test("should reject sending non-draft broadcast", async () => {
    await createTestDomain(fullAccessApiKey, "non-draft-send.example.com");

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Non-Draft Send Broadcast",
      from: "news@non-draft-send.example.com",
      emailContent: { subject: "Already sent" },
    });

    // Manually set status to SENT
    await prisma.broadcast.update({
      where: { id: createdBroadcast.id },
      data: { status: "SENT" },
    });

    const sendAt = getFutureDate(1);
    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      { sendAt },
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_EDITABLE);
  });

  test("should reject sending already queued broadcast", async () => {
    await createTestDomain(fullAccessApiKey, "already-queued.example.com");

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Already Queued Broadcast",
      from: "news@already-queued.example.com",
      emailContent: { subject: "Already queued" },
    });

    // Manually set status to QUEUED_FOR_SENDING
    await prisma.broadcast.update({
      where: { id: createdBroadcast.id },
      data: { status: "QUEUED_FOR_SENDING" },
    });

    const sendAt = getFutureDate(1);
    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      { sendAt },
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_EDITABLE);
  });

  test("should return 404 for non-existent broadcast", async () => {
    const sendAt = getFutureDate(1);
    const request = post(
      "/broadcasts/non_existent_id/send",
      { sendAt },
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: "non_existent_id" });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_FOUND);
  });

  test("should reject send without write:broadcasts scope", async () => {
    await createTestDomain(fullAccessApiKey, "scope-send.example.com");

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Scope Send Broadcast",
      from: "news@scope-send.example.com",
      emailContent: { subject: "Test scope" },
    });

    const readOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:broadcasts"],
    });

    const sendAt = getFutureDate(1);
    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      { sendAt },
      readOnlyApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });

  test("should not send broadcast from different workspace", async () => {
    await createTestDomain(fullAccessApiKey, "cross-workspace-send.example.com");

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Cross Workspace Send Broadcast",
      from: "news@cross-workspace-send.example.com",
      emailContent: { subject: "Cross workspace" },
    });

    // Create different workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const sendAt = getFutureDate(1);
    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      { sendAt },
      otherApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_FOUND);

    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should correctly set sendAt time", async () => {
    await createTestDomain(fullAccessApiKey, "sendat-verify.example.com");

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "SendAt Verify Broadcast",
      from: "news@sendat-verify.example.com",
      emailContent: { subject: "Verify sendAt" },
    });

    const expectedSendAt = getFutureDate(24); // 24 hours from now
    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      { sendAt: expectedSendAt },
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);

    // Verify via GET
    const getRequest = get(`/broadcasts/${createdBroadcast.id}`, fullAccessApiKey.key);
    const getParams = Promise.resolve({ broadcastId: createdBroadcast.id });
    const getResponse = await GetBroadcast(getRequest, { params: getParams });
    const getData = await getResponse.json();

    expect(getData.sendAt).toBeDefined();
    expect(new Date(getData.sendAt).getTime()).toBeCloseTo(
      new Date(expectedSendAt).getTime(),
      -3, // Allow 1 second difference
    );
  });
});
