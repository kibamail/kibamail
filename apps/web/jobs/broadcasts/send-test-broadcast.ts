/**
 * Send Test Broadcast Job
 *
 * Sends test emails for a broadcast to a list of provided email addresses.
 * This job is simpler than the regular batch job - no scheduling, no warmup
 * limits, just immediate sending to test recipients.
 *
 * For each test email:
 * 1. Creates a synthetic contact from the email address
 * 2. Renders the email template with personalization
 * 3. Applies tracking (link rewriting, open pixel)
 * 4. Uploads content to S3
 * 5. Injects email directly to MTA via HTTP
 */

import type { BroadcastStyles } from "@/lib/broadcast-renderer";
import { prisma } from "@/lib/db";
import {
  convertToMtaMessages,
  type EmailBroadcast,
  type EmailContact,
  prepareEmailBatch,
} from "@/lib/email";
import { getMtaOptions, injectEmailBatch } from "@/lib/mta";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";

const logger = queueLogger.child({ job: "send-test-broadcast" });

export const sendTestBroadcast: JobProcessor<
  "broadcasts",
  "send-test-broadcast"
> = async (data, jobId) => {
  const { broadcastId, testEmails } = data;

  logger.info(
    { jobId, broadcastId, testEmailCount: testEmails.length },
    "Sending test broadcast",
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
    logger.error({ jobId, broadcastId }, "Broadcast not found");
    throw new Error(`Broadcast ${broadcastId} not found`);
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

  // Create synthetic contacts from test emails
  // Use a timestamp-based ID to ensure uniqueness for tracking URLs
  const timestamp = Date.now();
  const testContacts: EmailContact[] = testEmails.map((email, idx) => ({
    id: `test-${idx}-${timestamp}`,
    email: email.trim(),
    firstName: null,
    lastName: null,
  }));

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
    inboxEnabled: broadcast.sendingDomain.inboxEnabled,
  };

  // Prepare all test emails
  const preparedEmails = await prepareEmailBatch(testContacts, emailBroadcast);

  logger.debug(
    {
      jobId,
      broadcastId,
      preparedCount: preparedEmails.length,
    },
    "Prepared test emails",
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
      testEmailCount: testEmails.length,
      preparedCount: preparedEmails.length,
      injectedCount: result.successful,
      duplicates: result.duplicates,
      failed: result.failed,
    },
    "Test broadcast sent - emails injected to MTA",
  );

  // If any emails failed, throw an error
  if (result.failed > 0) {
    const failedEmails = result.results
      .filter((r) => !r.success)
      .map((r) => r.error)
      .slice(0, 3);
    throw new Error(`Some test emails failed to inject: ${failedEmails.join(", ")}`);
  }
};
