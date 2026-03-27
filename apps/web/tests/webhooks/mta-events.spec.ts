/**
 * Webhook Integration Tests - MTA Events
 *
 * Tests that webhook dispatching is correctly triggered for MTA event processing:
 *
 * TransactionalEmail webhooks:
 * - transactional_email.delivered
 * - transactional_email.bounced
 * - transactional_email.complained
 *
 * Broadcast/Email webhooks:
 * - email.delivered
 * - email.bounced
 * - email.complained
 * - email.failed
 *
 * Suppression webhooks:
 * - suppression.added (for bounces and complaints)
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
const { mockDispatchWebhook, mockDispatchWebhookBulk } = vi.hoisted(() => ({
  mockDispatchWebhook: vi.fn<typeof DispatchWebhookFn>(),
  mockDispatchWebhookBulk: vi.fn<typeof DispatchWebhookBulkFn>(),
}));

vi.mock("@/webhooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/webhooks")>();
  return {
    ...actual,
    dispatchWebhook: mockDispatchWebhook,
    dispatchWebhookBulk: mockDispatchWebhookBulk,
  };
});

// Import after mocking
import { processEventsWithSideEffects } from "@/lib/mta/event-processor";
import type { EmailEvent } from "@/lib/mta/event-types";
import { prisma } from "@/lib/db";
import {
  cleanupWorkspace,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

beforeEach(() => {
  mockDispatchWebhook.mockClear();
  mockDispatchWebhookBulk.mockClear();
});

// Helper to create a test TransactionalEmail
async function createTestTransactionalEmail(
  sendingId: string,
  status: "QUEUED" | "SENDING" | "DELIVERED" | "BOUNCED" | "COMPLAINED" | "FAILED" = "SENDING"
) {
  return prisma.transactionalEmail.create({
    data: {
      workspaceId: testWorkspace.id,
      sendingId,
      fromEmail: "sender@test.com",
      toEmail: "recipient@test.com",
      subject: "Test Subject",
      status,
      sentAt: new Date(),
    },
  });
}

// Helper to create a test Broadcast
async function createTestBroadcast(workspaceId: string) {
  return prisma.broadcast.create({
    data: {
      workspaceId,
      name: `Test Broadcast ${Date.now()}`,
      status: "SENDING",
    },
  });
}

// Helper to create a test Contact
async function createTestContact(workspaceId: string) {
  return prisma.contact.create({
    data: {
      workspaceId,
      email: `test-${Date.now()}@example.com`,
      status: "SUBSCRIBED",
    },
  });
}

// Helper to create a test BroadcastSend
async function createTestBroadcastSend(
  broadcastId: string,
  contactId: string,
  workspaceId: string,
  sendingId: string,
  status: "QUEUED" | "SENDING" | "DELIVERED" | "BOUNCED" | "COMPLAINED" | "FAILED" = "SENDING"
) {
  return prisma.broadcastSend.create({
    data: {
      broadcastId,
      contactId,
      workspaceId,
      sendingId,
      email: "recipient@test.com",
      status,
      queuedAt: new Date(),
      sentAt: new Date(),
    },
  });
}

// Helper to create a mock EmailEvent
function createMockEvent(
  sendingId: string,
  type: EmailEvent["type"],
  overrides: Partial<EmailEvent> = {}
): EmailEvent {
  return {
    type,
    sending_id: sendingId,
    recipient: "recipient@test.com",
    tenant_id: testWorkspace.id,
    broadcast_id: "",
    contact_id: "",
    response: {
      code: 250,
      content: "OK",
      enhanced_code: null,
    },
    bounce_classification: "",
    timestamp: new Date().toISOString(),
    node_id: "node-1",
    queue: "",
    site_name: "",
    size: null,
    num_attempts: null,
    peer_address_name: "",
    peer_address_addr: "",
    egress_pool: "",
    egress_source: "",
    delivery_protocol: "",
    reception_protocol: "",
    sending_domain_id: "",
    sender_identity_id: "",
    click_tracking_enabled: null,
    open_tracking_enabled: null,
    from_email: "",
    subject: "",
    ...overrides,
  };
}

describe("MTA Webhooks - TransactionalEmail Events", () => {
  test("should dispatch transactional_email.delivered webhook on Delivery event", async () => {
    const sendingId = `webhook-te-delivery-${Date.now()}`;
    const email = await createTestTransactionalEmail(sendingId);

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Delivery", {
        response: { code: 250, content: "Message accepted" },
      }),
    ];

    await processEventsWithSideEffects(events);

    // Verify webhook was dispatched
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "transactional_email.delivered",
      expect.objectContaining({
        transactionalEmailId: email.id,
        responseCode: 250,
        responseMessage: "Message accepted",
      })
    );
  });

  test("should dispatch transactional_email.bounced webhook on Bounce event", async () => {
    const sendingId = `webhook-te-bounce-${Date.now()}`;
    const email = await createTestTransactionalEmail(sendingId);

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Bounce", {
        response: { code: 550, content: "User unknown" },
        bounce_classification: "InvalidRecipient",
      }),
    ];

    await processEventsWithSideEffects(events);

    // Verify webhook was dispatched
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "transactional_email.bounced",
      expect.objectContaining({
        transactionalEmailId: email.id,
        bounceType: "hard",
        bounceClassification: "InvalidRecipient",
        responseCode: 550,
        responseMessage: "User unknown",
      })
    );
  });

  test("should dispatch transactional_email.complained webhook on Feedback event", async () => {
    const sendingId = `webhook-te-feedback-${Date.now()}`;
    const email = await createTestTransactionalEmail(sendingId);

    const events: EmailEvent[] = [createMockEvent(sendingId, "Feedback")];

    await processEventsWithSideEffects(events);

    // Verify webhook was dispatched
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "transactional_email.complained",
      expect.objectContaining({
        transactionalEmailId: email.id,
        feedbackType: "abuse",
      })
    );
  });

  test("should create TransactionalEmail reactively and dispatch webhook for SMTP-injected email", async () => {
    const sendingId = `smtp-injected-${Date.now()}`;

    const events: EmailEvent[] = [createMockEvent(sendingId, "Delivery")];

    await processEventsWithSideEffects(events);

    // SMTP-injected emails get a TransactionalEmail record created reactively,
    // which then dispatches a transactional_email webhook
    const transactionalCalls = mockDispatchWebhook.mock.calls.filter((call) =>
      call[1].startsWith("transactional_email.")
    );
    expect(transactionalCalls.length).toBe(1);
  });
});

describe("MTA Webhooks - Broadcast Email Events", () => {
  test("should dispatch email.delivered webhook on Delivery event for broadcast", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createTestContact(testWorkspace.id);
    const sendingId = `webhook-broadcast-delivery-${Date.now()}`;
    await createTestBroadcastSend(
      broadcast.id,
      contact.id,
      testWorkspace.id,
      sendingId
    );

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Delivery", {
        broadcast_id: broadcast.id,
        contact_id: contact.id,
        response: { code: 250, content: "Message accepted" },
      }),
    ];

    await processEventsWithSideEffects(events);

    // Verify webhook was dispatched
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "email.delivered",
      expect.objectContaining({
        sendingId,
        broadcastId: broadcast.id,
        responseCode: 250,
        responseMessage: "Message accepted",
      })
    );
  });

  test("should dispatch email.bounced webhook on Bounce event for broadcast", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createTestContact(testWorkspace.id);
    const sendingId = `webhook-broadcast-bounce-${Date.now()}`;
    await createTestBroadcastSend(
      broadcast.id,
      contact.id,
      testWorkspace.id,
      sendingId
    );

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Bounce", {
        broadcast_id: broadcast.id,
        contact_id: contact.id,
        response: { code: 550, content: "User unknown" },
        bounce_classification: "InvalidRecipient",
      }),
    ];

    await processEventsWithSideEffects(events);

    // Verify webhook was dispatched
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "email.bounced",
      expect.objectContaining({
        sendingId,
        broadcastId: broadcast.id,
        bounceType: "hard",
        bounceClassification: "InvalidRecipient",
        responseCode: 550,
        responseMessage: "User unknown",
      })
    );
  });

  test("should dispatch email.complained webhook on Feedback event for broadcast", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createTestContact(testWorkspace.id);
    const sendingId = `webhook-broadcast-feedback-${Date.now()}`;
    await createTestBroadcastSend(
      broadcast.id,
      contact.id,
      testWorkspace.id,
      sendingId
    );

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Feedback", {
        broadcast_id: broadcast.id,
        contact_id: contact.id,
      }),
    ];

    await processEventsWithSideEffects(events);

    // Verify webhook was dispatched
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "email.complained",
      expect.objectContaining({
        sendingId,
        broadcastId: broadcast.id,
        feedbackType: "abuse",
      })
    );
  });

  test("should dispatch email.failed webhook on Rejection event for broadcast", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createTestContact(testWorkspace.id);
    const sendingId = `webhook-broadcast-rejection-${Date.now()}`;
    await createTestBroadcastSend(
      broadcast.id,
      contact.id,
      testWorkspace.id,
      sendingId
    );

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Rejection", {
        broadcast_id: broadcast.id,
        contact_id: contact.id,
        response: { code: 554, content: "Message rejected" },
      }),
    ];

    await processEventsWithSideEffects(events);

    // Verify webhook was dispatched
    // Note: Rejection events don't capture response code/message, so defaults are used
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "email.failed",
      expect.objectContaining({
        sendingId,
        broadcastId: broadcast.id,
        responseCode: 500,
        responseMessage: "Failed",
      })
    );
  });

  test("should NOT dispatch email webhook for non-existent BroadcastSend", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const sendingId = `non-existent-bs-${Date.now()}`;

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Delivery", {
        broadcast_id: broadcast.id,
      }),
    ];

    await processEventsWithSideEffects(events);

    // Should not dispatch email webhooks (except suppression which uses different logic)
    const emailCalls = mockDispatchWebhook.mock.calls.filter((call) =>
      call[1].startsWith("email.")
    );
    expect(emailCalls.length).toBe(0);
  });

  test("should NOT dispatch email webhook when status has not changed", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createTestContact(testWorkspace.id);
    const sendingId = `webhook-no-change-${Date.now()}`;
    // Create with DELIVERED status (already delivered)
    await createTestBroadcastSend(
      broadcast.id,
      contact.id,
      testWorkspace.id,
      sendingId,
      "DELIVERED"
    );

    mockDispatchWebhook.mockClear();

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Delivery", {
        broadcast_id: broadcast.id,
        contact_id: contact.id,
      }),
    ];

    await processEventsWithSideEffects(events);

    // Should not dispatch email.delivered since status didn't change
    const deliveredCalls = mockDispatchWebhook.mock.calls.filter(
      (call) => call[1] === "email.delivered"
    );
    expect(deliveredCalls.length).toBe(0);
  });
});

describe("MTA Webhooks - Suppression Events", () => {
  test("should dispatch suppression.added webhook for hard bounces", async () => {
    const sendingId = `webhook-suppression-bounce-${Date.now()}`;
    const recipientEmail = `hard-bounce-${Date.now()}@example.com`;

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Bounce", {
        recipient: recipientEmail,
        bounce_classification: "InvalidRecipient",
      }),
    ];

    await processEventsWithSideEffects(events);

    // Verify suppression webhook was dispatched via bulk
    expect(mockDispatchWebhookBulk).toHaveBeenCalled();
    const bulkCall = mockDispatchWebhookBulk.mock.calls[0];
    const suppressionPayloads = bulkCall[0].filter(
      (p: { topic: string }) => p.topic === "suppression.added"
    );
    expect(suppressionPayloads.length).toBeGreaterThanOrEqual(1);
    expect(suppressionPayloads[0].workspaceId).toBe(testWorkspace.id);
  });

  test("should dispatch suppression.added webhook for complaints", async () => {
    const sendingId = `webhook-suppression-complaint-${Date.now()}`;
    const recipientEmail = `complained-${Date.now()}@example.com`;

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Feedback", {
        recipient: recipientEmail,
      }),
    ];

    await processEventsWithSideEffects(events);

    // Verify suppression webhook was dispatched via bulk
    expect(mockDispatchWebhookBulk).toHaveBeenCalled();
    const bulkCall = mockDispatchWebhookBulk.mock.calls.find((call) =>
      call[0].some((p: { topic: string }) => p.topic === "suppression.added")
    );
    expect(bulkCall).toBeDefined();
  });

  test("should NOT dispatch suppression webhook for soft bounces", async () => {
    const sendingId = `webhook-soft-bounce-${Date.now()}`;
    const recipientEmail = `soft-bounce-${Date.now()}@example.com`;

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Bounce", {
        recipient: recipientEmail,
        bounce_classification: "MailboxFull", // Soft bounce
      }),
    ];

    await processEventsWithSideEffects(events);

    // Soft bounces should not create suppressions
    // Either mockDispatchWebhookBulk not called, or called without suppression.added for this email
    if (mockDispatchWebhookBulk.mock.calls.length > 0) {
      const allPayloads = mockDispatchWebhookBulk.mock.calls.flatMap(
        (call) => call[0]
      );
      const suppressionForThisEmail = allPayloads.filter(
        (p: { topic: string; workspaceId: string }) =>
          p.topic === "suppression.added" && p.workspaceId === testWorkspace.id
      );
      expect(suppressionForThisEmail.length).toBe(0);
    }
  });
});

describe("MTA Webhooks - Multiple Events Batch", () => {
  test("should dispatch webhooks for multiple events in batch", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact1 = await createTestContact(testWorkspace.id);
    const contact2 = await createTestContact(testWorkspace.id);
    const sendingId1 = `webhook-batch-1-${Date.now()}`;
    const sendingId2 = `webhook-batch-2-${Date.now()}`;

    await createTestBroadcastSend(
      broadcast.id,
      contact1.id,
      testWorkspace.id,
      sendingId1
    );
    await createTestBroadcastSend(
      broadcast.id,
      contact2.id,
      testWorkspace.id,
      sendingId2
    );

    const events: EmailEvent[] = [
      createMockEvent(sendingId1, "Delivery", {
        broadcast_id: broadcast.id,
        contact_id: contact1.id,
      }),
      createMockEvent(sendingId2, "Bounce", {
        broadcast_id: broadcast.id,
        contact_id: contact2.id,
        bounce_classification: "InvalidRecipient",
      }),
    ];

    await processEventsWithSideEffects(events);

    // Verify email.delivered webhook
    const deliveredCalls = mockDispatchWebhook.mock.calls.filter(
      (call) => call[1] === "email.delivered"
    );
    expect(deliveredCalls.length).toBe(1);
    expect((deliveredCalls[0][2] as { sendingId: string }).sendingId).toBe(sendingId1);

    // Verify email.bounced webhook
    const bouncedCalls = mockDispatchWebhook.mock.calls.filter(
      (call) => call[1] === "email.bounced"
    );
    expect(bouncedCalls.length).toBe(1);
    expect((bouncedCalls[0][2] as { sendingId: string }).sendingId).toBe(sendingId2);
  });

  test("should dispatch highest priority webhook when multiple events for same sendingId", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createTestContact(testWorkspace.id);
    const sendingId = `webhook-priority-${Date.now()}`;

    await createTestBroadcastSend(
      broadcast.id,
      contact.id,
      testWorkspace.id,
      sendingId
    );

    // Send Delivery then Feedback (complaint has higher priority)
    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Delivery", {
        broadcast_id: broadcast.id,
        contact_id: contact.id,
      }),
      createMockEvent(sendingId, "Feedback", {
        broadcast_id: broadcast.id,
        contact_id: contact.id,
      }),
    ];

    await processEventsWithSideEffects(events);

    // Should dispatch email.complained (highest priority status)
    const complainedCalls = mockDispatchWebhook.mock.calls.filter(
      (call) => call[1] === "email.complained"
    );
    expect(complainedCalls.length).toBe(1);

    // Should NOT dispatch email.delivered since complaint takes priority
    const deliveredCalls = mockDispatchWebhook.mock.calls.filter(
      (call) => call[1] === "email.delivered"
    );
    expect(deliveredCalls.length).toBe(0);
  });
});
