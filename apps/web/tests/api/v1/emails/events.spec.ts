/**
 * Integration tests for Get Transactional Email Events Endpoint (External API)
 *
 * Tests actual Next.js route handlers for:
 * - GET /api/v1/emails/[emailId]/events - Get email timeline/events
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { GET } from "@/app/(main)/api/v1/emails/[emailId]/events/route";
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
let emailWithEvents: {
  id: string;
  sendingId: string;
};

let emailWithoutEvents: {
  id: string;
  sendingId: string;
};

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  otherWorkspace = createTestWorkspace();

  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
  readOnlyApiKey = await createReadOnlyApiKey(testWorkspace.id);
  otherWorkspaceApiKey = await createFullAccessApiKey(otherWorkspace.id);

  // Create email with multiple events
  const emailWithEventsRecord = await prisma.transactionalEmail.create({
    data: {
      workspaceId: testWorkspace.id,
      sendingId: `sending-events-${testWorkspace.id}`,
      fromEmail: "sender@test-domain.com",
      toEmail: "recipient@example.com",
      subject: "Email with Events",
      status: "DELIVERED",
      sentAt: new Date(),
    },
  });

  emailWithEvents = {
    id: emailWithEventsRecord.id,
    sendingId: emailWithEventsRecord.sendingId,
  };

  // Create events for the email (in chronological order)
  const baseTime = Date.now() - 3600000; // 1 hour ago

  await prisma.event.createMany({
    data: [
      {
        sendingId: emailWithEvents.sendingId,
        workspaceId: testWorkspace.id,
        type: "Queued",
        recipient: "recipient@example.com",
        responseCode: 0,
        responseContent: "",
        nodeId: "node-1",
        createdAt: new Date(baseTime),
      },
      {
        sendingId: emailWithEvents.sendingId,
        workspaceId: testWorkspace.id,
        type: "Delivery",
        recipient: "recipient@example.com",
        responseCode: 250,
        responseContent: "OK",
        responseCommand: "DATA",
        peerAddressName: "mx.example.com",
        nodeId: "node-1",
        createdAt: new Date(baseTime + 5000),
      },
      {
        sendingId: emailWithEvents.sendingId,
        workspaceId: testWorkspace.id,
        type: "Open",
        recipient: "recipient@example.com",
        responseCode: 0,
        responseContent: "",
        originCountry: "US",
        originCity: "New York",
        originDevice: "Desktop",
        originBrowser: "Chrome",
        nodeId: "node-1",
        createdAt: new Date(baseTime + 60000),
      },
      {
        sendingId: emailWithEvents.sendingId,
        workspaceId: testWorkspace.id,
        type: "Click",
        recipient: "recipient@example.com",
        responseCode: 0,
        responseContent: "",
        originCountry: "US",
        originCity: "New York",
        originDevice: "Desktop",
        originBrowser: "Chrome",
        nodeId: "node-1",
        createdAt: new Date(baseTime + 120000),
      },
    ],
  });

  // Create email without events
  const emailWithoutEventsRecord = await prisma.transactionalEmail.create({
    data: {
      workspaceId: testWorkspace.id,
      sendingId: `sending-no-events-${testWorkspace.id}`,
      fromEmail: "sender@test-domain.com",
      toEmail: "no-events@example.com",
      subject: "Email without Events",
      status: "QUEUED",
    },
  });

  emailWithoutEvents = {
    id: emailWithoutEventsRecord.id,
    sendingId: emailWithoutEventsRecord.sendingId,
  };
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
  await cleanupWorkspace(otherWorkspace.id);
});

// Helper to create request with params
function createGetRequest(emailId: string, apiKey?: string) {
  const request = get(`/emails/${emailId}/events`, apiKey);
  return { request, params: Promise.resolve({ emailId }) };
}

describe("GET /api/v1/emails/[emailId]/events", () => {
  test("should return all events for an email", async () => {
    const { request, params } = createGetRequest(emailWithEvents.id, fullAccessApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("event_list");
    expect(responseData.emailId).toBe(emailWithEvents.id);
    expect(responseData.sendingId).toBe(emailWithEvents.sendingId);
    expect(Array.isArray(responseData.events)).toBe(true);
    expect(responseData.events.length).toBe(4);
  });

  test("should return events in chronological order", async () => {
    const { request, params } = createGetRequest(emailWithEvents.id, fullAccessApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);

    // Verify ascending order (oldest first)
    const events = responseData.events;
    for (let i = 1; i < events.length; i++) {
      const prev = new Date(events[i - 1].timestamp);
      const curr = new Date(events[i].timestamp);
      expect(prev.getTime()).toBeLessThanOrEqual(curr.getTime());
    }

    // Verify expected event types in order
    expect(events[0].type).toBe("Queued");
    expect(events[1].type).toBe("Delivery");
    expect(events[2].type).toBe("Open");
    expect(events[3].type).toBe("Click");
  });

  test("should return event details with correct structure", async () => {
    const { request, params } = createGetRequest(emailWithEvents.id, fullAccessApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);

    // Check Delivery event structure
    const deliveryEvent = responseData.events.find((e: { type: string }) => e.type === "Delivery");
    expect(deliveryEvent).toBeDefined();
    expect(deliveryEvent.id).toBeDefined();
    expect(deliveryEvent.type).toBe("Delivery");
    expect(deliveryEvent.timestamp).toBeDefined();
    expect(deliveryEvent.response).toBeDefined();
    expect(deliveryEvent.response.code).toBe(250);
    expect(deliveryEvent.response.content).toBe("OK");
    expect(deliveryEvent.response.command).toBe("DATA");
    expect(deliveryEvent.server).toBe("mx.example.com");
  });

  test("should return origin info for engagement events", async () => {
    const { request, params } = createGetRequest(emailWithEvents.id, fullAccessApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);

    // Check Open event with origin info
    const openEvent = responseData.events.find((e: { type: string }) => e.type === "Open");
    expect(openEvent).toBeDefined();
    expect(openEvent.origin).toBeDefined();
    expect(openEvent.origin.country).toBe("US");
    expect(openEvent.origin.city).toBe("New York");
    expect(openEvent.origin.device).toBe("Desktop");
    expect(openEvent.origin.browser).toBe("Chrome");
  });

  test("should return empty events array for email with no events", async () => {
    const { request, params } = createGetRequest(emailWithoutEvents.id, fullAccessApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.events).toEqual([]);
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
    const { request, params } = createGetRequest(emailWithEvents.id, otherWorkspaceApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });

  test("should reject read-only API key (requires smtp:send scope)", async () => {
    const { request, params } = createGetRequest(emailWithEvents.id, readOnlyApiKey.key);

    const response = await GET(request, { params });
    const responseData = await response.json();

    // Read-only keys don't have smtp:send scope
    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });

  test("should reject request without authentication", async () => {
    const { request, params } = createGetRequest(emailWithEvents.id);

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.MISSING_AUTHORIZATION_HEADER);
  });

  test("should reject request with invalid API key", async () => {
    const { request, params } = createGetRequest(emailWithEvents.id, "invalid-api-key");

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.INVALID_API_KEY);
  });
});
