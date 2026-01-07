/**
 * Inbox Email Receive Webhook (Internal API)
 *
 * REST endpoint: /api/internal/v1/webhooks/inbox/receive
 *
 * Supported Methods:
 * - POST   Receive an inbound email from the MTA
 *
 * This endpoint receives raw RFC822 email content from the MTA (KumoMTA)
 * when someone replies to an email sent from the platform. The email is
 * stored in S3 and queued for async processing.
 *
 * Note: This endpoint runs on a private network and does not require
 * authentication. In production, ensure this endpoint is only accessible
 * from the MTA cluster.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { uploadPrivateFile } from "@/lib/storage/private-storage";
import { queue } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";

const logger = queueLogger.child({ module: "inbox-receive-webhook" });

/**
 * POST /api/internal/v1/webhooks/inbox/receive
 *
 * Receive and store an inbound email from the MTA.
 *
 * Headers (set by MTA):
 * - X-Inbox-Token: The emailSendId extracted from plus-addressed recipient
 * - X-Inbox-Recipient: Full recipient email address
 * - X-Inbox-Sender: Sender email address
 * - X-Inbox-Domain: Sending domain name
 * - X-Workspace-Id: Workspace ID (from domain validation)
 * - X-Sending-Domain-Id: Sending domain ID (from domain validation)
 *
 * Body:
 * Raw RFC822 email content (message/rfc822)
 *
 * Response:
 * {
 *   "status": "received",
 *   "message_id": "clxxxxxxxxxx",
 *   "s3_key": "inbox/workspace_123/2024-01-01/clxxxxxxxxxx.eml"
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Extract headers set by MTA
  const token = request.headers.get("X-Inbox-Token") || "";
  const recipient = request.headers.get("X-Inbox-Recipient");
  const sender = request.headers.get("X-Inbox-Sender");
  const workspaceId = request.headers.get("X-Workspace-Id");
  const sendingDomainId = request.headers.get("X-Sending-Domain-Id");

  // Validate required headers
  if (!recipient || !sender || !workspaceId || !sendingDomainId) {
    logger.warn(
      { token, recipient, sender, workspaceId, sendingDomainId },
      "Missing required headers in inbox webhook",
    );
    return NextResponse.json(
      { error: "Missing required headers" },
      { status: 400 },
    );
  }

  logger.info(
    { token, recipient, sender, workspaceId },
    "Received inbound email",
  );

  // Read raw email body
  const rawEmail = await request.text();
  const emailSize = Buffer.byteLength(rawEmail, "utf-8");

  // Generate unique message ID and S3 key
  const messageId = createId();
  const datePrefix = new Date().toISOString().slice(0, 10);
  const s3Key = `inbox/${workspaceId}/${datePrefix}/${messageId}.eml`;

  // Upload raw email to S3
  try {
    await uploadPrivateFile(s3Key, rawEmail, "message/rfc822");
    logger.debug({ s3Key, size: emailSize }, "Raw email uploaded to S3");
  } catch (error) {
    logger.error({ error, s3Key }, "Failed to upload raw email to S3");
    return NextResponse.json(
      { error: "Failed to store email" },
      { status: 500 },
    );
  }

  // Queue the email for async processing
  try {
    await queue("inbox").push("process-inbound-email", {
      token,
      s3Key,
      sender,
      recipient,
      workspaceId,
      sendingDomainId,
      receivedAt: new Date().toISOString(),
    });
    logger.debug({ messageId, token }, "Inbound email queued for processing");
  } catch (error) {
    logger.error({ error, messageId }, "Failed to queue inbound email");
    // Don't fail the request - email is safely stored in S3
    // We can reprocess later
  }

  const duration = Date.now() - startTime;

  logger.info(
    {
      messageId,
      s3Key,
      sender,
      recipient,
      token: token || "(unsolicited)",
      durationMs: duration,
    },
    "Inbound email received and queued",
  );

  return NextResponse.json({
    status: "received",
    message_id: messageId,
    s3_key: s3Key,
  });
}
