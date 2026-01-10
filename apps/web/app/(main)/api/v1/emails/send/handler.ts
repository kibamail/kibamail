/**
 * Transactional Email Handler (External API)
 *
 * Business logic for sending transactional emails via API.
 * Handles validation, sender identity resolution, attachment uploads, and job queuing.
 */

import { createId } from "@paralleldrive/cuid2";
import type { NextRequest } from "next/server";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import { responseCreated } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { uploadPrivateFile } from "@/lib/storage";
import { queue } from "@/lib/queue";
import {
  sendTransactionalEmailSchema,
  type TransactionalAttachment,
} from "./schema";

/**
 * Parse an email address into local part and domain
 *
 * @param email - Full email address (e.g., "info@example.com")
 * @returns Object with local part and domain
 *
 * @example
 * ```ts
 * parseEmailAddress("info@example.com")
 * // Returns: { local: "info", domain: "example.com" }
 * ```
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
 *
 * @param workspaceId - Workspace ID
 * @param fromEmail - Full from email address
 * @param sendingDomainId - Sending domain ID
 * @returns Sender identity record
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
 * Upload a base64 encoded attachment to S3
 *
 * @param workspaceId - Workspace ID
 * @param emailSendId - Email send ID for organization
 * @param index - Attachment index for filename
 * @param attachment - Attachment object with filename and base64 content
 * @returns S3 attachment object with key and metadata
 */
async function uploadAttachment(
  workspaceId: string,
  emailSendId: string,
  index: number,
  attachment: TransactionalAttachment,
): Promise<{
  s3_key: string;
  file_name: string;
  content_type: string;
}> {
  try {
    const buffer = Buffer.from(attachment.content, "base64");
    const s3Key = `emails/${workspaceId}/transactional/${emailSendId}/${index}-${attachment.filename}`;

    await uploadPrivateFile(s3Key, buffer, attachment.contentType);

    return {
      s3_key: s3Key,
      file_name: attachment.filename,
      content_type: attachment.contentType,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new BadRequestError(
      `Failed to upload attachment: ${attachment.filename}. Error: ${errorMessage}`,
      ErrorCode.INVALID_ATTACHMENT_FORMAT,
    );
  }
}

/**
 * Send a transactional email
 *
 * @param workspaceId - Workspace ID from API key
 * @param request - Next.js request object
 */
export async function sendTransactionalEmail(
  workspaceId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(sendTransactionalEmailSchema, request);

  const { from, to, subject, html, text, attachments, metadata } = data;

  const normalizedTo = Array.isArray(to) ? to : [to];

  if (normalizedTo.length === 0) {
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

  const { local, domain: domainName } = parseEmailAddress(from);

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

  const emailSendId = createId();

  let uploadedAttachments: Array<{
    s3_key: string;
    file_name: string;
    content_type: string;
  }> = [];

  if (attachments && attachments.length > 0) {
    uploadedAttachments = await Promise.all(
      attachments.map((attachment, index) =>
        uploadAttachment(workspaceId, emailSendId, index, attachment),
      ),
    );
  }

  const attachmentsForJob =
    uploadedAttachments.length > 0 ? uploadedAttachments : undefined;

  await queue("emails").push("send-transactional", {
    emailSendId,
    workspaceId,
    senderIdentityId: senderIdentity.id,
    sendingDomainId: sendingDomain.id,
    replyToEmail: senderIdentity.replyToEmail || undefined,
    to: normalizedTo.length === 1 ? normalizedTo[0] : normalizedTo,
    subject,
    htmlBody: html,
    textBody: text,
    attachments: attachmentsForJob,
    metadata: metadata || undefined,
    inboxEnabled: sendingDomain.inboxEnabled,
  });

  return responseCreated(
    {
      id: emailSendId,
    },
    "email",
  );
}
