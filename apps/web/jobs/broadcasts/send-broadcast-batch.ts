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
 * 4. Injects email directly to MTA via HTTP
 */

import { prisma } from "@/lib/db";
import {
  convertToMtaMessages,
  type EmailBroadcast,
  prepareEmailBatch,
  type PreparedEmail,
} from "@/lib/email";
import { getMtaOptions, injectEmailBatch } from "@/lib/mta";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";
import { ConversationOriginType, MessageDirection } from "@prisma/client";

const logger = queueLogger.child({ job: "send-broadcast-batch" });

/**
 * Create conversations and outbound messages for successfully injected emails
 * This is only done when inbox is enabled for the sending domain
 */
async function createConversationsForEmails(
  preparedEmails: PreparedEmail[],
  successfulEmailIds: Set<string>,
  broadcast: {
    id: string;
    workspaceId: string;
    senderIdentityId: string;
    sendingDomainId: string;
    emailContent: { subject: string };
  },
): Promise<void> {
  // Filter to only successfully injected emails
  const successfulEmails = preparedEmails.filter((e) =>
    successfulEmailIds.has(e.emailSendId),
  );

  if (successfulEmails.length === 0) {
    return;
  }

  const now = new Date();

  // Create conversations and messages in a transaction
  await prisma.$transaction(async (tx) => {
    // Bulk create conversations
    await tx.conversation.createMany({
      data: successfulEmails.map((email) => ({
        workspaceId: broadcast.workspaceId,
        contactId: email.contactId,
        senderIdentityId: broadcast.senderIdentityId,
        sendingDomainId: broadcast.sendingDomainId,
        originType: ConversationOriginType.BROADCAST,
        originId: broadcast.id,
        originEmailSendId: email.emailSendId,
        subject: broadcast.emailContent.subject,
        lastMessageAt: now,
        messageCount: 1,
        unreadCount: 0,
        status: "OPEN",
      })),
      skipDuplicates: true, // In case of retry, don't fail on duplicate
    });

    // Fetch created conversations to get their IDs
    const conversations = await tx.conversation.findMany({
      where: {
        originEmailSendId: { in: successfulEmails.map((e) => e.emailSendId) },
      },
      select: {
        id: true,
        originEmailSendId: true,
      },
    });

    // Create a map for quick lookup
    const conversationMap = new Map(
      conversations.map((c) => [c.originEmailSendId, c.id]),
    );

    // Bulk create inbox messages
    const messageData = successfulEmails
      .map((email) => {
        const conversationId = conversationMap.get(email.emailSendId);
        if (!conversationId) return null;

        return {
          workspaceId: broadcast.workspaceId,
          conversationId,
          direction: MessageDirection.OUTBOUND,
          emailSendId: email.emailSendId,
          fromEmail: `${email.senderEmail}@${email.senderDomain}`,
          fromName: email.senderName || null,
          toEmail: email.recipientEmail,
          toName:
            [email.recipientFirstName, email.recipientLastName]
              .filter(Boolean)
              .join(" ") || null,
          subject: email.subject,
          contentS3Key: `emails/${email.workspaceId}/${broadcast.id}/${email.emailSendId}`,
          messageId: email.messageId,
          status: "READ" as const,
          sentAt: now,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    if (messageData.length > 0) {
      await tx.inboxMessage.createMany({
        data: messageData,
        skipDuplicates: true,
      });
    }
  });

  logger.debug(
    { broadcastId: broadcast.id, conversationCount: successfulEmails.length },
    "Created conversations for broadcast emails",
  );
}

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
    inboxEnabled: broadcast.sendingDomain.inboxEnabled,
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

  // Convert to MTA message format
  const mtaMessages = convertToMtaMessages(preparedEmails);

  // Inject directly to MTA via HTTP
  const mtaOptions = getMtaOptions();
  const result = await injectEmailBatch(mtaOptions, mtaMessages);

  logger.info(
    {
      jobId,
      broadcastId,
      batchId,
      processedCount: contacts.length,
      preparedCount: preparedEmails.length,
      injectedCount: result.successful,
      duplicates: result.duplicates,
      failed: result.failed,
      skippedCount,
    },
    "Batch processing complete - emails injected to MTA",
  );

  // If any emails failed, log them (but don't throw - we still want to create conversations for successful ones)
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
      "Some emails failed to inject",
    );
  }

  // Create conversations for successfully injected emails (only if inbox is enabled)
  if (broadcast.sendingDomain.inboxEnabled && result.successful > 0) {
    const successfulEmailIds = new Set(
      result.results.filter((r) => r.success).map((r) => r.id),
    );

    try {
      await createConversationsForEmails(preparedEmails, successfulEmailIds, {
        id: broadcast.id,
        workspaceId: broadcast.workspaceId,
        senderIdentityId: broadcast.senderIdentity.id,
        sendingDomainId: broadcast.sendingDomain.id,
        emailContent: { subject: broadcast.emailContent.subject },
      });
    } catch (error) {
      // Log but don't fail the job - emails were already sent
      logger.error(
        {
          jobId,
          broadcastId,
          batchId,
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to create conversations for inbox",
      );
    }
  }
};
