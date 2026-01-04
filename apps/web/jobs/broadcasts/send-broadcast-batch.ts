/**
 * Send Broadcast Batch Job
 *
 * Processes a single batch of contacts for a broadcast.
 * This job receives a pre-computed list of contact IDs to send to.
 *
 * For each contact:
 * 1. Renders the email template with personalization
 * 2. Applies tracking (link rewriting, open pixel)
 * 3. Uploads content to S3
 * 4. Publishes email message to NATS for MTA injection
 */

import { prisma } from "@/lib/db";
import {
  convertToNatsMessages,
  type EmailBroadcast,
  prepareEmailBatch,
} from "@/lib/email";
import { getNatsOptions, publishEmailBatch } from "@/lib/nats";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";

const logger = queueLogger.child({ job: "send-broadcast-batch" });

export const sendBroadcastBatch: JobProcessor<
  "broadcasts",
  "send-broadcast-batch"
> = async (data, jobId) => {
  const { broadcastId, batchId, contactIds } = data;

  logger.info(
    { jobId, broadcastId, batchId, contactCount: contactIds.length },
    "Processing broadcast batch",
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
      replyToIdentity: {
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
  if (
    broadcast.status === "DRAFT_ARCHIVED" ||
    broadcast.status === "ARCHIVED"
  ) {
    logger.warn(
      { jobId, broadcastId, batchId },
      "Broadcast was archived/cancelled, skipping batch",
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

  if (
    !broadcast.senderIdentity ||
    !broadcast.sendingDomain ||
    !broadcast.senderIdentity.sendingDomain
  ) {
    throw new Error(
      `Broadcast ${broadcastId} missing sender identity or sending domain`,
    );
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
      "Some contacts were skipped (unsubscribed or deleted)",
    );
  }

  if (contacts.length === 0) {
    logger.info(
      { jobId, broadcastId, batchId },
      "No eligible contacts remaining in batch",
    );
    return;
  }

  // Build reply-to email: use replyToIdentity if set, otherwise default to senderIdentity (from email)
  const replyToIdentity = broadcast.replyToIdentity ?? broadcast.senderIdentity;
  const replyToEmail = `${replyToIdentity.email}@${replyToIdentity.sendingDomain?.name}`;

  // Prepare the broadcast data for email preparation
  const emailBroadcast: EmailBroadcast = {
    id: broadcast.id,
    workspaceId: broadcast.workspaceId,
    emailContent: {
      subject: broadcast.emailContent.subject,
      previewText: broadcast.emailContent.previewText,
      contentJson: broadcast.emailContent.contentJson,
      contentHtml: broadcast.emailContent.contentHtml,
      contentText: broadcast.emailContent.contentText,
    },
    senderIdentity: {
      ...broadcast.senderIdentity,
      sendingDomain: broadcast.senderIdentity.sendingDomain,
    },
    sendingDomain: broadcast.sendingDomain,
    trackOpens: broadcast.trackOpens,
    trackClicks: broadcast.trackClicks,
    replyToEmail,
  };

  // Prepare all emails for the batch
  const preparedEmails = await prepareEmailBatch(contacts, emailBroadcast);

  logger.debug(
    {
      jobId,
      broadcastId,
      batchId,
      preparedCount: preparedEmails.length,
    },
    "Prepared emails for batch",
  );

  // Upload email content to S3 and convert to NATS message format
  const natsMessages = await convertToNatsMessages(preparedEmails);

  // Publish to NATS for MTA injection
  const natsOptions = getNatsOptions();
  const acks = await publishEmailBatch(natsOptions, natsMessages);

  const duplicates = acks.filter((a) => a.duplicate).length;

  logger.info(
    {
      jobId,
      broadcastId,
      batchId,
      processedCount: contacts.length,
      preparedCount: preparedEmails.length,
      publishedCount: acks.length,
      duplicates,
      skippedCount,
    },
    "Batch processing complete - emails published to NATS",
  );
};
