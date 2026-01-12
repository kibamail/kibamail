/**
 * Process Sandbox Email Job
 *
 * Simulates email sending for sandbox test addresses (@kibamail.dev).
 * Generates realistic email events based on the recipient address outcome.
 *
 * Supported test addresses:
 * - delivered@kibamail.dev: Successful delivery (Queued → Reception → Delivery)
 * - bounced@kibamail.dev: Hard bounce (Queued → Reception → Bounce)
 * - softbounce@kibamail.dev: Soft bounce (Queued → Reception → TransientFailure)
 * - complained@kibamail.dev: Spam complaint (Queued → Reception → Delivery → Feedback)
 * - failed@kibamail.dev: Permanent failure (Queued → Rejection)
 * - delayed@kibamail.dev: Delayed delivery (Queued → Reception → TransientFailure × 2 → Delivery)
 * - opened@kibamail.dev: Delivered + opened (Queued → Reception → Delivery → Open)
 * - clicked@kibamail.dev: Delivered + clicked (Queued → Reception → Delivery → Open → Click)
 *
 * All addresses support +label syntax for tracking: delivered+signup@kibamail.dev
 */

import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";
import { prisma } from "@/lib/db";
import { uploadPrivateFile } from "@/lib/storage";
import { processEventsWithSideEffects } from "@/lib/mta";
import type { EmailEvent, EmailEventType } from "@/lib/mta/event-types";

const logger = queueLogger.child({ job: "process-sandbox" });

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

export const processSandbox: JobProcessor<"emails", "process-sandbox"> = async (data, jobId) => {
  const {
    emailSendId,
    workspaceId,
    senderIdentityId,
    sendingDomainId,
    fromEmail,
    fromName,
    recipient,
    sandboxOutcome,
    sandboxLabel,
    subject,
    previewText,
    htmlBody,
    textBody,
    replyTo,
    metadata,
  } = data;

  logger.info(
    { jobId, emailSendId, sandboxOutcome, sandboxLabel },
    "Processing sandbox email"
  );

  const queuedAt = new Date();
  const eventId = `evt_${emailSendId}`;
  const htmlS3Key = `emails/${workspaceId}/transactional/${emailSendId}/html`;
  const textS3Key = `emails/${workspaceId}/transactional/${emailSendId}/text`;

  // Use fromEmail directly - no domain lookup needed for sandbox
  // This allows users to test with any "from" address without domain setup

  // Upload content to S3 (same as real emails)
  await Promise.all([
    uploadPrivateFile(htmlS3Key, htmlBody, "text/html"),
    textBody ? uploadPrivateFile(textS3Key, textBody, "text/plain") : Promise.resolve(),
  ]);

  // Create initial Queued event
  await prisma.event.create({
    data: {
      id: eventId,
      sendingId: emailSendId,
      workspaceId,
      type: "Queued",
      recipient,
      queue: "sandbox",
      siteName: "sandbox",
      nodeId: "sandbox",
      contentS3Key: htmlS3Key,
      createdAt: queuedAt,
    },
  });

  // Create TransactionalEmail record
  // sendingDomainId and senderIdentityId are optional for sandbox-only sends
  await prisma.transactionalEmail.create({
    data: {
      workspaceId,
      sendingId: emailSendId,
      fromEmail,
      fromName: fromName || undefined,
      replyToEmail: replyTo?.email,
      replyToName: replyTo?.name,
      sendingDomainId: sendingDomainId || undefined,
      senderIdentityId: senderIdentityId || undefined,
      toEmail: recipient,
      subject,
      previewText: previewText || undefined,
      htmlContentS3Key: htmlS3Key,
      textContentS3Key: textBody ? textS3Key : undefined,
      status: "SENDING",
      openTrackingEnabled: false,
      clickTrackingEnabled: false,
      metadata: metadata || undefined,
      sentAt: queuedAt,
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
      const event: EmailEvent = {
        type: eventDef.type as MtaEventType,
        sending_id: emailSendId,
        recipient,
        tenant_id: workspaceId,
        broadcast_id: "",
        contact_id: "",
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
  // This handles event insertion and TransactionalEmail status updates
  if (mtaEventsToProcess.length > 0) {
    await processEventsWithSideEffects(mtaEventsToProcess);
  }

  // Insert tracking events directly into the database
  // These update open/click counts on TransactionalEmail
  for (const trackingEvent of trackingEventsToInsert) {
    await prisma.event.create({
      data: {
        sendingId: emailSendId,
        workspaceId,
        type: trackingEvent.type,
        recipient,
        nodeId: "sandbox",
        createdAt: trackingEvent.timestamp,
      },
    });

    // Update TransactionalEmail counters for opens/clicks
    if (trackingEvent.type === "Open") {
      await prisma.transactionalEmail.updateMany({
        where: { sendingId: emailSendId },
        data: {
          openCount: { increment: 1 },
          firstOpenedAt: trackingEvent.timestamp,
        },
      });
    } else if (trackingEvent.type === "Click") {
      await prisma.transactionalEmail.updateMany({
        where: { sendingId: emailSendId },
        data: {
          clickCount: { increment: 1 },
          firstClickedAt: trackingEvent.timestamp,
        },
      });
    }
  }

  logger.info(
    { jobId, emailSendId, sandboxOutcome, eventsGenerated: sequence.length + 1 },
    "Sandbox email processed successfully"
  );
};
