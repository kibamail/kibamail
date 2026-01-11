/**
 * Transactional Email Handler (External API)
 *
 * Business logic for sending transactional emails via API.
 * Handles validation, sender identity resolution, and job queuing.
 * Attachment uploads happen in the background job, not during HTTP request.
 */

import { createId } from "@paralleldrive/cuid2";
import type { NextRequest } from "next/server";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import { responseCreated } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import {
  sendTransactionalEmailSchema,
  type TransactionalAttachment,
} from "./schema";

/**
 * Parse an email address into local part and domain
 */
function parseEmailAddress(email: string): { local: string; domain: string } {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) {
    throw new BadRequestError(
      `Invalid email format: ${email}`,
      ErrorCode.INVALID_PARAMETER,
    );
  }

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  return { local, domain };
}

/**
 * Find or create a sender identity for given from email
 */
async function findOrCreateSenderIdentity(
  workspaceId: string,
  fromEmail: string,
  sendingDomainId: string,
) {
  const { local } = parseEmailAddress(fromEmail);

  const existingIdentity = await prisma.senderIdentity.findFirst({
    where: {
      workspaceId,
      sendingDomainId,
      email: local,
    },
  });

  if (existingIdentity) {
    return existingIdentity;
  }

  return prisma.senderIdentity.create({
    data: {
      workspaceId,
      sendingDomainId,
      email: local,
      name: "Transactional Sender",
    },
  });
}

/**
 * Send a transactional email
 *
 * Validates the request and queues one job per recipient.
 * Each recipient gets their own TransactionalEmail record for accurate billing and analytics.
 * All file uploads happen in the background job after MTA injection.
 */
export async function sendTransactionalEmail(
  workspaceId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(sendTransactionalEmailSchema, request);

  const { from, to, replyTo, subject, previewText, html, text, attachments, metadata } = data;

  const recipients = Array.isArray(to) ? to : [to];

  if (recipients.length === 0) {
    throw new BadRequestError(
      "At least one recipient is required",
      ErrorCode.INVALID_PARAMETER,
    );
  }

  if (attachments && attachments.length > 0) {
    const totalSize = attachments.reduce(
      (sum: number, att: TransactionalAttachment) => sum + att.content.length,
      0,
    );
    if (totalSize > 25 * 1024 * 1024) {
      throw new BadRequestError(
        "Total attachment size exceeds 25MB limit",
        ErrorCode.ATTACHMENT_TOO_LARGE,
      );
    }
  }

  const { domain: domainName } = parseEmailAddress(from);

  const sendingDomain = await prisma.sendingDomain.findFirst({
    where: {
      workspaceId,
      name: domainName,
    },
  });

  if (!sendingDomain) {
    throw new NotFoundError(
      `Sending domain not found for email address: ${from}`,
      ErrorCode.SENDING_DOMAIN_NOT_FOUND,
    );
  }

  if (!sendingDomain.dkimVerifiedAt) {
    throw new BadRequestError(
      `Sending domain is not verified: ${domainName}`,
      ErrorCode.SENDING_DOMAIN_NOT_VERIFIED,
    );
  }

  const senderIdentity = await findOrCreateSenderIdentity(
    workspaceId,
    from,
    sendingDomain.id,
  );

  const attachmentsForJob =
    attachments && attachments.length > 0
      ? attachments.map((att, index) => ({
          filename: att.filename,
          contentType: att.contentType,
          content: att.content,
          index,
        }))
      : undefined;

  const replyToForJob: { email: string; name?: string } | undefined = replyTo
    ? { email: replyTo.email, name: replyTo.name }
    : undefined;

  // Queue one job per recipient - each gets their own TransactionalEmail record
  const emailIds: Array<{ id: string; recipient: string }> = [];

  for (const recipient of recipients) {
    const emailSendId = createId();

    await queue("emails").push("send-transactional", {
      emailSendId,
      workspaceId,
      senderIdentityId: senderIdentity.id,
      sendingDomainId: sendingDomain.id,
      replyTo: replyToForJob,
      to: recipient,
      subject,
      previewText,
      htmlBody: html,
      textBody: text,
      attachments: attachmentsForJob,
      metadata: metadata || undefined,
    });

    emailIds.push({ id: emailSendId, recipient });
  }

  // Return single object for single recipient, array for multiple
  if (emailIds.length === 1) {
    return responseCreated(
      {
        id: emailIds[0].id,
      },
      "email",
    );
  }

  return responseCreated(
    {
      emails: emailIds,
    },
    "email_list",
  );
}
