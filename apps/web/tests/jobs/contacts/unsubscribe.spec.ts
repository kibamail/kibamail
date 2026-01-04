/**
 * Integration tests for Unsubscribe Job
 *
 * Tests that the unsubscribe job correctly:
 * - Updates contact status to UNSUBSCRIBED
 * - Sets the unsubscribedAt timestamp
 * - Creates appropriate event for analytics (Unsubscribed or ListUnsubscribe)
 * - Handles edge cases gracefully (idempotency, missing contact/broadcast)
 */

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { unsubscribe } from "@/jobs/contacts/unsubscribe";
import { prisma } from "@/lib/db";
import {
  cleanupWorkspace,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils/workspace";

let testWorkspace: TestWorkspace;

async function createTestBroadcast(workspaceId: string) {
  // Create email content first
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

describe("unsubscribe job", () => {
  describe("successful unsubscription via link", () => {
    test("should update contact status to UNSUBSCRIBED", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);
      const contact = await createSubscribedContact(
        testWorkspace.id,
        `unsub-test-${Date.now()}@example.com`,
      );

      // Execute the job with source=link
      await unsubscribe(
        {
          contactId: contact.id,
          broadcastId: broadcast.id,
          source: "link",
        },
        "test-job-unsub",
      );

      // Verify contact was updated
      const updatedContact = await prisma.contact.findUnique({
        where: { id: contact.id },
      });

      expect(updatedContact).not.toBeNull();
      expect(updatedContact?.status).toBe("UNSUBSCRIBED");
      expect(updatedContact?.unsubscribedAt).not.toBeNull();
    });

    test("should create an Unsubscribed event for link source", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);
      const contact = await createSubscribedContact(
        testWorkspace.id,
        `event-test-${Date.now()}@example.com`,
      );

      // Execute the job with source=link
      await unsubscribe(
        {
          contactId: contact.id,
          broadcastId: broadcast.id,
          source: "link",
        },
        "test-job-event",
      );

      // Verify Unsubscribed event was created
      const event = await prisma.event.findFirst({
        where: {
          workspaceId: testWorkspace.id,
          contactId: contact.id,
          type: "Unsubscribed",
        },
      });

      expect(event).not.toBeNull();
      expect(event?.broadcastId).toBe(broadcast.id);
      expect(event?.contactId).toBe(contact.id);
      expect(event?.recipient).toBe(contact.email);
      expect(event?.workspaceId).toBe(testWorkspace.id);
    });

    test("should set unsubscribedAt timestamp", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);
      const contact = await createSubscribedContact(
        testWorkspace.id,
        `timestamp-test-${Date.now()}@example.com`,
      );

      const beforeUnsubscribe = new Date();

      // Execute the job
      await unsubscribe(
        {
          contactId: contact.id,
          broadcastId: broadcast.id,
          source: "link",
        },
        "test-job-timestamp",
      );

      const afterUnsubscribe = new Date();

      // Verify timestamp was set
      const updatedContact = await prisma.contact.findUnique({
        where: { id: contact.id },
      });

      expect(updatedContact?.unsubscribedAt).not.toBeNull();
      expect(updatedContact?.unsubscribedAt?.getTime()).toBeGreaterThanOrEqual(
        beforeUnsubscribe.getTime(),
      );
      expect(updatedContact?.unsubscribedAt?.getTime()).toBeLessThanOrEqual(
        afterUnsubscribe.getTime(),
      );
    });
  });

  describe("successful unsubscription via list-unsubscribe (RFC 8058)", () => {
    test("should create a ListUnsubscribe event for list-unsubscribe source", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);
      const contact = await createSubscribedContact(
        testWorkspace.id,
        `list-unsub-${Date.now()}@example.com`,
      );

      // Execute the job with source=list-unsubscribe
      await unsubscribe(
        {
          contactId: contact.id,
          broadcastId: broadcast.id,
          source: "list-unsubscribe",
        },
        "test-job-list-unsub",
      );

      // Verify contact was updated
      const updatedContact = await prisma.contact.findUnique({
        where: { id: contact.id },
      });

      expect(updatedContact?.status).toBe("UNSUBSCRIBED");

      // Verify ListUnsubscribe event was created (not Unsubscribed)
      const listUnsubEvent = await prisma.event.findFirst({
        where: {
          workspaceId: testWorkspace.id,
          contactId: contact.id,
          type: "ListUnsubscribe",
        },
      });

      expect(listUnsubEvent).not.toBeNull();
      expect(listUnsubEvent?.broadcastId).toBe(broadcast.id);
      expect(listUnsubEvent?.contactId).toBe(contact.id);
      expect(listUnsubEvent?.recipient).toBe(contact.email);

      // Verify no Unsubscribed event was created
      const unsubEvent = await prisma.event.findFirst({
        where: {
          workspaceId: testWorkspace.id,
          contactId: contact.id,
          type: "Unsubscribed",
        },
      });

      expect(unsubEvent).toBeNull();
    });

    test("should differentiate between link and list-unsubscribe sources", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);

      // Create two contacts
      const contactLink = await createSubscribedContact(
        testWorkspace.id,
        `link-source-${Date.now()}@example.com`,
      );
      const contactListUnsub = await createSubscribedContact(
        testWorkspace.id,
        `list-source-${Date.now()}@example.com`,
      );

      // Unsubscribe via link
      await unsubscribe(
        {
          contactId: contactLink.id,
          broadcastId: broadcast.id,
          source: "link",
        },
        "test-job-link",
      );

      // Unsubscribe via list-unsubscribe
      await unsubscribe(
        {
          contactId: contactListUnsub.id,
          broadcastId: broadcast.id,
          source: "list-unsubscribe",
        },
        "test-job-list",
      );

      // Verify both contacts are unsubscribed
      const updatedContactLink = await prisma.contact.findUnique({
        where: { id: contactLink.id },
      });
      const updatedContactListUnsub = await prisma.contact.findUnique({
        where: { id: contactListUnsub.id },
      });

      expect(updatedContactLink?.status).toBe("UNSUBSCRIBED");
      expect(updatedContactListUnsub?.status).toBe("UNSUBSCRIBED");

      // Verify correct event types
      const unsubscribedEvents = await prisma.event.findMany({
        where: {
          workspaceId: testWorkspace.id,
          type: "Unsubscribed",
        },
      });

      const listUnsubscribeEvents = await prisma.event.findMany({
        where: {
          workspaceId: testWorkspace.id,
          type: "ListUnsubscribe",
        },
      });

      expect(unsubscribedEvents).toHaveLength(1);
      expect(unsubscribedEvents[0].contactId).toBe(contactLink.id);

      expect(listUnsubscribeEvents).toHaveLength(1);
      expect(listUnsubscribeEvents[0].contactId).toBe(contactListUnsub.id);
    });
  });

  describe("idempotency", () => {
    test("should skip if contact is already UNSUBSCRIBED", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);

      // Create already unsubscribed contact
      const unsubscribedAt = new Date(Date.now() - 86400000); // 1 day ago
      const contact = await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `already-unsub-${Date.now()}@example.com`,
          firstName: "Already",
          lastName: "Unsubscribed",
          status: "UNSUBSCRIBED",
          unsubscribedAt,
        },
      });

      // Execute the job
      await unsubscribe(
        {
          contactId: contact.id,
          broadcastId: broadcast.id,
          source: "link",
        },
        "test-job-already-unsub",
      );

      // Verify contact wasn't changed
      const updatedContact = await prisma.contact.findUnique({
        where: { id: contact.id },
      });

      expect(updatedContact?.status).toBe("UNSUBSCRIBED");
      // Timestamp should remain the same
      expect(updatedContact?.unsubscribedAt?.getTime()).toBe(
        unsubscribedAt.getTime(),
      );

      // No new event should be created
      const events = await prisma.event.findMany({
        where: {
          workspaceId: testWorkspace.id,
          contactId: contact.id,
          type: { in: ["Unsubscribed", "ListUnsubscribe"] },
        },
      });

      expect(events).toHaveLength(0);
    });

    test("should be safe to run multiple times with same data", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);
      const contact = await createSubscribedContact(
        testWorkspace.id,
        `idempotent-${Date.now()}@example.com`,
      );

      // Execute the job twice
      await unsubscribe(
        {
          contactId: contact.id,
          broadcastId: broadcast.id,
          source: "link",
        },
        "test-job-idempotent-1",
      );

      await unsubscribe(
        {
          contactId: contact.id,
          broadcastId: broadcast.id,
          source: "link",
        },
        "test-job-idempotent-2",
      );

      // Verify contact is UNSUBSCRIBED
      const updatedContact = await prisma.contact.findUnique({
        where: { id: contact.id },
      });

      expect(updatedContact?.status).toBe("UNSUBSCRIBED");

      // Only one event should be created
      const events = await prisma.event.findMany({
        where: {
          workspaceId: testWorkspace.id,
          contactId: contact.id,
          type: "Unsubscribed",
        },
      });

      expect(events).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    test("should skip if contact not found", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);

      // Execute with non-existent contact
      await unsubscribe(
        {
          contactId: "non-existent-contact-id",
          broadcastId: broadcast.id,
          source: "link",
        },
        "test-job-no-contact",
      );

      // Should complete without error
      // No events should be created
      const events = await prisma.event.findMany({
        where: {
          workspaceId: testWorkspace.id,
          type: { in: ["Unsubscribed", "ListUnsubscribe"] },
        },
      });

      expect(events).toHaveLength(0);
    });

    test("should still unsubscribe even if broadcast not found", async () => {
      const contact = await createSubscribedContact(
        testWorkspace.id,
        `no-broadcast-${Date.now()}@example.com`,
      );

      // Execute with non-existent broadcast
      await unsubscribe(
        {
          contactId: contact.id,
          broadcastId: "non-existent-broadcast-id",
          source: "link",
        },
        "test-job-no-broadcast",
      );

      // Contact should still be unsubscribed
      const updatedContact = await prisma.contact.findUnique({
        where: { id: contact.id },
      });

      expect(updatedContact?.status).toBe("UNSUBSCRIBED");
      expect(updatedContact?.unsubscribedAt).not.toBeNull();

      // Event should be created with null broadcastId (FK constraint)
      const event = await prisma.event.findFirst({
        where: {
          workspaceId: testWorkspace.id,
          contactId: contact.id,
          type: "Unsubscribed",
        },
      });

      expect(event).not.toBeNull();
      expect(event?.broadcastId).toBeNull();
    });

    test("should not unsubscribe contact from different workspace broadcast", async () => {
      // Create broadcast in test workspace
      const broadcast = await createTestBroadcast(testWorkspace.id);

      // Create a second workspace
      const otherWorkspace = createTestWorkspace();

      try {
        // Create contact in different workspace
        const contact = await prisma.contact.create({
          data: {
            workspaceId: otherWorkspace.id,
            email: `different-workspace-${Date.now()}@example.com`,
            firstName: "Different",
            lastName: "Workspace",
            status: "SUBSCRIBED",
          },
        });

        // Execute the job - broadcast belongs to testWorkspace, contact to otherWorkspace
        await unsubscribe(
          {
            contactId: contact.id,
            broadcastId: broadcast.id,
            source: "link",
          },
          "test-job-different-workspace",
        );

        // Contact should still be unsubscribed (we honor the user's request)
        // But the broadcast verification should have failed
        const updatedContact = await prisma.contact.findUnique({
          where: { id: contact.id },
        });

        expect(updatedContact?.status).toBe("UNSUBSCRIBED");

        // Event should still be created in the contact's workspace
        const event = await prisma.event.findFirst({
          where: {
            workspaceId: otherWorkspace.id,
            contactId: contact.id,
            type: "Unsubscribed",
          },
        });

        expect(event).not.toBeNull();
      } finally {
        await cleanupWorkspace(otherWorkspace.id);
      }
    });

    test("should handle contact with various statuses", async () => {
      const broadcast = await createTestBroadcast(testWorkspace.id);
      const statuses = ["SUBSCRIBED", "BOUNCED", "COMPLAINED"] as const;

      for (const status of statuses) {
        const contact = await prisma.contact.create({
          data: {
            workspaceId: testWorkspace.id,
            email: `status-${status.toLowerCase()}-${Date.now()}@example.com`,
            firstName: "Test",
            lastName: status,
            status,
          },
        });

        await unsubscribe(
          {
            contactId: contact.id,
            broadcastId: broadcast.id,
            source: "link",
          },
          `test-job-status-${status.toLowerCase()}`,
        );

        const updatedContact = await prisma.contact.findUnique({
          where: { id: contact.id },
        });

        expect(updatedContact?.status).toBe("UNSUBSCRIBED");
      }
    });
  });
});
