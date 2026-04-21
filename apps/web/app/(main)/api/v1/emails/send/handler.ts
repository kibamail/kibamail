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
import { validateEmailCompliance } from "@/lib/emails/compliance-validation";
import { responseCreated } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import { resolveWorkspaceSettings, buildComplianceVariables } from "@/lib/workspace/settings";
import type { VariableDefinition } from "@/app/(main)/api/internal/v1/email-templates/schema";
import {
  sendTransactionalEmailSchema,
  type TransactionalAttachment,
} from "./schema";

const SANDBOX_DOMAIN = "kibamail.dev";

/**
 * Check if an email address is a sandbox test address
 */
function isSandboxEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain === SANDBOX_DOMAIN;
}

/**
 * Parse a sandbox email address to extract the outcome and optional label
 * e.g., "delivered+test-flow@kibamail.dev" -> { outcome: "delivered", label: "test-flow" }
 */
function parseSandboxEmail(email: string): {
  outcome: string;
  label: string | null;
} {
  const localPart = email.split("@")[0].toLowerCase();
  const [outcome, label] = localPart.split("+");
  return { outcome, label: label || null };
}

/**
 * Parse an email address into local part and domain
 */
function parseEmailAddress(email: string): { local: string; domain: string } {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) {
    throw new BadRequestError(
      `Invalid email format: ${email}`,
      ErrorCode.INVALID_PARAMETER
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
  sendingDomainId: string
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
 * Substitute {{varName}} placeholders with values
 * Missing variables are replaced with empty string
 */
function substituteVariables(
  text: string | null | undefined,
  variables: Record<string, string | number>
): string | null {
  if (!text) return null;
  return text.replace(/\{\{(\w+)\}\}/g, (_match, varName) => {
    const value = variables[varName];
    return value !== undefined ? String(value) : "";
  });
}

/**
 * Validate that provided variable values match expected types
 * Only validates type if variable is defined AND provided
 */
function validateVariableTypes(
  definitions: VariableDefinition[],
  provided: Record<string, string | number>
) {
  for (const def of definitions) {
    const value = provided[def.name];
    if (
      value !== undefined &&
      def.type === "number" &&
      typeof value !== "number"
    ) {
      throw new BadRequestError(
        `Variable '${def.name}' must be a number`,
        ErrorCode.INVALID_PARAMETER
      );
    }
  }
}

/**
 * Resolve template by uniqueSlug and get published content with variable substitution
 */
async function resolveTemplateContent(
  workspaceId: string,
  templateSlug: string,
  userVariables: Record<string, string | number> = {}
): Promise<{
  subject: string | null;
  previewText: string | null;
  html: string;
  text: string | null;
  trackClicks: boolean;
  trackOpens: boolean;
}> {
  // 1. Find parent template by uniqueSlug
  const parentTemplate = await prisma.emailTemplate.findFirst({
    where: {
      workspaceId,
      uniqueSlug: templateSlug,
      parentId: null,
    },
    select: { id: true, publishedVersionId: true },
  });

  if (!parentTemplate) {
    throw new NotFoundError(
      `Template with identifier '${templateSlug}' not found`,
      ErrorCode.TEMPLATE_NOT_FOUND
    );
  }

  if (!parentTemplate.publishedVersionId) {
    throw new BadRequestError(
      `Template '${templateSlug}' is not published`,
      ErrorCode.TEMPLATE_NOT_PUBLISHED
    );
  }

  // 2. Get published version with content
  const publishedVersion = await prisma.emailTemplate.findUnique({
    where: { id: parentTemplate.publishedVersionId },
    include: { emailContent: true },
  });

  if (!publishedVersion?.emailContent) {
    throw new BadRequestError(
      `Template '${templateSlug}' has no content`,
      ErrorCode.TEMPLATE_NO_CONTENT
    );
  }

  if (
    !publishedVersion.emailContent.contentHtml &&
    !publishedVersion.emailContent.contentJson
  ) {
    throw new BadRequestError(
      `Template '${templateSlug}' has no content`,
      ErrorCode.TEMPLATE_NO_CONTENT
    );
  }

  // 3. Validate compliance variables on template HTML
  if (publishedVersion.emailContent.contentHtml) {
    const compliance = validateEmailCompliance(publishedVersion.emailContent.contentHtml, { type: "TRANSACTIONAL" });
    if (!compliance.valid) {
      throw new BadRequestError(
        `Email template is missing required compliance variables: ${compliance.missing.join(", ")}`,
        ErrorCode.VALIDATION_FAILED,
      );
    }
  }

  // 4. Validate variable types
  const definitions =
    (publishedVersion.emailContent.variables as VariableDefinition[]) || [];
  validateVariableTypes(definitions, userVariables);

  // 5. Merge compliance variables as defaults (user variables take priority)
  const settings = await resolveWorkspaceSettings(workspaceId);
  const complianceVars = buildComplianceVariables(settings);
  const allVariables: Record<string, string | number> = { ...complianceVars, ...userVariables };

  // 6. Substitute variables in all content fields
  return {
    subject: substituteVariables(
      publishedVersion.emailContent.subject,
      allVariables
    ),
    previewText: substituteVariables(
      publishedVersion.emailContent.previewText,
      allVariables
    ),
    html:
      substituteVariables(
        publishedVersion.emailContent.contentHtml,
        allVariables
      ) || "",
    text: substituteVariables(
      publishedVersion.emailContent.contentText,
      allVariables
    ),
    trackClicks: publishedVersion.trackClicks,
    trackOpens: publishedVersion.trackOpens,
  };
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
  request: NextRequest
) {
  const data = await validateRequestBody(sendTransactionalEmailSchema, request);

  const { from, to, replyTo, template, attachments, metadata } = data;

  // Resolve content from template or use provided values
  let subject: string;
  let html: string;
  let text: string | undefined;
  let previewText: string | undefined;

  if (template) {
    const templateContent = await resolveTemplateContent(
      workspaceId,
      template.id,
      template.variables || {}
    );

    // User-provided values override template defaults
    subject = data.subject || templateContent.subject || "";
    html = templateContent.html;
    text = templateContent.text || undefined;
    previewText = data.previewText || templateContent.previewText || undefined;

    // Validate subject is not empty after resolution
    if (!subject) {
      throw new BadRequestError(
        "Email subject is required (template has no subject)",
        ErrorCode.INVALID_PARAMETER
      );
    }
  } else {
    subject = data.subject!;
    html = data.html!;
    text = data.text;
    previewText = data.previewText;

    // Validate compliance variables on raw HTML
    const compliance = validateEmailCompliance(html, { type: "TRANSACTIONAL" });
    if (!compliance.valid) {
      throw new BadRequestError(
        `Email HTML is missing required compliance variables: ${compliance.missing.join(", ")}`,
        ErrorCode.VALIDATION_FAILED,
      );
    }
  }

  const recipients = Array.isArray(to) ? to : [to];

  if (recipients.length === 0) {
    throw new BadRequestError(
      "At least one recipient is required",
      ErrorCode.INVALID_PARAMETER
    );
  }

  if (attachments && attachments.length > 0) {
    const totalSize = attachments.reduce(
      (sum: number, att: TransactionalAttachment) => sum + att.content.length,
      0
    );
    if (totalSize > 25 * 1024 * 1024) {
      throw new BadRequestError(
        "Total attachment size exceeds 25MB limit",
        ErrorCode.ATTACHMENT_TOO_LARGE
      );
    }
  }

  // Check if any recipient is a real (non-sandbox) email
  const hasRealRecipient = recipients.some((r) => !isSandboxEmail(r));

  const { local: fromLocal, domain: domainName } = parseEmailAddress(from);

  // For sandbox-only sends, domain setup is optional
  // Users can test with any "from" address without configuring domains
  let sendingDomain: Awaited<
    ReturnType<typeof prisma.sendingDomain.findFirst>
  > = null;
  let senderIdentity: Awaited<
    ReturnType<typeof prisma.senderIdentity.findFirst>
  > = null;

  if (hasRealRecipient) {
    // Real recipients require a fully verified domain
    sendingDomain = await prisma.sendingDomain.findFirst({
      where: {
        workspaceId,
        name: domainName,
      },
    });

    if (!sendingDomain) {
      throw new NotFoundError(
        `Sending domain not found for email address: ${from}`,
        ErrorCode.SENDING_DOMAIN_NOT_FOUND
      );
    }

    if (!sendingDomain.dkimVerifiedAt) {
      throw new BadRequestError(
        `Sending domain DKIM is not verified: ${domainName}`,
        ErrorCode.SENDING_DOMAIN_NOT_VERIFIED
      );
    }

    if (!sendingDomain.returnPathDomainVerifiedAt) {
      throw new BadRequestError(
        `Sending domain return path is not verified: ${domainName}`,
        ErrorCode.SENDING_DOMAIN_NOT_VERIFIED
      );
    }

    senderIdentity = await findOrCreateSenderIdentity(
      workspaceId,
      from,
      sendingDomain.id
    );
  } else {
    // Sandbox-only: try to find domain/identity but don't require them
    sendingDomain = await prisma.sendingDomain.findFirst({
      where: {
        workspaceId,
        name: domainName,
      },
    });

    if (sendingDomain) {
      senderIdentity = await findOrCreateSenderIdentity(
        workspaceId,
        from,
        sendingDomain.id
      );
    }
  }

  const attachmentsForJob =
    attachments && attachments.length > 0
      ? attachments.map((att, index) => ({
          filename: att.filename,
          contentType: att.contentType,
          content: att.content,
          index,
        }))
      : undefined;

  // Default replyTo to sender details if not provided
  const replyToForJob: { email: string; name?: string } = replyTo
    ? { email: replyTo.email, name: replyTo.name }
    : {
        email: from,
        name: senderIdentity?.name ?? fromLocal,
      };

  // Queue one job per recipient - each gets their own TransactionalEmail record
  const emailIds: Array<{ id: string; recipient: string; sandbox: boolean }> =
    [];

  for (const recipient of recipients) {
    const emailSendId = createId();
    const sandbox = isSandboxEmail(recipient);

    if (sandbox) {
      // Route sandbox emails to the sandbox processor
      const { outcome, label } = parseSandboxEmail(recipient);

      await queue("emails").push("process-sandbox", {
        emailSendId,
        workspaceId,
        senderIdentityId: senderIdentity?.id,
        sendingDomainId: sendingDomain?.id,
        fromEmail: from,
        fromName: senderIdentity?.name ?? fromLocal,
        recipient,
        sandboxOutcome: outcome,
        sandboxLabel: label,
        subject,
        previewText,
        htmlBody: html,
        textBody: text,
        replyTo: replyToForJob,
        metadata: metadata || undefined,
      });
    } else {
      // Route real emails to the transactional processor
      // At this point sendingDomain and senderIdentity are guaranteed to exist
      await queue("emails").push("send-transactional", {
        emailSendId,
        workspaceId,
        senderIdentityId: senderIdentity!.id,
        sendingDomainId: sendingDomain!.id,
        replyTo: replyToForJob,
        to: recipient,
        subject,
        previewText,
        htmlBody: html,
        textBody: text,
        attachments: attachmentsForJob,
        metadata: metadata || undefined,
      });
    }

    emailIds.push({ id: emailSendId, recipient, sandbox });
  }

  // Return single object for single recipient, array for multiple
  if (emailIds.length === 1) {
    return responseCreated(
      {
        id: emailIds[0].id,
        sandbox: emailIds[0].sandbox,
      },
      "email"
    );
  }

  return responseCreated(
    {
      emails: emailIds.map((e) => ({
        id: e.id,
        recipient: e.recipient,
        sandbox: e.sandbox,
      })),
    },
    "email_list"
  );
}
