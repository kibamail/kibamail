/**
 * Integration tests for Send Broadcast Endpoint (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/broadcasts/[broadcastId]/send - Schedule broadcast for sending
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  GET as GetBroadcast,
  PUT as UpdateBroadcast,
} from "@/app/(main)/api/v1/broadcasts/[broadcastId]/route";
import { POST as SendBroadcast } from "@/app/(main)/api/v1/broadcasts/[broadcastId]/send/route";
import { POST as CreateBroadcast } from "@/app/(main)/api/v1/broadcasts/route";
import { POST as CreateDomain } from "@/app/(main)/api/v1/domains/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestContacts,
  createTestWorkspace,
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
 * Helper to update a broadcast
 */
async function updateTestBroadcast(
  apiKey: CreatedApiKey,
  broadcastId: string,
  data: {
    sendAt?: string;
    emailContent?: {
      subject?: string;
      text?: string;
      html?: string;
      previewText?: string;
    };
  },
) {
  const request = put(`/broadcasts/${broadcastId}`, data, apiKey.key);
  const params = Promise.resolve({ broadcastId });
  const response = await UpdateBroadcast(request, { params });
  return await response.json();
}

/**
 * Helper to create a test sending domain and mark it as verified
 */
async function createVerifiedDomain(apiKey: CreatedApiKey, name: string) {
  const request = post("/domains", { name }, apiKey.key);
  const response = await CreateDomain(request);
  const domain = await response.json();

  // Mark domain as verified
  await prisma.sendingDomain.update({
    where: { id: domain.id },
    data: {
      dkimVerifiedAt: new Date(),
      returnPathDomainVerifiedAt: new Date(),
    },
  });

  return domain;
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
    // Create verified domain
    await createVerifiedDomain(fullAccessApiKey, "send-test.example.com");

    // Create contacts to have recipients
    await createTestContacts(testWorkspace.id, [
      { email: "recipient1@example.com", status: "SUBSCRIBED" },
      { email: "recipient2@example.com", status: "SUBSCRIBED" },
    ]);

    // Create broadcast with all required fields including unsubscribe link
    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Send Test Broadcast",
      from: "news@send-test.example.com",
      emailContent: {
        subject: "Important Newsletter",
        html: '<p>Hello!</p><a href="{{unsubscribe_url}}">Unsubscribe</a>',
      },
    });

    // Set sendAt via update
    const sendAt = getFutureDate(2);
    await updateTestBroadcast(fullAccessApiKey, createdBroadcast.id, {
      sendAt,
    });

    // Send broadcast (no body needed)
    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      {},
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
      emailContent: {
        subject: "Has subject but no sender",
        html: '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
      },
    });

    // Set sendAt
    await updateTestBroadcast(fullAccessApiKey, createdBroadcast.id, {
      sendAt: getFutureDate(1),
    });

    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      {},
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
  });

  test("should reject sending broadcast without subject", async () => {
    await createVerifiedDomain(fullAccessApiKey, "no-subject.example.com");

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "No Subject Broadcast",
      from: "news@no-subject.example.com",
    });

    // Set sendAt
    await updateTestBroadcast(fullAccessApiKey, createdBroadcast.id, {
      sendAt: getFutureDate(1),
    });

    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      {},
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
  });

  test("should reject sending broadcast without unsubscribe link", async () => {
    await createVerifiedDomain(fullAccessApiKey, "no-unsubscribe.example.com");

    // Create contacts
    await createTestContacts(testWorkspace.id, [
      { email: "no-unsub@example.com", status: "SUBSCRIBED" },
    ]);

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "No Unsubscribe Broadcast",
      from: "news@no-unsubscribe.example.com",
      emailContent: {
        subject: "Missing unsubscribe link",
        html: "<p>Hello without unsubscribe!</p>",
      },
    });

    // Set sendAt
    await updateTestBroadcast(fullAccessApiKey, createdBroadcast.id, {
      sendAt: getFutureDate(1),
    });

    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      {},
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
    expect(responseData.error.message).toContain("unsubscribe");
  });

  test("should reject sending broadcast without sendAt", async () => {
    await createVerifiedDomain(fullAccessApiKey, "no-sendat.example.com");

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "No SendAt Broadcast",
      from: "news@no-sendat.example.com",
      emailContent: {
        subject: "Missing sendAt",
        html: '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
      },
    });

    // Don't set sendAt

    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      {},
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
  });

  test("should reject sending broadcast without recipients", async () => {
    // Create a fresh workspace to ensure no contacts exist
    const freshWorkspace = createTestWorkspace();
    const freshApiKey = await createFullAccessApiKey(freshWorkspace.id);

    await createVerifiedDomain(freshApiKey, "no-recipients.example.com");

    const createdBroadcast = await createTestBroadcast(freshApiKey, {
      name: "No Recipients Broadcast",
      from: "news@no-recipients.example.com",
      emailContent: {
        subject: "No one to send to",
        html: '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
      },
    });

    await updateTestBroadcast(freshApiKey, createdBroadcast.id, {
      sendAt: getFutureDate(1),
    });

    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      {},
      freshApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);

    await cleanupWorkspace(freshWorkspace.id);
  });

  test("should reject sending broadcast with unverified domain", async () => {
    // Create domain but don't verify it
    const domainRequest = post(
      "/domains",
      { name: "unverified.example.com" },
      fullAccessApiKey.key,
    );
    await CreateDomain(domainRequest);

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Unverified Domain Broadcast",
      from: "news@unverified.example.com",
      emailContent: {
        subject: "Domain not verified",
        html: '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
      },
    });

    await updateTestBroadcast(fullAccessApiKey, createdBroadcast.id, {
      sendAt: getFutureDate(1),
    });

    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      {},
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
    expect(responseData.error.message).toContain("verified");
  });

  test("should reject sending non-draft broadcast", async () => {
    await createVerifiedDomain(fullAccessApiKey, "non-draft-send.example.com");

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Non-Draft Send Broadcast",
      from: "news@non-draft-send.example.com",
      emailContent: {
        subject: "Already sent",
        html: '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
      },
    });

    // Manually set status to SENT
    await prisma.broadcast.update({
      where: { id: createdBroadcast.id },
      data: { status: "SENT" },
    });

    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      {},
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_EDITABLE);
  });

  test("should reject sending already queued broadcast", async () => {
    await createVerifiedDomain(fullAccessApiKey, "already-queued.example.com");

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Already Queued Broadcast",
      from: "news@already-queued.example.com",
      emailContent: {
        subject: "Already queued",
        html: '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
      },
    });

    // Manually set status to QUEUED_FOR_SENDING
    await prisma.broadcast.update({
      where: { id: createdBroadcast.id },
      data: { status: "QUEUED_FOR_SENDING" },
    });

    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      {},
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_EDITABLE);
  });

  test("should return 404 for non-existent broadcast", async () => {
    const request = post(
      "/broadcasts/non_existent_id/send",
      {},
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: "non_existent_id" });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_FOUND);
  });

  test("should reject send without write:broadcasts scope", async () => {
    await createVerifiedDomain(fullAccessApiKey, "scope-send.example.com");

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Scope Send Broadcast",
      from: "news@scope-send.example.com",
      emailContent: {
        subject: "Test scope",
        html: '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
      },
    });

    const readOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:broadcasts"],
    });

    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      {},
      readOnlyApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });

  test("should not send broadcast from different workspace", async () => {
    await createVerifiedDomain(
      fullAccessApiKey,
      "cross-workspace-send.example.com",
    );

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "Cross Workspace Send Broadcast",
      from: "news@cross-workspace-send.example.com",
      emailContent: {
        subject: "Cross workspace",
        html: '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
      },
    });

    // Create different workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      {},
      otherApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.BROADCAST_NOT_FOUND);

    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should correctly preserve sendAt time", async () => {
    await createVerifiedDomain(fullAccessApiKey, "sendat-verify.example.com");

    // Create contacts
    await createTestContacts(testWorkspace.id, [
      { email: "sendat-test@example.com", status: "SUBSCRIBED" },
    ]);

    const createdBroadcast = await createTestBroadcast(fullAccessApiKey, {
      name: "SendAt Verify Broadcast",
      from: "news@sendat-verify.example.com",
      emailContent: {
        subject: "Verify sendAt",
        html: '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
      },
    });

    const expectedSendAt = getFutureDate(24); // 24 hours from now
    await updateTestBroadcast(fullAccessApiKey, createdBroadcast.id, {
      sendAt: expectedSendAt,
    });

    const request = post(
      `/broadcasts/${createdBroadcast.id}/send`,
      {},
      fullAccessApiKey.key,
    );
    const params = Promise.resolve({ broadcastId: createdBroadcast.id });

    const response = await SendBroadcast(request, { params });
    const _responseData = await response.json();

    expect(response.status).toBe(200);

    // Verify via GET
    const getRequest = get(
      `/broadcasts/${createdBroadcast.id}`,
      fullAccessApiKey.key,
    );
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
