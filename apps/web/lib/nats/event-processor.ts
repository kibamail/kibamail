/**
 * Event Processor
 *
 * Handles bulk insertion of email events into the database.
 * Optimized for high-throughput ingestion.
 */

import { Prisma, EventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { EmailEvent } from "./event-types";
import { mapEventType } from "./event-types";
import { queueLogger } from "@/lib/queue";
import {
  recordDbInsertDuration,
  recordSuppressionCreated,
  recordSuppressionDuration,
  recordEventsProcessed,
  withDbSpan,
  withSuppressionSpan,
  type BatchTraceContext,
} from "./instrumentation";

const logger = queueLogger.child({ module: "event-processor" });

/**
 * Transform an EmailEvent to a Prisma Event create input
 */
function transformEvent(event: EmailEvent): Prisma.EventCreateManyInput {
  const eventType = mapEventType(event.type) as EventType;

  // Convert empty strings to null for optional foreign key fields
  const broadcastId = event.broadcast_id && event.broadcast_id.length > 0 ? event.broadcast_id : null;
  const contactId = event.contact_id && event.contact_id.length > 0 ? event.contact_id : null;

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
export async function bulkInsertEvents(
  events: EmailEvent[],
  traceContext?: BatchTraceContext
): Promise<number> {
  if (events.length === 0) {
    return 0;
  }

  const startTime = Date.now();

  try {
    // Transform events to Prisma format
    const eventData = events.map(transformEvent);

    // Bulk insert using createMany (with optional tracing)
    const insertFn = async () => {
      return prisma.event.createMany({
        data: eventData,
        skipDuplicates: true,
      });
    };

    const result = traceContext
      ? await withDbSpan(traceContext.span, "bulk_insert", events.length, insertFn)
      : await insertFn();

    const duration = Date.now() - startTime;

    // Record metrics
    recordDbInsertDuration(duration, events.length);

    // Record events processed by type and workspace
    const byTypeAndWorkspace = new Map<string, Map<string, number>>();
    for (const event of events) {
      if (!byTypeAndWorkspace.has(event.type)) {
        byTypeAndWorkspace.set(event.type, new Map());
      }
      const wsMap = byTypeAndWorkspace.get(event.type)!;
      wsMap.set(event.tenant_id, (wsMap.get(event.tenant_id) || 0) + 1);
    }
    for (const [eventType, wsMap] of byTypeAndWorkspace) {
      for (const [workspaceId, count] of wsMap) {
        recordEventsProcessed(count, eventType, workspaceId);
      }
    }

    logger.info(
      {
        inserted: result.count,
        total: events.length,
        durationMs: duration,
        eventsPerSecond: Math.round((result.count / duration) * 1000),
      },
      "Bulk insert completed"
    );

    return result.count;
  } catch (error) {
    const duration = Date.now() - startTime;
    recordDbInsertDuration(duration, events.length);

    logger.error(
      {
        error,
        count: events.length,
        durationMs: duration,
      },
      "Bulk insert failed"
    );
    throw error;
  }
}

/**
 * Process events and update contact/broadcast statistics
 *
 * This handles:
 * - Suppression for hard bounces and complaints
 * - Updating broadcast delivery statistics
 * - Contact engagement tracking
 */
export async function processEventsWithSideEffects(
  events: EmailEvent[],
  traceContext?: BatchTraceContext
): Promise<void> {
  // First, bulk insert the events
  await bulkInsertEvents(events, traceContext);

  // Group events by type for batch processing
  const bounces = events.filter(
    (e) => e.type === "Bounce" || e.type === "AdminBounce"
  );
  const complaints = events.filter((e) => e.type === "Feedback");
  const deliveries = events.filter((e) => e.type === "Delivery");

  // Process hard bounces - suppress contacts
  if (bounces.length > 0) {
    await processBounces(bounces, traceContext);
  }

  // Process complaints - suppress contacts
  if (complaints.length > 0) {
    await processComplaints(complaints, traceContext);
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
async function processBounces(
  bounces: EmailEvent[],
  traceContext?: BatchTraceContext
): Promise<void> {
  const permanentBounceClassifications = [
    "InvalidRecipient",
    "BadDomain",
    "InactiveMailbox",
    "InvalidSender",
  ];

  const hardBounces = bounces.filter((b) =>
    permanentBounceClassifications.includes(b.bounce_classification)
  );

  if (hardBounces.length === 0) {
    return;
  }

  const startTime = Date.now();

  logger.info(
    { count: hardBounces.length },
    "Processing hard bounces for suppression"
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
  const createSuppressions = async () => {
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
          "Created suppression entries for bounces"
        );
      } catch (error) {
        logger.error(
          { error, workspaceId },
          "Failed to create suppression entries for bounces"
        );
      }
    }
  };

  if (traceContext) {
    await withSuppressionSpan(traceContext.span, "bounced", hardBounces.length, createSuppressions);
  } else {
    await createSuppressions();
  }

  const duration = Date.now() - startTime;
  recordSuppressionDuration(duration, "bounced");
  recordSuppressionCreated("bounced", totalCreated);
}

/**
 * Process complaint events (spam reports)
 *
 * Suppress contacts who marked emails as spam.
 */
async function processComplaints(
  complaints: EmailEvent[],
  traceContext?: BatchTraceContext
): Promise<void> {
  const startTime = Date.now();

  logger.info(
    { count: complaints.length },
    "Processing complaints for suppression"
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
  const createSuppressions = async () => {
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
          "Created suppression entries for complaints"
        );
      } catch (error) {
        logger.error(
          { error, workspaceId },
          "Failed to create suppression entries for complaints"
        );
      }
    }
  };

  if (traceContext) {
    await withSuppressionSpan(traceContext.span, "complained", complaints.length, createSuppressions);
  } else {
    await createSuppressions();
  }

  const duration = Date.now() - startTime;
  recordSuppressionDuration(duration, "complained");
  recordSuppressionCreated("complained", totalCreated);
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
      "Processed delivery events for broadcast"
    );
  }
}
