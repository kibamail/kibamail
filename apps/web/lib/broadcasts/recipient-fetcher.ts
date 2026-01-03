/**
 * Broadcast Recipient Fetcher
 *
 * Fetches contact IDs for a broadcast based on its audience configuration.
 * Returns a snapshot of contact IDs at the time of fetching.
 */

import type { Broadcast } from "@prisma/client";
import type { ConditionInput } from "@/app/(main)/api/v1/segments/schema";
import { prisma } from "@/lib/db";
import { conditionsToPrismaWhere } from "@/lib/segments/conditions-to-prisma";

/**
 * Fetch all contact IDs for a broadcast's audience
 *
 * This creates a snapshot of the recipients at the time of calling.
 * The snapshot ensures consistency even if segments change later.
 *
 * @param workspaceId - The workspace ID
 * @param broadcast - The broadcast with topicId and segmentId
 * @returns Array of contact IDs
 */
export async function fetchBroadcastRecipientIds(
  workspaceId: string,
  broadcast: Pick<Broadcast, "topicId" | "segmentId">,
): Promise<string[]> {
  // Topic-based audience
  if (broadcast.topicId) {
    const contactTopics = await prisma.contactTopic.findMany({
      where: {
        topicId: broadcast.topicId,
        status: "SUBSCRIBED",
        contact: {
          workspaceId,
          status: "SUBSCRIBED",
        },
      },
      select: {
        contactId: true,
      },
    });

    return contactTopics.map((ct) => ct.contactId);
  }

  // Segment-based audience
  if (broadcast.segmentId) {
    const segment = await prisma.segment.findUnique({
      where: { id: broadcast.segmentId },
    });

    if (!segment) {
      return [];
    }

    if (segment.type === "STATIC") {
      // Static segment: fetch from ContactSegment join table
      const contactSegments = await prisma.contactSegment.findMany({
        where: {
          segmentId: broadcast.segmentId,
          contact: {
            workspaceId,
            status: "SUBSCRIBED",
          },
        },
        select: {
          contactId: true,
        },
      });

      return contactSegments.map((cs) => cs.contactId);
    } else {
      // Dynamic segment: apply segment conditions to query contacts
      const contactProperties = await prisma.contactProperty.findMany({
        where: { workspaceId },
        select: {
          name: true,
          slot: true,
          type: true,
        },
      });

      const whereClause = segment.conditions
        ? conditionsToPrismaWhere(
            segment.conditions as ConditionInput,
            contactProperties,
          )
        : {};

      const contacts = await prisma.contact.findMany({
        where: {
          workspaceId,
          status: "SUBSCRIBED",
          ...whereClause,
        },
        select: {
          id: true,
        },
      });

      return contacts.map((c) => c.id);
    }
  }

  // All contacts (no topic or segment specified)
  const contacts = await prisma.contact.findMany({
    where: {
      workspaceId,
      status: "SUBSCRIBED",
    },
    select: {
      id: true,
    },
  });

  return contacts.map((c) => c.id);
}
