/**
 * Webhook Integration Tests - Broadcast Events
 *
 * Tests that webhook dispatching is correctly triggered for broadcast operations:
 * - broadcast.created
 * - broadcast.scheduled
 */

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import type {
  dispatchWebhook as DispatchWebhookFn,
  dispatchWebhookBulk as DispatchWebhookBulkFn,
} from "@/webhooks";

// Hoist the mock functions so they can be used in vi.mock
const { mockDispatchWebhook, mockDispatchWebhookBulk, mockQueuePush } = vi.hoisted(
  () => ({
    mockDispatchWebhook: vi.fn<typeof DispatchWebhookFn>(),
    mockDispatchWebhookBulk: vi.fn<typeof DispatchWebhookBulkFn>(),
    mockQueuePush: vi.fn(),
  })
);

vi.mock("@/webhooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/webhooks")>();
  return {
    ...actual,
    dispatchWebhook: mockDispatchWebhook,
    dispatchWebhookBulk: mockDispatchWebhookBulk,
  };
});

// Mock the queue to prevent actual job dispatching during tests
vi.mock("@/lib/queue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queue")>();
  return {
    ...actual,
    queue: () => ({
      push: mockQueuePush,
      getQueue: () => ({ getQueue: () => ({}) }),
    }),
  };
});

// Import after mocking
import { POST as CreateBroadcast } from "@/app/(main)/api/v1/broadcasts/route";
import { POST as SendBroadcast } from "@/app/(main)/api/v1/broadcasts/[broadcastId]/send/route";
import { prisma } from "@/lib/db";
import {
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestWorkspace,
  post,
  type CreatedApiKey,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;
let sendingDomainId: string;
let senderIdentityId: string;

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);

  // Create a sending domain for broadcasts
  const sendingDomain = await prisma.sendingDomain.create({
    data: {
      workspaceId: testWorkspace.id,
      name: `broadcast-test-${Date.now()}.example.com`,
      dkimSubDomain: "kiba._domainkey",
      dkimPublicKey: "test-public-key",
      dkimPrivateKey: "test-private-key",
      returnPathSubDomain: "kb",
      returnPathDomainCnameValue: "mail.kbmta.net",
      trackingSubDomain: "e",
      trackingDomainCnameValue: "e.kbmta.net",
      dmarcReportingCode: "abcdefghij",
      dkimVerifiedAt: new Date(),
      returnPathDomainVerifiedAt: new Date(),
      maxSendPerDay: 1000,
      maxSendPerHour: 100,
    },
  });
  sendingDomainId = sendingDomain.id;

  // Create a sender identity
  const senderIdentity = await prisma.senderIdentity.create({
    data: {
      workspaceId: testWorkspace.id,
      sendingDomainId: sendingDomain.id,
      name: "Test Sender",
      email: "hello",
    },
  });
  senderIdentityId = senderIdentity.id;
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

beforeEach(() => {
  mockDispatchWebhook.mockClear();
  mockDispatchWebhookBulk.mockClear();
  mockQueuePush.mockClear();
});

describe("Broadcast Webhooks - broadcast.created", () => {
  test("should dispatch broadcast.created webhook when creating a broadcast", async () => {
    const broadcastData = { name: "Webhook Test Broadcast" };
    const request = post("/broadcasts", broadcastData, fullAccessApiKey.key);

    const response = await CreateBroadcast(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);

    // Verify webhook was dispatched
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "broadcast.created",
      expect.objectContaining({
        broadcastId: responseData.id,
      })
    );
  });

  test("should dispatch broadcast.created with correct broadcastId", async () => {
    const broadcastData = { name: "Another Broadcast" };
    const request = post("/broadcasts", broadcastData, fullAccessApiKey.key);

    const response = await CreateBroadcast(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);

    // Check the specific call
    const webhookCall = mockDispatchWebhook.mock.calls.find(
      (call) => call[1] === "broadcast.created"
    );

    expect(webhookCall).toBeDefined();
    expect((webhookCall![2] as { broadcastId: string }).broadcastId).toBe(responseData.id);
  });
});

describe("Broadcast Webhooks - broadcast.scheduled", () => {
  test("should dispatch broadcast.scheduled webhook when scheduling a broadcast", async () => {
    // Create a subscriber contact so we have recipients
    await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: `subscriber-${Date.now()}@example.com`,
        status: "SUBSCRIBED",
        subscribedAt: new Date(),
      },
    });

    // Create email content with unsubscribe link
    const emailContent = await prisma.emailContent.create({
      data: {
        subject: "Test Subject",
        contentHtml: '<p>Hello <a href="{{unsubscribe_url}}">Unsubscribe</a></p>',
        contentText: "Hello {{unsubscribe_url}}",
      },
    });

    // Create a segment for the broadcast
    const segment = await prisma.segment.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "All Subscribers",
        type: "DYNAMIC",
        conditions: { field: "status", operator: "eq", value: "SUBSCRIBED" },
      },
    });

    // Create a fully configured broadcast
    const sendAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const broadcast = await prisma.broadcast.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Scheduled Broadcast",
        status: "DRAFT",
        sendAt,
        senderIdentityId,
        sendingDomainId,
        emailContentId: emailContent.id,
        segmentId: segment.id,
      },
    });

    mockDispatchWebhook.mockClear();

    // Schedule the broadcast
    const scheduleRequest = post(
      `/broadcasts/${broadcast.id}/send`,
      {},
      fullAccessApiKey.key
    );

    const response = await SendBroadcast(scheduleRequest, {
      params: Promise.resolve({ broadcastId: broadcast.id }),
    });

    expect(response.status).toBe(200);

    // Verify webhook was dispatched
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "broadcast.scheduled",
      expect.objectContaining({
        broadcastId: broadcast.id,
        scheduledFor: sendAt.toISOString(),
      })
    );
  });
});
