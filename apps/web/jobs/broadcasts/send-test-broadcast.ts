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
 * 5. Publishes email message to NATS for MTA injection
 */

import { prisma } from "@/lib/db";
import {
  convertToNatsMessages,
  type EmailBroadcast,
  type EmailContact,
  prepareEmailBatch,
} from "@/lib/email";
import { getNatsOptions, publishEmailBatch } from "@/lib/nats";
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

  if (!broadcast.senderIdentity || !broadcast.sendingDomain) {
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

  // Build reply-to email: use replyToIdentity if set, otherwise default to senderIdentity
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
      sendingDomain: broadcast.senderIdentity.sendingDomain!,
    },
    sendingDomain: broadcast.sendingDomain,
    trackOpens: broadcast.trackOpens,
    trackClicks: broadcast.trackClicks,
    replyToEmail,
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
      testEmailCount: testEmails.length,
      preparedCount: preparedEmails.length,
      publishedCount: acks.length,
      duplicates,
    },
    "Test broadcast sent - emails published to NATS",
  );
};
