/**
 * Process Sandbox Broadcast Email Job
 *
 * Simulates broadcast email sending for sandbox test addresses (@kibamail.dev).
 * Generates realistic email events based on the recipient address outcome.
 *
 * Supported test addresses (same as transactional):
 * - delivered@kibamail.dev: Successful delivery (Reception → Delivery)
 * - bounced@kibamail.dev: Hard bounce (Reception → Bounce)
 * - softbounce@kibamail.dev: Soft bounce (Reception → TransientFailure)
 * - complained@kibamail.dev: Spam complaint (Reception → Delivery → Feedback)
 * - failed@kibamail.dev: Permanent failure (Rejection)
 * - delayed@kibamail.dev: Delayed delivery (Reception → TransientFailure × 2 → Delivery)
 * - opened@kibamail.dev: Delivered + opened (Reception → Delivery → Open)
 * - clicked@kibamail.dev: Delivered + clicked (Reception → Delivery → Open → Click)
 *
 * All addresses support +label syntax for tracking: delivered+signup@kibamail.dev
 */

import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";
import { prisma } from "@/lib/db";
import { processEventsWithSideEffects } from "@/lib/mta";
import type { EmailEvent, EmailEventType } from "@/lib/mta/event-types";

const logger = queueLogger.child({ job: "process-sandbox-broadcast" });

// MTA event types that can be processed through processEventsWithSideEffects
type MtaEventType = EmailEventType;

// Tracking events that are inserted directly (not from MTA)
type TrackingEventType = "Open" | "Click";

interface EventDefinition {
  type: MtaEventType | TrackingEventType;
  delayMs: number;
  extra?: {
    responseCode?: number;
    responseContent?: string;
    bounceClassification?: string;
  };
}

/**
 * Check if an event type is a tracking event (Open/Click)
 * These are not real MTA events and need to be inserted directly
 */
function isTrackingEvent(type: string): type is TrackingEventType {
  return type === "Open" || type === "Click";
}

/**
 * Event sequences for each sandbox outcome
 * These simulate realistic MTA event flows
 */
const SANDBOX_SEQUENCES: Record<string, EventDefinition[]> = {
  delivered: [
    { type: "Reception", delayMs: 100 },
    { type: "Delivery", delayMs: 500, extra: { responseCode: 250, responseContent: "OK" } },
  ],
  bounced: [
    { type: "Reception", delayMs: 100 },
    {
      type: "Bounce",
      delayMs: 300,
      extra: { bounceClassification: "InvalidRecipient", responseCode: 550, responseContent: "User unknown" },
    },
  ],
  softbounce: [
    { type: "Reception", delayMs: 100 },
    {
      type: "TransientFailure",
      delayMs: 300,
      extra: { responseCode: 421, responseContent: "Try again later" },
    },
  ],
  complained: [
    { type: "Reception", delayMs: 100 },
    { type: "Delivery", delayMs: 500, extra: { responseCode: 250, responseContent: "OK" } },
    { type: "Feedback", delayMs: 2000 },
  ],
  failed: [
    {
      type: "Rejection",
      delayMs: 100,
      extra: { responseCode: 550, responseContent: "Message rejected" },
    },
  ],
  delayed: [
    { type: "Reception", delayMs: 100 },
    { type: "TransientFailure", delayMs: 1000, extra: { responseCode: 421, responseContent: "Temporary failure" } },
    { type: "TransientFailure", delayMs: 2000, extra: { responseCode: 421, responseContent: "Temporary failure" } },
    { type: "Delivery", delayMs: 5000, extra: { responseCode: 250, responseContent: "OK" } },
  ],
  opened: [
    { type: "Reception", delayMs: 100 },
    { type: "Delivery", delayMs: 500, extra: { responseCode: 250, responseContent: "OK" } },
    { type: "Open", delayMs: 3000 },
  ],
  clicked: [
    { type: "Reception", delayMs: 100 },
    { type: "Delivery", delayMs: 500, extra: { responseCode: 250, responseContent: "OK" } },
    { type: "Open", delayMs: 3000 },
    { type: "Click", delayMs: 5000 },
  ],
};

export const processSandboxBroadcast: JobProcessor<"broadcasts", "process-sandbox-broadcast"> = async (data, jobId) => {
  const {
    broadcastId,
    workspaceId,
    sendingId,
    email,
    sandboxOutcome,
    sandboxLabel,
  } = data;

  logger.info(
    { jobId, broadcastId, email, sandboxOutcome, sandboxLabel, sendingId },
    "Processing sandbox broadcast email"
  );

  // Use the pre-generated sendingId from BroadcastSend record
  const queuedAt = new Date();

  // Create initial Queued event to mark the email as being processed
  // Note: contactId is null for sandbox broadcasts (no contacts created)
  await prisma.event.create({
    data: {
      sendingId: sendingId,
      workspaceId,
      broadcastId,
      contactId: null,
      type: "Queued",
      recipient: email,
      queue: "sandbox",
      siteName: "sandbox",
      nodeId: "sandbox",
      createdAt: queuedAt,
    },
  });

  // Get event sequence for this outcome (default to delivered if unknown)
  const sequence = SANDBOX_SEQUENCES[sandboxOutcome] || SANDBOX_SEQUENCES.delivered;

  // Generate events with simulated delays
  let currentTime = queuedAt.getTime();

  const mtaEventsToProcess: EmailEvent[] = [];
  const trackingEventsToInsert: Array<{ type: TrackingEventType; timestamp: Date }> = [];

  for (const eventDef of sequence) {
    currentTime += eventDef.delayMs;
    const eventTime = new Date(currentTime);

    if (isTrackingEvent(eventDef.type)) {
      // Open/Click events are inserted directly (not processed through MTA pipeline)
      trackingEventsToInsert.push({
        type: eventDef.type,
        timestamp: eventTime,
      });
    } else {
      // MTA events go through the normal processing pipeline
      // Note: contact_id is null for sandbox broadcasts (no contacts created)
      const event: EmailEvent = {
        type: eventDef.type as MtaEventType,
        sending_id: sendingId,
        recipient: email,
        tenant_id: workspaceId,
        broadcast_id: broadcastId,
        contact_id: null,
        response: {
          code: eventDef.extra?.responseCode || 0,
          content: eventDef.extra?.responseContent || "",
          command: null,
          enhanced_code: null,
        },
        bounce_classification: eventDef.extra?.bounceClassification || "Uncategorized",
        timestamp: eventTime.toISOString(),
        node_id: "sandbox",
      };

      mtaEventsToProcess.push(event);
    }
  }

  // Process MTA events through the normal pipeline
  // This handles event insertion and BroadcastSend status updates
  if (mtaEventsToProcess.length > 0) {
    await processEventsWithSideEffects(mtaEventsToProcess);
  }

  // Insert tracking events directly into the database
  // Note: contactId is null for sandbox broadcasts (no contacts created)
  for (const trackingEvent of trackingEventsToInsert) {
    await prisma.event.create({
      data: {
        sendingId: sendingId,
        workspaceId,
        broadcastId,
        contactId: null,
        type: trackingEvent.type,
        recipient: email,
        nodeId: "sandbox",
        createdAt: trackingEvent.timestamp,
      },
    });
  }

  // Check if all broadcast sends are complete by comparing queued vs completed events
  // Count unique sendingIds with Queued events
  const queuedCount = await prisma.event.groupBy({
    by: ["sendingId"],
    where: {
      broadcastId,
      type: "Queued",
    },
  });

  // Count unique sendingIds with terminal events (Delivery, Bounce, Rejection)
  const completedCount = await prisma.event.groupBy({
    by: ["sendingId"],
    where: {
      broadcastId,
      type: { in: ["Delivery", "Bounce", "Rejection"] },
    },
  });

  // If all queued emails have a terminal event, mark broadcast as SENT
  if (queuedCount.length > 0 && completedCount.length >= queuedCount.length) {
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: "SENT" },
    });
  }

  logger.info(
    { jobId, broadcastId, email, sandboxOutcome, eventsGenerated: sequence.length },
    "Sandbox broadcast email processed successfully"
  );
};
