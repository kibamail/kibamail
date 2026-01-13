/**
 * Broadcast Recipient Resolver
 *
 * Resolves broadcast recipients from various sources and fetches full contact data
 * including custom properties for email personalization.
 */

import { prisma } from "@/lib/db";
import { buildContactProperties } from "@/lib/contacts/properties";
import type { ContactPropertyValue } from "@/lib/contacts/properties";

/**
 * Email recipient input - either a simple string or object with variables
 */
export type EmailRecipientInput = string | { email: string; variables?: Record<string, string | number> };

export interface RecipientContact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  properties: Record<string, ContactPropertyValue>;
  /** Transient variables from API request, not persisted to database */
  transientVariables?: Record<string, string | number>;
}

export interface RecipientResolution {
  contactIds: string[];
  contacts: RecipientContact[];
}

/**
 * Email-only recipient (no contact record required)
 * Used for create-and-send API with emails array
 */
export interface EmailOnlyRecipient {
  email: string;
  variables?: Record<string, string | number>;
}

/**
 * Resolution result for email-only sends
 * Does not create or lookup contacts - just passes through the emails
 */
export interface EmailOnlyResolution {
  emails: EmailOnlyRecipient[];
}

export interface RecipientsInput {
  contacts?: string[];
  emails?: EmailRecipientInput[];
  segment?: string;
  topic?: string;
}

/**
 * Resolve recipients to contact IDs and fetch full contact data with properties
 *
 * NOTE: This function handles contact-based recipients only (contacts, segment, topic).
 * For email-only recipients (via create-and-send API with emails array), use
 * resolveByEmails() directly which returns EmailOnlyResolution.
 *
 * @param workspaceId - The workspace ID
 * @param recipients - Recipient specification (one mode required)
 * @returns Object containing contact IDs and full contact data
 */
export async function resolveRecipients(
  workspaceId: string,
  recipients: RecipientsInput,
): Promise<RecipientResolution> {
  if (recipients.contacts?.length) {
    return resolveByContactIds(workspaceId, recipients.contacts);
  }

  if (recipients.segment) {
    return resolveBySegment(workspaceId, recipients.segment);
  }

  if (recipients.topic) {
    return resolveByTopic(workspaceId, recipients.topic);
  }

  return { contactIds: [], contacts: [] };
}

/**
 * Resolve recipients by direct contact IDs
 */
async function resolveByContactIds(
  workspaceId: string,
  contactIds: string[],
): Promise<RecipientResolution> {
  const contacts = await prisma.contact.findMany({
    where: {
      id: { in: contactIds },
      workspaceId,
      status: "SUBSCRIBED",
    },
  });

  const propertyDefs = await prisma.contactProperty.findMany({
    where: { workspaceId },
    select: { name: true, slot: true },
  });

  const contactsWithProperties = contacts.map((contact) => ({
    id: contact.id,
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
    properties: buildContactProperties(contact, propertyDefs),
  }));

  return {
    contactIds: contactsWithProperties.map((c) => c.id),
    contacts: contactsWithProperties,
  };
}

/**
 * Resolve recipients by email addresses (email-only, no contact creation)
 *
 * This function does NOT create or lookup contacts. It simply returns the
 * emails as EmailOnlyRecipients for use with email-only broadcast sends.
 */
export function resolveByEmails(
  emails: EmailRecipientInput[],
): EmailOnlyResolution {
  const emailOnlyRecipients: EmailOnlyRecipient[] = emails.map((item) => {
    if (typeof item === "string") {
      return { email: item };
    }
    return {
      email: item.email,
      variables: item.variables,
    };
  });

  return { emails: emailOnlyRecipients };
}

/**
 * Resolve recipients by segment ID
 */
async function resolveBySegment(
  workspaceId: string,
  segmentId: string,
): Promise<RecipientResolution> {
  const segment = await prisma.segment.findUnique({
    where: { id: segmentId },
  });

  if (!segment) {
    return { contactIds: [], contacts: [] };
  }

  let contacts: Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    [key: string]: unknown;
  }> = [];

  if (segment.type === "STATIC") {
    const contactSegments = await prisma.contactSegment.findMany({
      where: {
        segmentId,
        contact: {
          workspaceId,
          status: "SUBSCRIBED",
        },
      },
      include: {
        contact: true,
      },
    });

    contacts = contactSegments.map((cs) => cs.contact);
  } else {
    const contactProperties = await prisma.contactProperty.findMany({
      where: { workspaceId },
      select: { name: true, slot: true, type: true },
    });

    const conditionInput = segment.conditions as
      | import("@/app/(main)/api/v1/segments/schema").ConditionInput
      | undefined;

    const whereClause = conditionInput
      ? (await import("@/lib/segments/conditions-to-prisma")).conditionsToPrismaWhere(
          conditionInput,
          contactProperties,
        )
      : {};

    contacts = await prisma.contact.findMany({
      where: {
        workspaceId,
        status: "SUBSCRIBED",
        ...whereClause,
      },
    });
  }

  const propertyDefs = await prisma.contactProperty.findMany({
    where: { workspaceId },
    select: { name: true, slot: true },
  });

  const contactsWithProperties = contacts.map((contact) => ({
    id: contact.id,
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
    properties: buildContactProperties(contact, propertyDefs),
  }));

  return {
    contactIds: contactsWithProperties.map((c) => c.id),
    contacts: contactsWithProperties,
  };
}

/**
 * Resolve recipients by topic ID
 */
async function resolveByTopic(
  workspaceId: string,
  topicId: string,
): Promise<RecipientResolution> {
  const contactTopics = await prisma.contactTopic.findMany({
    where: {
      topicId,
      status: "SUBSCRIBED",
      contact: {
        workspaceId,
        status: "SUBSCRIBED",
      },
    },
    include: {
      contact: true,
    },
  });

  const propertyDefs = await prisma.contactProperty.findMany({
    where: { workspaceId },
    select: { name: true, slot: true },
  });

  const contactsWithProperties = contactTopics.map((ct) => ({
    id: ct.contact.id,
    email: ct.contact.email,
    firstName: ct.contact.firstName,
    lastName: ct.contact.lastName,
    properties: buildContactProperties(ct.contact, propertyDefs),
  }));

  return {
    contactIds: contactsWithProperties.map((c) => c.id),
    contacts: contactsWithProperties,
  };
}
