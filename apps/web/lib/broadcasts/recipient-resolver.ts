/**
 * Broadcast Recipient Resolver
 *
 * Resolves broadcast recipients from various sources and fetches full contact data
 * including custom properties for email personalization.
 */

import { prisma } from "@/lib/db";
import { buildContactProperties } from "@/lib/contacts/properties";
import type { ContactPropertyValue } from "@/lib/contacts/properties";

export interface RecipientContact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  properties: Record<string, ContactPropertyValue>;
}

export interface RecipientResolution {
  contactIds: string[];
  contacts: RecipientContact[];
}

export interface RecipientsInput {
  contacts?: string[];
  emails?: string[];
  segment?: string;
  topic?: string;
}

/**
 * Resolve recipients to contact IDs and fetch full contact data with properties
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

  if (recipients.emails?.length) {
    return resolveByEmails(workspaceId, recipients.emails);
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
 * Resolve recipients by email addresses (upsert contacts if not exists)
 */
async function resolveByEmails(
  workspaceId: string,
  emails: string[],
): Promise<RecipientResolution> {
  const existingContacts = await prisma.contact.findMany({
    where: {
      email: { in: emails },
      workspaceId,
    },
  });

  const existingEmails = new Set(existingContacts.map((c) => c.email));
  const newEmails = emails.filter((e) => !existingEmails.has(e));

  if (newEmails.length > 0) {
    await prisma.$transaction(
      newEmails.map((email) =>
        prisma.contact.create({
          data: {
            workspaceId,
            email,
            status: "SUBSCRIBED",
          },
        }),
      ),
    );

    const newContacts = await prisma.contact.findMany({
      where: {
        email: { in: newEmails },
        workspaceId,
      },
    });

    existingContacts.push(...newContacts);
  }

  const propertyDefs = await prisma.contactProperty.findMany({
    where: { workspaceId },
    select: { name: true, slot: true },
  });

  const contactsWithProperties = existingContacts.map((contact) => ({
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
