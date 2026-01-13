/**
 * Send Broadcast Batch Emails Job
 *
 * Processes a single batch of email-only recipients for a broadcast.
 * Unlike send-broadcast-batch, this job does NOT require contacts to exist.
 *
 * For each email:
 * 1. Renders the email template with personalization from variables
 * 2. Applies tracking (link rewriting, open pixel)
 * 3. Injects email directly to MTA via HTTP
 * 4. Creates BroadcastSend record with contactId=null
 *
 * NOTE: No inbox conversations are created for email-only sends.
 */

import type { BroadcastStyles } from "@/lib/broadcast-renderer";
import { prisma } from "@/lib/db";
import {
  convertEmailOnlyToMtaMessages,
  type EmailBroadcast,
  prepareEmailOnlyBatch,
} from "@/lib/email";
import { getMtaOptions, injectEmailBatch } from "@/lib/mta";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";

const logger = queueLogger.child({ job: "send-broadcast-batch-emails" });

export const sendBroadcastBatchEmails: JobProcessor<
  "broadcasts",
  "send-broadcast-batch-emails"
> = async (data, jobId) => {
  const { broadcastId, batchId, emails } = data;

  logger.info(
    { jobId, broadcastId, batchId, emailCount: emails.length },
    "Processing email-only broadcast batch",
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

  if (emails.length === 0) {
    logger.info(
      { jobId, broadcastId, batchId },
      "No emails in batch",
    );
    return;
  }

  // Build reply-to parts: use replyToIdentity if set, otherwise default to senderIdentity
  const replyToIdentity = broadcast.replyToIdentity ?? broadcast.senderIdentity;
  const replyToLocalPart = replyToIdentity.email;
  const replyToDomain = replyToIdentity.sendingDomain?.name ?? broadcast.sendingDomain.name;

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
      styles: broadcast.emailContent.styles as BroadcastStyles | null,
    },
    senderIdentity: {
      ...broadcast.senderIdentity,
      sendingDomain: broadcast.senderIdentity.sendingDomain,
    },
    sendingDomain: broadcast.sendingDomain,
    trackOpens: broadcast.trackOpens,
    trackClicks: broadcast.trackClicks,
    replyToLocalPart,
    replyToDomain,
    // Inbox is not enabled for email-only sends (no reply tracking)
    inboxEnabled: false,
  };

  // Prepare all emails for the batch (using email-only preparation)
  const preparedEmails = await prepareEmailOnlyBatch(emails, emailBroadcast);

  logger.debug(
    {
      jobId,
      broadcastId,
      batchId,
      preparedCount: preparedEmails.length,
    },
    "Prepared email-only emails for batch",
  );

  // Create BroadcastSend records for analytics tracking (with contactId=null)
  if (preparedEmails.length > 0) {
    const now = new Date();
    await prisma.broadcastSend.createMany({
      data: preparedEmails.map((email) => ({
        broadcastId: broadcast.id,
        contactId: null, // No contact for email-only sends
        workspaceId: broadcast.workspaceId,
        sendingId: email.emailSendId,
        email: email.recipientEmail,
        // For nullable Json fields, Prisma requires explicit handling
        variables: email.variables ? email.variables : undefined,
        status: "QUEUED" as const,
        queuedAt: now,
      })),
      skipDuplicates: true, // In case of retry, don't fail on duplicate
    });

    // Update broadcast aggregate counts
    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: {
        totalQueued: { increment: preparedEmails.length },
      },
    });

    logger.debug(
      {
        jobId,
        broadcastId,
        batchId,
        broadcastSendCount: preparedEmails.length,
      },
      "Created BroadcastSend records for email-only analytics",
    );
  }

  // Convert to MTA message format
  const mtaMessages = convertEmailOnlyToMtaMessages(preparedEmails);

  // Inject directly to MTA via HTTP
  const mtaOptions = getMtaOptions();
  const result = await injectEmailBatch(mtaOptions, mtaMessages);

  logger.info(
    {
      jobId,
      broadcastId,
      batchId,
      emailCount: emails.length,
      preparedCount: preparedEmails.length,
      injectedCount: result.successful,
      failed: result.failed,
    },
    "Email-only batch processing complete - emails injected to MTA",
  );

  // Update BroadcastSend records and aggregates based on injection results
  if (preparedEmails.length > 0) {
    const successfulSendingIds = result.results
      .filter((r) => r.success)
      .map((r) => r.id);
    const failedSendingIds = result.results
      .filter((r) => !r.success)
      .map((r) => r.id);

    const now = new Date();

    // Update successful sends to SENDING status
    if (successfulSendingIds.length > 0) {
      await prisma.broadcastSend.updateMany({
        where: { sendingId: { in: successfulSendingIds } },
        data: { status: "SENDING", sentAt: now },
      });
    }

    // Update failed sends to FAILED status
    if (failedSendingIds.length > 0) {
      await prisma.broadcastSend.updateMany({
        where: { sendingId: { in: failedSendingIds } },
        data: { status: "FAILED" },
      });
    }

    // Update broadcast aggregates
    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: {
        totalSent: { increment: successfulSendingIds.length },
        totalFailed: { increment: failedSendingIds.length },
      },
    });
  }

  // If any emails failed, log them
  if (result.failed > 0) {
    const failedIds = result.results
      .filter((r) => !r.success)
      .map((r) => r.id)
      .slice(0, 5); // Only show first 5 for logging
    logger.error(
      {
        jobId,
        broadcastId,
        batchId,
        failedCount: result.failed,
        failedIds,
      },
      "Some email-only emails failed to inject",
    );
  }

  // NOTE: No inbox conversations created for email-only sends
};
