/**
 * Webhook Data Enrichers
 *
 * Functions to fetch and transform database entities into webhook payload format.
 * These are used by the webhook job processor to enrich minimal ID payloads
 * into full webhook payloads before sending to Outpost.
 */

import { prisma } from "@/lib/db";
import type {
  WebhookContact,
  WebhookBroadcast,
  WebhookTopicEntity,
  WebhookTag,
  WebhookSegment,
  WebhookForm,
  WebhookFormSubmission,
  WebhookAutomation,
  WebhookAutomationRun,
  WebhookTransactionalEmail,
  WebhookDomain,
  WebhookSuppressionEntry,
  WebhookApiKey,
  WebhookConversation,
  WebhookConversationMessage,
} from "./payloads";

// =============================================================================
// CONTACT ENRICHER
// =============================================================================

export async function enrichContact(
  contactId: string
): Promise<WebhookContact | null> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact) return null;

  // Fetch contact properties for this workspace
  const contactProperties = await prisma.contactProperty.findMany({
    where: { workspaceId: contact.workspaceId },
  });

  // Build custom properties from slots
  const customProperties: Record<string, string | number | null> = {};
  for (const prop of contactProperties) {
    const slotValue = contact[prop.slot as keyof typeof contact];
    if (slotValue !== null && slotValue !== undefined) {
      customProperties[prop.name] =
        typeof slotValue === "object" && slotValue instanceof Date
          ? slotValue.toISOString()
          : (slotValue as string | number);
    }
  }

  return {
    id: contact.id,
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
    phone: contact.phone,
    country: contact.country,
    timezone: contact.timezone,
    city: contact.city,
    status: contact.status,
    sourceType: contact.sourceType,
    subscribedAt: contact.subscribedAt?.toISOString() ?? null,
    unsubscribedAt: contact.unsubscribedAt?.toISOString() ?? null,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
    customProperties,
  };
}

// =============================================================================
// BROADCAST ENRICHER
// =============================================================================

export async function enrichBroadcast(
  broadcastId: string
): Promise<WebhookBroadcast | null> {
  const broadcast = await prisma.broadcast.findUnique({
    where: { id: broadcastId },
  });

  if (!broadcast) return null;

  return {
    id: broadcast.id,
    name: broadcast.name,
    status: broadcast.status,
    isAbTest: broadcast.isAbTest,
    sendAt: broadcast.sendAt?.toISOString() ?? null,
    createdAt: broadcast.createdAt.toISOString(),
    updatedAt: broadcast.updatedAt.toISOString(),
    stats: {
      totalQueued: broadcast.totalQueued,
      totalSent: broadcast.totalSent,
      totalDelivered: broadcast.totalDelivered,
      totalOpened: broadcast.totalOpened,
      totalClicked: broadcast.totalClicked,
      totalBounced: broadcast.totalBounced,
      totalComplained: broadcast.totalComplained,
      totalFailed: broadcast.totalFailed,
      totalUnsubscribed: broadcast.totalUnsubscribed,
    },
  };
}

// =============================================================================
// TOPIC ENRICHER
// =============================================================================

export async function enrichTopic(
  topicId: string
): Promise<WebhookTopicEntity | null> {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
  });

  if (!topic) return null;

  return {
    id: topic.id,
    name: topic.name,
    description: topic.description,
    visibility: topic.visibility,
    defaultOptIn: topic.defaultOptIn,
    createdAt: topic.createdAt.toISOString(),
    updatedAt: topic.updatedAt.toISOString(),
  };
}

// =============================================================================
// SEGMENT ENRICHER
// =============================================================================

export async function enrichSegment(
  segmentId: string
): Promise<WebhookSegment | null> {
  const segment = await prisma.segment.findUnique({
    where: { id: segmentId },
  });

  if (!segment) return null;

  return {
    id: segment.id,
    name: segment.name,
    description: segment.description,
    type: segment.type,
    createdAt: segment.createdAt.toISOString(),
    updatedAt: segment.updatedAt.toISOString(),
  };
}

// =============================================================================
// FORM ENRICHER
// =============================================================================

export async function enrichForm(formId: string): Promise<WebhookForm | null> {
  const form = await prisma.form.findUnique({
    where: { id: formId },
  });

  if (!form) return null;

  return {
    id: form.id,
    name: form.name,
    description: form.description,
    type: form.type,
    display: form.display,
    status: form.status,
    slug: form.slug,
    publishedAt: form.publishedAt?.toISOString() ?? null,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
  };
}

// =============================================================================
// FORM SUBMISSION ENRICHER
// =============================================================================

export async function enrichFormSubmission(
  submissionId: string
): Promise<WebhookFormSubmission | null> {
  const submission = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    include: {
      form: {
        select: {
          fieldMapping: true,
        },
      },
    },
  });

  if (!submission) return null;

  // Build fields from slots using form's field mapping
  const fields: Record<string, string | number | null> = {};
  const fieldMapping =
    (submission.form.fieldMapping as Record<string, string>) ?? {};

  for (const [fieldName, slot] of Object.entries(fieldMapping)) {
    const slotValue = submission[slot as keyof typeof submission];
    if (
      slotValue !== null &&
      slotValue !== undefined &&
      typeof slotValue !== "object"
    ) {
      fields[fieldName] = slotValue as string | number;
    }
  }

  return {
    id: submission.id,
    formId: submission.formId,
    contactId: submission.contactId,
    status: submission.status,
    ipAddress: submission.ipAddress,
    userAgent: submission.userAgent,
    referrerUrl: submission.referrerUrl,
    landingPageUrl: submission.landingPageUrl,
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
    fields,
  };
}

// =============================================================================
// AUTOMATION ENRICHER
// =============================================================================

export async function enrichAutomation(
  automationId: string
): Promise<WebhookAutomation | null> {
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
  });

  if (!automation) return null;

  return {
    id: automation.id,
    name: automation.name,
    description: automation.description,
    status: automation.status,
    triggerType: automation.triggerType,
    publishedAt: automation.publishedAt?.toISOString() ?? null,
    createdAt: automation.createdAt.toISOString(),
    updatedAt: automation.updatedAt.toISOString(),
  };
}

// =============================================================================
// AUTOMATION RUN ENRICHER
// =============================================================================

export async function enrichAutomationRun(
  automationRunId: string
): Promise<WebhookAutomationRun | null> {
  const run = await prisma.automationRun.findUnique({
    where: { id: automationRunId },
  });

  if (!run) return null;

  return {
    id: run.id,
    automationId: run.automationId,
    contactId: run.contactId,
    status: run.status,
    currentNodeId: run.currentNodeId,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    errorMessage: run.errorMessage,
  };
}

// =============================================================================
// TRANSACTIONAL EMAIL ENRICHER
// =============================================================================

export async function enrichTransactionalEmail(
  transactionalEmailId: string
): Promise<WebhookTransactionalEmail | null> {
  const email = await prisma.transactionalEmail.findUnique({
    where: { id: transactionalEmailId },
  });

  if (!email) return null;

  return {
    id: email.id,
    sendingId: email.sendingId,
    fromEmail: email.fromEmail,
    fromName: email.fromName,
    toEmail: email.toEmail,
    subject: email.subject,
    status: email.status,
    openTrackingEnabled: email.openTrackingEnabled,
    clickTrackingEnabled: email.clickTrackingEnabled,
    metadata: email.metadata as Record<string, unknown> | null,
    tags: email.tags as string[] | null,
    createdAt: email.createdAt.toISOString(),
    sentAt: email.sentAt?.toISOString() ?? null,
    deliveredAt: email.deliveredAt?.toISOString() ?? null,
    firstOpenedAt: email.firstOpenedAt?.toISOString() ?? null,
    firstClickedAt: email.firstClickedAt?.toISOString() ?? null,
    bouncedAt: email.bouncedAt?.toISOString() ?? null,
    complainedAt: email.complainedAt?.toISOString() ?? null,
    openCount: email.openCount,
    clickCount: email.clickCount,
  };
}

// =============================================================================
// DOMAIN ENRICHER
// =============================================================================

export async function enrichDomain(
  domainId: string
): Promise<WebhookDomain | null> {
  const domain = await prisma.sendingDomain.findUnique({
    where: { id: domainId },
  });

  if (!domain) return null;

  return {
    id: domain.id,
    name: domain.name,
    dkimVerifiedAt: domain.dkimVerifiedAt?.toISOString() ?? null,
    returnPathDomainVerifiedAt:
      domain.returnPathDomainVerifiedAt?.toISOString() ?? null,
    trackingDomainVerifiedAt:
      domain.trackingDomainVerifiedAt?.toISOString() ?? null,
    trackingDomainSslVerifiedAt:
      domain.trackingDomainSslVerifiedAt?.toISOString() ?? null,
    dmarcVerifiedAt: domain.dmarcVerifiedAt?.toISOString() ?? null,
    openTrackingEnabled: domain.openTrackingEnabled,
    clickTrackingEnabled: domain.clickTrackingEnabled,
    createdAt: domain.createdAt.toISOString(),
    updatedAt: domain.updatedAt.toISOString(),
  };
}

// =============================================================================
// SUPPRESSION ENRICHER
// =============================================================================

export async function enrichSuppression(
  suppressionId: string
): Promise<WebhookSuppressionEntry | null> {
  const entry = await prisma.suppressionList.findUnique({
    where: { id: suppressionId },
  });

  if (!entry) return null;

  return {
    id: entry.id,
    email: entry.email,
    contactId: entry.contactId,
    scope: entry.scope,
    topicId: entry.topicId,
    reason: entry.reason,
    notes: entry.notes,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

// =============================================================================
// API KEY ENRICHER
// =============================================================================

export async function enrichApiKey(
  apiKeyId: string
): Promise<WebhookApiKey | null> {
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
  });

  if (!apiKey) return null;

  return {
    id: apiKey.id,
    name: apiKey.name,
    keyPreview: apiKey.keyPreview,
    scopes: apiKey.scopes as string[],
    lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
    createdAt: apiKey.createdAt.toISOString(),
    updatedAt: apiKey.updatedAt.toISOString(),
  };
}

// =============================================================================
// CONVERSATION ENRICHER
// =============================================================================

export async function enrichConversation(
  conversationId: string
): Promise<WebhookConversation | null> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { fromEmail: true, toEmail: true },
      },
    },
  });

  if (!conversation) return null;

  // Derive contact email from the first message
  const firstMessage = conversation.messages[0];
  const contactEmail = firstMessage?.fromEmail ?? firstMessage?.toEmail ?? "";

  return {
    id: conversation.id,
    contactId: conversation.contactId,
    contactEmail,
    subject: conversation.subject,
    status: conversation.status,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

// =============================================================================
// CONVERSATION MESSAGE ENRICHER
// =============================================================================

export async function enrichConversationMessage(
  messageId: string
): Promise<WebhookConversationMessage | null> {
  const message = await prisma.inboxMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) return null;

  return {
    id: message.id,
    conversationId: message.conversationId,
    direction: message.direction,
    fromEmail: message.fromEmail,
    toEmail: message.toEmail,
    subject: message.subject,
    textContent: message.textBody,
    createdAt: message.createdAt.toISOString(),
  };
}

// =============================================================================
// BROADCAST SEND ENRICHER (for email events)
// =============================================================================

export async function enrichBroadcastSend(sendingId: string) {
  const send = await prisma.broadcastSend.findUnique({
    where: { sendingId },
    select: {
      sendingId: true,
      email: true,
      contactId: true,
      broadcastId: true,
    },
  });

  return send;
}
