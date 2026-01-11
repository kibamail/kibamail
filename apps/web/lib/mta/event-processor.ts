/**
 * Event Processor
 *
 * Handles bulk insertion of email events into the database.
 * Optimized for high-throughput ingestion from MTA webhooks.
 * Also updates TransactionalEmail records with status changes.
 */

import type { EventType, Prisma, TransactionalEmailStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { queueLogger } from "@/lib/queue";
import type { EmailEvent } from "./event-types";
import { mapEventType } from "./event-types";

const logger = queueLogger.child({ module: "mta-event-processor" });

/**
 * Check if a string looks like a valid CUID (starts with 'c' and has reasonable length)
 */
function isValidCuid(value: string | undefined | null): boolean {
  if (!value || value.length < 20 || value.length > 30) return false;
  // CUIDs start with 'c', but we also accept other ID formats that start with letters
  return /^[a-z][a-z0-9]+$/i.test(value);
}

/**
 * Transform an EmailEvent to a Prisma Event create input
 */
function transformEvent(event: EmailEvent): Prisma.EventCreateManyInput {
  const eventType = mapEventType(event.type) as EventType;

  // Convert empty strings to null for optional foreign key fields
  // Also validate that IDs look like valid CUIDs to prevent FK violations
  const broadcastId =
    event.broadcast_id && event.broadcast_id.length > 0 && isValidCuid(event.broadcast_id)
      ? event.broadcast_id
      : null;
  const contactId =
    event.contact_id && event.contact_id.length > 0 && isValidCuid(event.contact_id)
      ? event.contact_id
      : null;

  return {
    sendingId: event.sending_id,
    workspaceId: event.tenant_id,
    type: eventType,
    broadcastId,
    contactId,
    recipient: event.recipient,
    responseCode: event.response.code,
    responseContent: event.response.content,
    responseCommand: event.response.command || null,
    responseEnhancedCodeClass: event.response.enhanced_code?.class ?? null,
    responseEnhancedCodeSubject: event.response.enhanced_code?.subject ?? null,
    responseEnhancedCodeDetail: event.response.enhanced_code?.detail ?? null,
    bounceClassification: event.bounce_classification || null,
    nodeId: event.node_id,
    createdAt: new Date(event.timestamp),
  };
}

/**
 * Bulk insert events into the database
 *
 * Uses Prisma's createMany for efficient bulk insertion.
 * Events are inserted in a single transaction for consistency.
 */
export async function bulkInsertEvents(events: EmailEvent[]): Promise<number> {
  if (events.length === 0) {
    return 0;
  }

  const startTime = Date.now();

  try {
    // Transform events to Prisma format
    const eventData = events.map(transformEvent);

    // Bulk insert using createMany
    const result = await prisma.event.createMany({
      data: eventData,
      skipDuplicates: true,
    });

    const duration = Date.now() - startTime;

    logger.info(
      {
        inserted: result.count,
        total: events.length,
        durationMs: duration,
        eventsPerSecond: Math.round((result.count / duration) * 1000),
      },
      "Bulk insert completed",
    );

    return result.count;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      {
        error,
        count: events.length,
        durationMs: duration,
      },
      "Bulk insert failed",
    );
    throw error;
  }
}

/**
 * Map MTA event type to TransactionalEmail status
 */
function mapEventTypeToStatus(eventType: string): TransactionalEmailStatus | null {
  switch (eventType) {
    case "Delivery":
      return "DELIVERED";
    case "Bounce":
    case "AdminBounce":
    case "OOB":
      return "BOUNCED";
    case "Feedback":
      return "COMPLAINED";
    case "Rejection":
    case "Expiration":
      return "FAILED";
    default:
      return null;
  }
}

/**
 * Status priority for determining the "highest" status
 * Higher number = higher priority (wins in conflicts)
 */
const STATUS_PRIORITY: Record<TransactionalEmailStatus, number> = {
  QUEUED: 1,
  SENDING: 2,
  DELIVERED: 3,
  FAILED: 4,
  BOUNCED: 5,
  COMPLAINED: 6,
};

/**
 * Update TransactionalEmail records with status changes from MTA events
 *
 * Groups events by sendingId and applies the highest-priority status.
 * Also updates timestamps and counters for opens/clicks.
 */
async function updateTransactionalEmailStatus(events: EmailEvent[]): Promise<void> {
  if (events.length === 0) {
    return;
  }

  const startTime = Date.now();

  logger.info(
    { eventCount: events.length, types: events.map(e => e.type) },
    "Starting updateTransactionalEmailStatus"
  );

  // Group events by sendingId
  const eventsBySendingId = new Map<string, EmailEvent[]>();
  for (const event of events) {
    if (!event.sending_id) continue;
    const existing = eventsBySendingId.get(event.sending_id) || [];
    existing.push(event);
    eventsBySendingId.set(event.sending_id, existing);
  }

  logger.info(
    { sendingIdCount: eventsBySendingId.size },
    "Grouped events by sendingId"
  );

  let updatedCount = 0;

  for (const [sendingId, sendingEvents] of eventsBySendingId) {
    try {
      // Determine the highest-priority status from all events
      let highestStatus: TransactionalEmailStatus | null = null;
      let highestPriority = 0;

      // Collect updates
      let deliveredAt: Date | undefined;
      let bouncedAt: Date | undefined;
      let complainedAt: Date | undefined;
      let bounceClassification: string | undefined;
      let lastResponseCode: number | undefined;
      let lastResponseMessage: string | undefined;

      for (const event of sendingEvents) {
        const status = mapEventTypeToStatus(event.type);
        if (status && STATUS_PRIORITY[status] > highestPriority) {
          highestStatus = status;
          highestPriority = STATUS_PRIORITY[status];
        }

        const eventTime = new Date(event.timestamp);

        switch (event.type) {
          case "Delivery":
            deliveredAt = eventTime;
            lastResponseCode = event.response.code;
            lastResponseMessage = event.response.content;
            break;
          case "Bounce":
          case "AdminBounce":
          case "OOB":
            bouncedAt = eventTime;
            bounceClassification = event.bounce_classification;
            lastResponseCode = event.response.code;
            lastResponseMessage = event.response.content;
            break;
          case "Feedback":
            complainedAt = eventTime;
            break;
          // Note: Open and Click events are handled separately by tracking endpoints,
          // not through MTA webhooks
        }
      }

      // Build update object
      const update: Prisma.TransactionalEmailUpdateInput = {
        totalEvents: { increment: sendingEvents.length },
      };

      if (highestStatus) {
        update.status = highestStatus;
      }

      if (deliveredAt) {
        update.deliveredAt = deliveredAt;
      }

      if (bouncedAt) {
        update.bouncedAt = bouncedAt;
        update.bounceClassification = bounceClassification;
      }

      if (complainedAt) {
        update.complainedAt = complainedAt;
      }

      if (lastResponseCode !== undefined) {
        update.lastResponseCode = lastResponseCode;
        update.lastResponseMessage = lastResponseMessage;
      }

      // Update the record
      logger.info(
        { sendingId, update: JSON.stringify(update) },
        "Updating transactional email"
      );

      const result = await prisma.transactionalEmail.updateMany({
        where: { sendingId },
        data: update,
      });

      logger.info(
        { sendingId, resultCount: result.count },
        "Update result"
      );

      if (result.count > 0) {
        updatedCount++;
      }
    } catch (error) {
      logger.error(
        { error, sendingId },
        "Failed to update transactional email status"
      );
    }
  }

  const duration = Date.now() - startTime;
  logger.info(
    { updatedCount, totalSendingIds: eventsBySendingId.size, durationMs: duration },
    "Finished updateTransactionalEmailStatus"
  );
}

/**
 * Process events and update contact/broadcast statistics
 *
 * This handles:
 * - Suppression for hard bounces and complaints
 * - Updating broadcast delivery statistics
 * - Contact engagement tracking
 * - Updating TransactionalEmail status
 */
export async function processEventsWithSideEffects(
  events: EmailEvent[],
): Promise<void> {
  // First, bulk insert the events
  await bulkInsertEvents(events);

  // Update TransactionalEmail records with status changes
  await updateTransactionalEmailStatus(events);

  // Group events by type for batch processing
  const bounces = events.filter(
    (e) => e.type === "Bounce" || e.type === "AdminBounce",
  );
  const complaints = events.filter((e) => e.type === "Feedback");
  const deliveries = events.filter((e) => e.type === "Delivery");

  // Process hard bounces - suppress contacts
  if (bounces.length > 0) {
    await processBounces(bounces);
  }

  // Process complaints - suppress contacts
  if (complaints.length > 0) {
    await processComplaints(complaints);
  }

  // Process deliveries - update broadcast stats
  if (deliveries.length > 0) {
    await processDeliveries(deliveries);
  }
}

/**
 * Process bounce events
 *
 * Suppress contacts with permanent bounces.
 */
async function processBounces(bounces: EmailEvent[]): Promise<void> {
  const permanentBounceClassifications = [
    "InvalidRecipient",
    "BadDomain",
    "InactiveMailbox",
    "InvalidSender",
  ];

  const hardBounces = bounces.filter((b) =>
    permanentBounceClassifications.includes(b.bounce_classification),
  );

  if (hardBounces.length === 0) {
    return;
  }

  const startTime = Date.now();

  logger.info(
    { count: hardBounces.length },
    "Processing hard bounces for suppression",
  );

  // Group by workspace for batch suppression
  const bouncesByWorkspace = new Map<string, EmailEvent[]>();
  for (const bounce of hardBounces) {
    const existing = bouncesByWorkspace.get(bounce.tenant_id) || [];
    existing.push(bounce);
    bouncesByWorkspace.set(bounce.tenant_id, existing);
  }

  let totalCreated = 0;

  // Create suppression entries for each workspace
  for (const [workspaceId, workspaceBounces] of bouncesByWorkspace) {
    try {
      const suppressionData = workspaceBounces.map((bounce) => ({
        workspaceId,
        email: bounce.recipient,
        contactId: bounce.contact_id || null,
        scope: "GLOBAL" as const,
        reason: "BOUNCED" as const,
        notes: `MTA Bounce: ${bounce.bounce_classification}`,
      }));

      const result = await prisma.suppressionList.createMany({
        data: suppressionData,
        skipDuplicates: true,
      });

      totalCreated += result.count;

      logger.info(
        { workspaceId, count: result.count },
        "Created suppression entries for bounces",
      );
    } catch (error) {
      logger.error(
        { error, workspaceId },
        "Failed to create suppression entries for bounces",
      );
    }
  }

  const duration = Date.now() - startTime;
  logger.info(
    { totalCreated, durationMs: duration },
    "Bounce suppression processing complete",
  );
}

/**
 * Process complaint events (spam reports)
 *
 * Suppress contacts who marked emails as spam.
 */
async function processComplaints(complaints: EmailEvent[]): Promise<void> {
  const startTime = Date.now();

  logger.info(
    { count: complaints.length },
    "Processing complaints for suppression",
  );

  // Group by workspace
  const complaintsByWorkspace = new Map<string, EmailEvent[]>();
  for (const complaint of complaints) {
    const existing = complaintsByWorkspace.get(complaint.tenant_id) || [];
    existing.push(complaint);
    complaintsByWorkspace.set(complaint.tenant_id, existing);
  }

  let totalCreated = 0;

  // Create suppression entries
  for (const [workspaceId, workspaceComplaints] of complaintsByWorkspace) {
    try {
      const suppressionData = workspaceComplaints.map((complaint) => ({
        workspaceId,
        email: complaint.recipient,
        contactId: complaint.contact_id || null,
        scope: "GLOBAL" as const,
        reason: "COMPLAINED" as const,
        notes: "MTA Feedback Loop",
      }));

      const result = await prisma.suppressionList.createMany({
        data: suppressionData,
        skipDuplicates: true,
      });

      totalCreated += result.count;

      logger.info(
        { workspaceId, count: result.count },
        "Created suppression entries for complaints",
      );
    } catch (error) {
      logger.error(
        { error, workspaceId },
        "Failed to create suppression entries for complaints",
      );
    }
  }

  const duration = Date.now() - startTime;
  logger.info(
    { totalCreated, durationMs: duration },
    "Complaint suppression processing complete",
  );
}

/**
 * Process delivery events
 *
 * Log delivery statistics. Broadcast stats are calculated on-demand
 * from the Event table rather than maintaining counters.
 */
async function processDeliveries(deliveries: EmailEvent[]): Promise<void> {
  // Group deliveries by broadcast for logging
  const deliveriesByBroadcast = new Map<string, number>();
  for (const delivery of deliveries) {
    if (delivery.broadcast_id) {
      const count = deliveriesByBroadcast.get(delivery.broadcast_id) || 0;
      deliveriesByBroadcast.set(delivery.broadcast_id, count + 1);
    }
  }

  for (const [broadcastId, count] of deliveriesByBroadcast) {
    logger.debug(
      { broadcastId, count },
      "Processed delivery events for broadcast",
    );
  }
}
