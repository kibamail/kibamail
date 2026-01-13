/**
 * Webhook Integration Tests - Unsubscribe Events
 *
 * Tests that webhook dispatching is correctly triggered for unsubscribe operations:
 * - contact.unsubscribed
 * - contact.status_changed
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
import { unsubscribe } from "@/jobs/contacts/unsubscribe";
import { prisma } from "@/lib/db";
import {
  cleanupWorkspace,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;

async function createTestBroadcast(workspaceId: string) {
  const emailContent = await prisma.emailContent.create({
    data: {
      subject: "Test Broadcast Subject",
      contentHtml: "<p>Test content</p>",
    },
  });

  return prisma.broadcast.create({
    data: {
      workspaceId,
      name: "Test Broadcast",
      status: "SENT",
      emailContentId: emailContent.id,
    },
  });
}

async function createSubscribedContact(workspaceId: string, email: string) {
  return prisma.contact.create({
    data: {
      workspaceId,
      email,
      firstName: "Test",
      lastName: "User",
      status: "SUBSCRIBED",
      subscribedAt: new Date(),
    },
  });
}

beforeAll(() => {
  testWorkspace = createTestWorkspace();
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

beforeEach(async () => {
  mockDispatchWebhook.mockClear();
  mockDispatchWebhookBulk.mockClear();

  // Clean up test data before each test
  await prisma.event.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
  await prisma.broadcast.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
  await prisma.contact.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
});

describe("Unsubscribe Webhooks - contact.unsubscribed", () => {
  test("should dispatch contact.unsubscribed webhook with link method", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createSubscribedContact(
      testWorkspace.id,
      `webhook-unsub-link-${Date.now()}@example.com`
    );

    await unsubscribe(
      {
        contactId: contact.id,
        broadcastId: broadcast.id,
        source: "link",
      },
      "test-job-webhook-link"
    );

    // Verify webhook was dispatched with correct payload
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "contact.unsubscribed",
      expect.objectContaining({
        contactId: contact.id,
        method: "link",
        reason: null,
      })
    );
  });

  test("should dispatch contact.unsubscribed webhook with list_unsubscribe method", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createSubscribedContact(
      testWorkspace.id,
      `webhook-unsub-list-${Date.now()}@example.com`
    );

    await unsubscribe(
      {
        contactId: contact.id,
        broadcastId: broadcast.id,
        source: "list-unsubscribe",
      },
      "test-job-webhook-list"
    );

    // Verify webhook was dispatched with correct payload
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "contact.unsubscribed",
      expect.objectContaining({
        contactId: contact.id,
        method: "list_unsubscribe",
        reason: null,
      })
    );
  });
});

describe("Unsubscribe Webhooks - contact.status_changed", () => {
  test("should dispatch contact.status_changed webhook for link unsubscribe", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createSubscribedContact(
      testWorkspace.id,
      `webhook-status-link-${Date.now()}@example.com`
    );

    await unsubscribe(
      {
        contactId: contact.id,
        broadcastId: broadcast.id,
        source: "link",
      },
      "test-job-status-link"
    );

    // Verify webhook was dispatched with correct payload
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "contact.status_changed",
      expect.objectContaining({
        contactId: contact.id,
        previousStatus: "SUBSCRIBED",
        newStatus: "UNSUBSCRIBED",
        reason: "Unsubscribe link clicked",
      })
    );
  });

  test("should dispatch contact.status_changed webhook for list-unsubscribe", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createSubscribedContact(
      testWorkspace.id,
      `webhook-status-list-${Date.now()}@example.com`
    );

    await unsubscribe(
      {
        contactId: contact.id,
        broadcastId: broadcast.id,
        source: "list-unsubscribe",
      },
      "test-job-status-list"
    );

    // Verify webhook was dispatched with correct payload
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "contact.status_changed",
      expect.objectContaining({
        contactId: contact.id,
        previousStatus: "SUBSCRIBED",
        newStatus: "UNSUBSCRIBED",
        reason: "List-Unsubscribe",
      })
    );
  });

  test("should include correct previousStatus when contact was BOUNCED", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);

    // Create contact with BOUNCED status
    const contact = await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: `webhook-bounced-${Date.now()}@example.com`,
        firstName: "Bounced",
        lastName: "User",
        status: "BOUNCED",
      },
    });

    await unsubscribe(
      {
        contactId: contact.id,
        broadcastId: broadcast.id,
        source: "link",
      },
      "test-job-bounced-status"
    );

    // Verify webhook was dispatched with BOUNCED as previousStatus
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "contact.status_changed",
      expect.objectContaining({
        contactId: contact.id,
        previousStatus: "BOUNCED",
        newStatus: "UNSUBSCRIBED",
      })
    );
  });
});

describe("Unsubscribe Webhooks - idempotency", () => {
  test("should NOT dispatch webhooks for already unsubscribed contact", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);

    // Create already unsubscribed contact
    const contact = await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: `webhook-already-unsub-${Date.now()}@example.com`,
        firstName: "Already",
        lastName: "Unsubscribed",
        status: "UNSUBSCRIBED",
        unsubscribedAt: new Date(Date.now() - 86400000),
      },
    });

    await unsubscribe(
      {
        contactId: contact.id,
        broadcastId: broadcast.id,
        source: "link",
      },
      "test-job-idempotent"
    );

    // Verify NO webhooks were dispatched
    expect(mockDispatchWebhook).not.toHaveBeenCalled();
  });

  test("should NOT dispatch webhooks if contact not found", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);

    await unsubscribe(
      {
        contactId: "non-existent-contact-id",
        broadcastId: broadcast.id,
        source: "link",
      },
      "test-job-no-contact"
    );

    // Verify NO webhooks were dispatched
    expect(mockDispatchWebhook).not.toHaveBeenCalled();
  });
});
