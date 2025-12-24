/**
 * Send Broadcast Batch Job
 *
 * Processes a single batch of contacts for a broadcast.
 * This job receives a pre-computed list of contact IDs to send to.
 *
 * For each contact:
 * 1. Renders the email template with personalization
 * 2. Applies tracking (link rewriting, open pixel)
 * 3. Injects the email into the MTA
 */

import { prisma } from "@/lib/db";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";
import { prepareEmailBatch, type EmailBroadcast } from "@/lib/email";

const logger = queueLogger.child({ job: "send-broadcast-batch" });

export const sendBroadcastBatch: JobProcessor<
  "broadcasts",
  "send-broadcast-batch"
> = async (data, jobId) => {
  const { broadcastId, batchId, contactIds } = data;

  logger.info(
    { jobId, broadcastId, batchId, contactCount: contactIds.length },
    "Processing broadcast batch"
  );

  // Fetch the broadcast with all required relations
  const broadcast = await prisma.broadcast.findUnique({
    where: { id: broadcastId },
    include: {
      emailContent: true,
      senderIdentity: {
        include: {
          sendingDomain: true,
        },
      },
      sendingDomain: true,
    },
  });

  if (!broadcast) {
    logger.error({ jobId, broadcastId, batchId }, "Broadcast not found");
    throw new Error(`Broadcast ${broadcastId} not found`);
  }

  // Check if broadcast was archived (cancelled)
  if (broadcast.status === "DRAFT_ARCHIVED" || broadcast.status === "ARCHIVED") {
    logger.warn(
      { jobId, broadcastId, batchId },
      "Broadcast was archived/cancelled, skipping batch"
    );
    return;
  }

  // Validate required data
  if (!broadcast.emailContent) {
    throw new Error(`Broadcast ${broadcastId} has no email content`);
  }

  if (!broadcast.emailContent.subject) {
    throw new Error(`Broadcast ${broadcastId} has no subject`);
  }

  if (!broadcast.senderIdentity || !broadcast.sendingDomain) {
    throw new Error(`Broadcast ${broadcastId} missing sender identity or sending domain`);
  }

  // Fetch contact details for this batch
  const contacts = await prisma.contact.findMany({
    where: {
      id: { in: contactIds },
      status: "SUBSCRIBED", // Double-check they're still subscribed
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  // Some contacts may have unsubscribed since scheduling
  const skippedCount = contactIds.length - contacts.length;
  if (skippedCount > 0) {
    logger.info(
      { jobId, broadcastId, batchId, skippedCount },
      "Some contacts were skipped (unsubscribed or deleted)"
    );
  }

  if (contacts.length === 0) {
    logger.info(
      { jobId, broadcastId, batchId },
      "No eligible contacts remaining in batch"
    );
    return;
  }

  // Prepare the broadcast data for email preparation
  const emailBroadcast: EmailBroadcast = {
    id: broadcast.id,
    emailContent: {
      subject: broadcast.emailContent.subject,
      contentJson: broadcast.emailContent.contentJson,
      contentHtml: broadcast.emailContent.contentHtml ?? undefined,
    },
    senderIdentity: {
      ...broadcast.senderIdentity,
      sendingDomain: broadcast.senderIdentity.sendingDomain!,
    },
    sendingDomain: broadcast.sendingDomain,
  };

  // Prepare all emails for the batch
  const preparedEmails = await prepareEmailBatch(contacts, emailBroadcast, {
    clickTracking: true,
    openTracking: true,
  });

  logger.debug(
    {
      jobId,
      broadcastId,
      batchId,
      preparedCount: preparedEmails.length,
    },
    "Prepared emails for batch"
  );

  // TODO: Inject emails into MTA
  // For now, log the prepared emails (actual MTA injection to be implemented)
  // Each prepared email contains:
  // - emailSendId: unique ID for tracking
  // - messageId: RFC 5322 Message-ID header
  // - recipientEmail: where to send
  // - htmlBody: rendered HTML with tracking
  // - from: sender address
  // - envelopeSender: for bounce handling

  // In production, this would:
  // 1. Call the MTA injector HTTP API for each email
  // 2. Store EmailSend records in the database
  // 3. Handle retries for failed injections

  logger.info(
    {
      jobId,
      broadcastId,
      batchId,
      processedCount: contacts.length,
      preparedCount: preparedEmails.length,
      skippedCount,
    },
    "Batch processing complete"
  );

  // TODO: Update broadcast progress
  // - Increment sent count
  // - Check if all batches are complete
  // - Update status to SENT when done
};
