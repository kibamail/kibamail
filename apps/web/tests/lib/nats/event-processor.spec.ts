/**
 * Integration tests for NATS Event Processor
 *
 * These tests verify that email events are correctly inserted into
 * the database and that side effects (suppressions, etc.) are handled.
 *
 * Prerequisites:
 * - Database running and migrated
 */

import { describe, expect, test, beforeAll, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  bulkInsertEvents,
  processEventsWithSideEffects,
} from "@/lib/nats/event-processor";
import type { EmailEvent } from "@/lib/nats/event-types";

const TEST_WORKSPACE_ID = "test-workspace-processor-123";

/**
 * Create a test email event
 */
function createTestEvent(overrides: Partial<EmailEvent> = {}): EmailEvent {
  const id = `test-proc-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return {
    type: "Delivery",
    sending_id: id,
    recipient: `test-${id}@example.com`,
    tenant_id: TEST_WORKSPACE_ID,
    // Set to empty string for tests - will be stored as null in DB
    // since there's no foreign key constraint on empty strings
    broadcast_id: "",
    contact_id: "",
    response: {
      code: 250,
      enhanced_code: { class: 2, subject: 0, detail: 0 },
      content: "250 2.0.0 OK",
      command: ".",
    },
    bounce_classification: "Uncategorized",
    timestamp: new Date().toISOString(),
    node_id: "test-node-001",
    ...overrides,
  };
}

describe("Event Processor Tests", () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.event.deleteMany({
      where: { workspaceId: TEST_WORKSPACE_ID },
    });
    await prisma.suppressionList.deleteMany({
      where: { workspaceId: TEST_WORKSPACE_ID },
    });
  });

  beforeEach(async () => {
    // Clean up before each test
    await prisma.event.deleteMany({
      where: { workspaceId: TEST_WORKSPACE_ID },
    });
    await prisma.suppressionList.deleteMany({
      where: { workspaceId: TEST_WORKSPACE_ID },
    });
  });

  afterAll(async () => {
    // Final cleanup
    await prisma.event.deleteMany({
      where: { workspaceId: TEST_WORKSPACE_ID },
    });
    await prisma.suppressionList.deleteMany({
      where: { workspaceId: TEST_WORKSPACE_ID },
    });
  });

  describe("Bulk Insert", () => {
    test("should insert a single event", async () => {
      const event = createTestEvent();
      const count = await bulkInsertEvents([event]);

      expect(count).toBe(1);

      const inserted = await prisma.event.findFirst({
        where: { sendingId: event.sending_id },
      });

      expect(inserted).not.toBeNull();
      expect(inserted?.type).toBe("Delivery");
      expect(inserted?.recipient).toBe(event.recipient);
      expect(inserted?.workspaceId).toBe(TEST_WORKSPACE_ID);
      expect(inserted?.responseCode).toBe(250);
    });

    test("should insert multiple events in batch", async () => {
      const events = Array.from({ length: 50 }, (_, i) =>
        createTestEvent({ sending_id: `batch-${Date.now()}-${i}` })
      );

      const count = await bulkInsertEvents(events);

      expect(count).toBe(50);

      const insertedCount = await prisma.event.count({
        where: { workspaceId: TEST_WORKSPACE_ID },
      });

      expect(insertedCount).toBe(50);
    });

    test("should handle empty batch", async () => {
      const count = await bulkInsertEvents([]);
      expect(count).toBe(0);
    });

    test("should allow duplicate events (no unique constraint on sendingId)", async () => {
      const event = createTestEvent();

      // Insert first time
      const count1 = await bulkInsertEvents([event]);
      expect(count1).toBe(1);

      // Insert again - will insert since sendingId is not unique
      // Note: In production, KumoMTA generates unique sending_ids per message
      // Duplicates should be filtered at the consumer level using message deduplication
      const count2 = await bulkInsertEvents([event]);
      expect(count2).toBe(1);

      // Should have 2 events since there's no unique constraint
      const totalCount = await prisma.event.count({
        where: { sendingId: event.sending_id },
      });
      expect(totalCount).toBe(2);
    });

    test("should correctly map all event types", async () => {
      const eventTypes: EmailEvent["type"][] = [
        "Delivery",
        "Bounce",
        "TransientFailure",
        "Feedback",
        "Reception",
        "Expiration",
        "AdminBounce",
        "OOB",
        "Rejection",
      ];

      const events = eventTypes.map((type) =>
        createTestEvent({ type, sending_id: `type-${type}-${Date.now()}` })
      );

      await bulkInsertEvents(events);

      for (const type of eventTypes) {
        const event = await prisma.event.findFirst({
          where: {
            workspaceId: TEST_WORKSPACE_ID,
            type,
          },
        });
        expect(event).not.toBeNull();
        expect(event?.type).toBe(type);
      }
    });

    test("should correctly store response details", async () => {
      const event = createTestEvent({
        response: {
          code: 550,
          enhanced_code: { class: 5, subject: 1, detail: 1 },
          content: "550 5.1.1 User unknown",
          command: "RCPT TO",
        },
      });

      await bulkInsertEvents([event]);

      const inserted = await prisma.event.findFirst({
        where: { sendingId: event.sending_id },
      });

      expect(inserted?.responseCode).toBe(550);
      expect(inserted?.responseContent).toBe("550 5.1.1 User unknown");
      expect(inserted?.responseCommand).toBe("RCPT TO");
      expect(inserted?.responseEnhancedCodeClass).toBe(5);
      expect(inserted?.responseEnhancedCodeSubject).toBe(1);
      expect(inserted?.responseEnhancedCodeDetail).toBe(1);
    });

    test("should handle null enhanced_code", async () => {
      const event = createTestEvent({
        response: {
          code: 250,
          content: "OK",
        },
      });

      await bulkInsertEvents([event]);

      const inserted = await prisma.event.findFirst({
        where: { sendingId: event.sending_id },
      });

      expect(inserted?.responseCode).toBe(250);
      expect(inserted?.responseEnhancedCodeClass).toBeNull();
    });
  });

  describe("Side Effects Processing", () => {
    test("should create suppression for hard bounce", async () => {
      const event = createTestEvent({
        type: "Bounce",
        bounce_classification: "InvalidRecipient",
        recipient: "bounced@example.com",
      });

      await processEventsWithSideEffects([event]);

      // Check event was inserted
      const insertedEvent = await prisma.event.findFirst({
        where: { sendingId: event.sending_id },
      });
      expect(insertedEvent).not.toBeNull();

      // Check suppression was created
      const suppression = await prisma.suppressionList.findFirst({
        where: {
          workspaceId: TEST_WORKSPACE_ID,
          email: "bounced@example.com",
          reason: "BOUNCED",
        },
      });
      expect(suppression).not.toBeNull();
      expect(suppression?.scope).toBe("GLOBAL");
    });

    test("should create suppression for complaint", async () => {
      const event = createTestEvent({
        type: "Feedback",
        recipient: "complained@example.com",
      });

      await processEventsWithSideEffects([event]);

      // Check suppression was created
      const suppression = await prisma.suppressionList.findFirst({
        where: {
          workspaceId: TEST_WORKSPACE_ID,
          email: "complained@example.com",
          reason: "COMPLAINED",
        },
      });
      expect(suppression).not.toBeNull();
      expect(suppression?.notes).toBe("MTA Feedback Loop");
    });

    test("should not create suppression for soft bounce", async () => {
      const event = createTestEvent({
        type: "TransientFailure",
        bounce_classification: "TransientFailure",
        recipient: "softbounce@example.com",
      });

      await processEventsWithSideEffects([event]);

      // Check no suppression was created
      const suppression = await prisma.suppressionList.findFirst({
        where: {
          workspaceId: TEST_WORKSPACE_ID,
          email: "softbounce@example.com",
        },
      });
      expect(suppression).toBeNull();
    });

    test("should not create suppression for delivery", async () => {
      const event = createTestEvent({
        type: "Delivery",
        recipient: "delivered@example.com",
      });

      await processEventsWithSideEffects([event]);

      // Check no suppression was created
      const suppression = await prisma.suppressionList.findFirst({
        where: {
          workspaceId: TEST_WORKSPACE_ID,
          email: "delivered@example.com",
        },
      });
      expect(suppression).toBeNull();
    });

    test("should handle multiple bounce classifications", async () => {
      const permanentBounces = [
        "InvalidRecipient",
        "BadDomain",
        "InactiveMailbox",
        "InvalidSender",
      ];

      const events = permanentBounces.map((classification, i) =>
        createTestEvent({
          type: "Bounce",
          bounce_classification: classification,
          recipient: `permanent-${i}@example.com`,
        })
      );

      await processEventsWithSideEffects(events);

      // All should have suppressions
      for (let i = 0; i < permanentBounces.length; i++) {
        const suppression = await prisma.suppressionList.findFirst({
          where: {
            workspaceId: TEST_WORKSPACE_ID,
            email: `permanent-${i}@example.com`,
          },
        });
        expect(suppression).not.toBeNull();
      }
    });

    test("should handle AdminBounce like Bounce", async () => {
      const event = createTestEvent({
        type: "AdminBounce",
        bounce_classification: "InvalidRecipient",
        recipient: "adminbounced@example.com",
      });

      await processEventsWithSideEffects([event]);

      const suppression = await prisma.suppressionList.findFirst({
        where: {
          workspaceId: TEST_WORKSPACE_ID,
          email: "adminbounced@example.com",
        },
      });
      expect(suppression).not.toBeNull();
    });
  });

  describe("Performance", () => {
    test("should efficiently insert large batches", async () => {
      const batchSize = 500;
      const events = Array.from({ length: batchSize }, (_, i) =>
        createTestEvent({
          sending_id: `perf-${Date.now()}-${i}`,
          recipient: `perf-${i}@example.com`,
        })
      );

      const startTime = Date.now();
      const count = await bulkInsertEvents(events);
      const duration = Date.now() - startTime;

      expect(count).toBe(batchSize);

      // Should complete in reasonable time (< 5 seconds for 500 events)
      expect(duration).toBeLessThan(5000);

      console.log(
        `Inserted ${batchSize} events in ${duration}ms (${Math.round(
          (batchSize / duration) * 1000
        )} events/sec)`
      );
    });
  });
});
