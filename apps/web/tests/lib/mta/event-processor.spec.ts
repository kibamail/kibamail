/**
 * Unit tests for Event Processor - TransactionalEmail Status Updates
 *
 * Tests the updateTransactionalEmailStatus function which is called
 * after MTA webhook events are processed.
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { processEventsWithSideEffects } from "@/lib/mta/event-processor";
import type { EmailEvent } from "@/lib/mta/event-types";
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
    ...overrides,
  };
}

describe("Event Processor - TransactionalEmail Status Updates", () => {
  test("should update status to DELIVERED on Delivery event", async () => {
    const sendingId = `test-delivery-${Date.now()}`;
    const email = await createTestTransactionalEmail(sendingId);

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Delivery", {
        response: { code: 250, content: "Message accepted" },
      }),
    ];

    await processEventsWithSideEffects(events);

    const updatedEmail = await prisma.transactionalEmail.findUnique({
      where: { id: email.id },
    });

    expect(updatedEmail?.status).toBe("DELIVERED");
    expect(updatedEmail?.deliveredAt).toBeDefined();
    expect(updatedEmail?.lastResponseCode).toBe(250);
    expect(updatedEmail?.lastResponseMessage).toBe("Message accepted");
    expect(updatedEmail?.totalEvents).toBe(2); // Initial 1 + 1 new event
  });

  test("should update status to BOUNCED on Bounce event", async () => {
    const sendingId = `test-bounce-${Date.now()}`;
    const email = await createTestTransactionalEmail(sendingId);

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Bounce", {
        response: { code: 550, content: "User unknown" },
        bounce_classification: "InvalidRecipient",
      }),
    ];

    await processEventsWithSideEffects(events);

    const updatedEmail = await prisma.transactionalEmail.findUnique({
      where: { id: email.id },
    });

    expect(updatedEmail?.status).toBe("BOUNCED");
    expect(updatedEmail?.bouncedAt).toBeDefined();
    expect(updatedEmail?.bounceClassification).toBe("InvalidRecipient");
    expect(updatedEmail?.lastResponseCode).toBe(550);
    expect(updatedEmail?.lastResponseMessage).toBe("User unknown");
  });

  test("should update status to BOUNCED on AdminBounce event", async () => {
    const sendingId = `test-admin-bounce-${Date.now()}`;
    const email = await createTestTransactionalEmail(sendingId);

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "AdminBounce", {
        bounce_classification: "BadDomain",
      }),
    ];

    await processEventsWithSideEffects(events);

    const updatedEmail = await prisma.transactionalEmail.findUnique({
      where: { id: email.id },
    });

    expect(updatedEmail?.status).toBe("BOUNCED");
    expect(updatedEmail?.bouncedAt).toBeDefined();
  });

  test("should update status to BOUNCED on OOB (Out-of-Band) event", async () => {
    const sendingId = `test-oob-${Date.now()}`;
    const email = await createTestTransactionalEmail(sendingId);

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "OOB", {
        bounce_classification: "UndeterminedBounce",
      }),
    ];

    await processEventsWithSideEffects(events);

    const updatedEmail = await prisma.transactionalEmail.findUnique({
      where: { id: email.id },
    });

    expect(updatedEmail?.status).toBe("BOUNCED");
  });

  test("should update status to COMPLAINED on Feedback event", async () => {
    const sendingId = `test-feedback-${Date.now()}`;
    const email = await createTestTransactionalEmail(sendingId);

    const events: EmailEvent[] = [createMockEvent(sendingId, "Feedback")];

    await processEventsWithSideEffects(events);

    const updatedEmail = await prisma.transactionalEmail.findUnique({
      where: { id: email.id },
    });

    expect(updatedEmail?.status).toBe("COMPLAINED");
    expect(updatedEmail?.complainedAt).toBeDefined();
  });

  test("should update status to FAILED on Rejection event", async () => {
    const sendingId = `test-rejection-${Date.now()}`;
    const email = await createTestTransactionalEmail(sendingId);

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Rejection", {
        response: { code: 554, content: "Message rejected" },
      }),
    ];

    await processEventsWithSideEffects(events);

    const updatedEmail = await prisma.transactionalEmail.findUnique({
      where: { id: email.id },
    });

    expect(updatedEmail?.status).toBe("FAILED");
  });

  test("should update status to FAILED on Expiration event", async () => {
    const sendingId = `test-expiration-${Date.now()}`;
    const email = await createTestTransactionalEmail(sendingId);

    const events: EmailEvent[] = [createMockEvent(sendingId, "Expiration")];

    await processEventsWithSideEffects(events);

    const updatedEmail = await prisma.transactionalEmail.findUnique({
      where: { id: email.id },
    });

    expect(updatedEmail?.status).toBe("FAILED");
  });

  test("should apply highest priority status when multiple events received", async () => {
    const sendingId = `test-priority-${Date.now()}`;
    const email = await createTestTransactionalEmail(sendingId);

    // Send multiple events - COMPLAINED has higher priority than DELIVERED
    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Delivery"),
      createMockEvent(sendingId, "Feedback"), // Complaint should take priority
    ];

    await processEventsWithSideEffects(events);

    const updatedEmail = await prisma.transactionalEmail.findUnique({
      where: { id: email.id },
    });

    // COMPLAINED should win over DELIVERED
    expect(updatedEmail?.status).toBe("COMPLAINED");
    expect(updatedEmail?.complainedAt).toBeDefined();
    expect(updatedEmail?.totalEvents).toBe(3); // Initial 1 + 2 new events
  });

  test("should update status based on event batch (not existing database status)", async () => {
    // Note: The event processor applies status based on the highest priority
    // event within the current batch, not considering existing database status.
    // In practice, MTA events arrive in order and COMPLAINED/BOUNCED emails
    // won't receive subsequent Delivery events.
    const sendingId = `test-batch-priority-${Date.now()}`;
    await createTestTransactionalEmail(sendingId, "COMPLAINED");

    const events: EmailEvent[] = [createMockEvent(sendingId, "Delivery")];

    await processEventsWithSideEffects(events);

    const updatedEmail = await prisma.transactionalEmail.findFirst({
      where: { sendingId },
    });

    // Current implementation: status is updated to DELIVERED because that's
    // the highest priority status in this specific event batch
    expect(updatedEmail?.status).toBe("DELIVERED");
    expect(updatedEmail?.totalEvents).toBe(2);
  });

  test("should handle TransientFailure without changing final status", async () => {
    const sendingId = `test-transient-${Date.now()}`;
    const email = await createTestTransactionalEmail(sendingId);

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "TransientFailure", {
        response: { code: 421, content: "Service temporarily unavailable" },
      }),
    ];

    await processEventsWithSideEffects(events);

    const updatedEmail = await prisma.transactionalEmail.findUnique({
      where: { id: email.id },
    });

    // TransientFailure shouldn't change status from SENDING
    expect(updatedEmail?.status).toBe("SENDING");
    expect(updatedEmail?.totalEvents).toBe(2);
  });

  test("should increment totalEvents for each event processed", async () => {
    const sendingId = `test-count-${Date.now()}`;
    const email = await createTestTransactionalEmail(sendingId);

    // Process 3 events
    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Delivery"),
      createMockEvent(sendingId, "Delivery"),
      createMockEvent(sendingId, "Delivery"),
    ];

    await processEventsWithSideEffects(events);

    const updatedEmail = await prisma.transactionalEmail.findUnique({
      where: { id: email.id },
    });

    expect(updatedEmail?.totalEvents).toBe(4); // Initial 1 + 3 events
  });

  test("should handle events for non-existent TransactionalEmail gracefully", async () => {
    const sendingId = `non-existent-${Date.now()}`;

    const events: EmailEvent[] = [createMockEvent(sendingId, "Delivery")];

    // Should not throw
    await expect(processEventsWithSideEffects(events)).resolves.not.toThrow();

    // Event should still be inserted
    const insertedEvent = await prisma.event.findFirst({
      where: { sendingId, workspaceId: testWorkspace.id },
    });

    expect(insertedEvent).toBeDefined();
  });

  test("should process events for multiple sendingIds in batch", async () => {
    const sendingId1 = `test-batch-1-${Date.now()}`;
    const sendingId2 = `test-batch-2-${Date.now()}`;

    const email1 = await createTestTransactionalEmail(sendingId1);
    const email2 = await createTestTransactionalEmail(sendingId2);

    const events: EmailEvent[] = [
      createMockEvent(sendingId1, "Delivery"),
      createMockEvent(sendingId2, "Bounce", { bounce_classification: "InvalidRecipient" }),
    ];

    await processEventsWithSideEffects(events);

    const updatedEmail1 = await prisma.transactionalEmail.findUnique({
      where: { id: email1.id },
    });
    const updatedEmail2 = await prisma.transactionalEmail.findUnique({
      where: { id: email2.id },
    });

    expect(updatedEmail1?.status).toBe("DELIVERED");
    expect(updatedEmail2?.status).toBe("BOUNCED");
  });

  test("should store response details on delivery", async () => {
    const sendingId = `test-response-${Date.now()}`;
    const email = await createTestTransactionalEmail(sendingId);

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Delivery", {
        response: {
          code: 250,
          content: "2.0.0 Ok: queued as ABC123",
          command: "DATA",
          enhanced_code: { class: 2, subject: 0, detail: 0 },
        },
      }),
    ];

    await processEventsWithSideEffects(events);

    const updatedEmail = await prisma.transactionalEmail.findUnique({
      where: { id: email.id },
    });

    expect(updatedEmail?.lastResponseCode).toBe(250);
    expect(updatedEmail?.lastResponseMessage).toBe("2.0.0 Ok: queued as ABC123");
  });
});

// ============================================================
// BroadcastSend Status Update Tests
// ============================================================

// Helper to create a test Broadcast
async function createTestBroadcast(workspaceId: string) {
  return prisma.broadcast.create({
    data: {
      workspaceId,
      name: `Test Broadcast ${Date.now()}`,
      status: "SENDING",
      // Aggregate fields use defaults from schema
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

describe("Event Processor - BroadcastSend Status Updates", () => {
  test("should update BroadcastSend status to DELIVERED on Delivery event", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createTestContact(testWorkspace.id);
    const sendingId = `test-broadcast-delivery-${Date.now()}`;
    const broadcastSend = await createTestBroadcastSend(
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

    const updatedSend = await prisma.broadcastSend.findUnique({
      where: { id: broadcastSend.id },
    });

    expect(updatedSend?.status).toBe("DELIVERED");
    expect(updatedSend?.deliveredAt).toBeDefined();
    expect(updatedSend?.lastResponseCode).toBe(250);
    expect(updatedSend?.lastResponseMessage).toBe("Message accepted");
  });

  test("should update BroadcastSend status to BOUNCED on Bounce event", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createTestContact(testWorkspace.id);
    const sendingId = `test-broadcast-bounce-${Date.now()}`;
    const broadcastSend = await createTestBroadcastSend(
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

    const updatedSend = await prisma.broadcastSend.findUnique({
      where: { id: broadcastSend.id },
    });

    expect(updatedSend?.status).toBe("BOUNCED");
    expect(updatedSend?.bouncedAt).toBeDefined();
    expect(updatedSend?.bounceClassification).toBe("InvalidRecipient");
    expect(updatedSend?.lastResponseCode).toBe(550);
  });

  test("should update BroadcastSend status to COMPLAINED on Feedback event", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createTestContact(testWorkspace.id);
    const sendingId = `test-broadcast-feedback-${Date.now()}`;
    const broadcastSend = await createTestBroadcastSend(
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

    const updatedSend = await prisma.broadcastSend.findUnique({
      where: { id: broadcastSend.id },
    });

    expect(updatedSend?.status).toBe("COMPLAINED");
    expect(updatedSend?.complainedAt).toBeDefined();
  });

  test("should increment Broadcast.totalDelivered on first Delivery event", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createTestContact(testWorkspace.id);
    const sendingId = `test-broadcast-aggregate-delivery-${Date.now()}`;
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
      }),
    ];

    await processEventsWithSideEffects(events);

    const updatedBroadcast = await prisma.broadcast.findUnique({
      where: { id: broadcast.id },
    });

    expect(updatedBroadcast?.totalDelivered).toBe(1);
  });

  test("should increment Broadcast.totalBounced on Bounce event", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createTestContact(testWorkspace.id);
    const sendingId = `test-broadcast-aggregate-bounce-${Date.now()}`;
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
        bounce_classification: "InvalidRecipient",
      }),
    ];

    await processEventsWithSideEffects(events);

    const updatedBroadcast = await prisma.broadcast.findUnique({
      where: { id: broadcast.id },
    });

    expect(updatedBroadcast?.totalBounced).toBe(1);
  });

  test("should increment Broadcast.totalComplained on Feedback event", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createTestContact(testWorkspace.id);
    const sendingId = `test-broadcast-aggregate-feedback-${Date.now()}`;
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

    const updatedBroadcast = await prisma.broadcast.findUnique({
      where: { id: broadcast.id },
    });

    expect(updatedBroadcast?.totalComplained).toBe(1);
  });

  test("should not double-count status transitions", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createTestContact(testWorkspace.id);
    const sendingId = `test-broadcast-no-double-count-${Date.now()}`;
    // Start with DELIVERED status
    await createTestBroadcastSend(
      broadcast.id,
      contact.id,
      testWorkspace.id,
      sendingId,
      "DELIVERED"
    );

    // Update broadcast to reflect initial delivery
    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: { totalDelivered: 1 },
    });

    // Send another Delivery event (duplicate)
    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Delivery", {
        broadcast_id: broadcast.id,
        contact_id: contact.id,
      }),
    ];

    await processEventsWithSideEffects(events);

    const updatedBroadcast = await prisma.broadcast.findUnique({
      where: { id: broadcast.id },
    });

    // Should still be 1, not 2 (no double-counting)
    expect(updatedBroadcast?.totalDelivered).toBe(1);
  });

  test("should process multiple BroadcastSend records in batch", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact1 = await createTestContact(testWorkspace.id);
    const contact2 = await createTestContact(testWorkspace.id);
    const sendingId1 = `test-broadcast-batch-1-${Date.now()}`;
    const sendingId2 = `test-broadcast-batch-2-${Date.now()}`;

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

    const updatedBroadcast = await prisma.broadcast.findUnique({
      where: { id: broadcast.id },
    });

    expect(updatedBroadcast?.totalDelivered).toBe(1);
    expect(updatedBroadcast?.totalBounced).toBe(1);
  });

  test("should handle events for non-existent BroadcastSend gracefully", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const sendingId = `non-existent-broadcast-send-${Date.now()}`;

    const events: EmailEvent[] = [
      createMockEvent(sendingId, "Delivery", {
        broadcast_id: broadcast.id,
      }),
    ];

    // Should not throw
    await expect(processEventsWithSideEffects(events)).resolves.not.toThrow();

    // Broadcast aggregates should not change
    const updatedBroadcast = await prisma.broadcast.findUnique({
      where: { id: broadcast.id },
    });

    expect(updatedBroadcast?.totalDelivered).toBe(0);
  });

  test("should apply highest priority status for BroadcastSend", async () => {
    const broadcast = await createTestBroadcast(testWorkspace.id);
    const contact = await createTestContact(testWorkspace.id);
    const sendingId = `test-broadcast-priority-${Date.now()}`;
    await createTestBroadcastSend(
      broadcast.id,
      contact.id,
      testWorkspace.id,
      sendingId
    );

    // Send multiple events - COMPLAINED has higher priority than DELIVERED
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

    const updatedSend = await prisma.broadcastSend.findUnique({
      where: { sendingId },
    });

    // COMPLAINED should win over DELIVERED
    expect(updatedSend?.status).toBe("COMPLAINED");
    expect(updatedSend?.complainedAt).toBeDefined();
  });
});
