/**
 * Unsubscribe Contact Job
 *
 * Handles contact unsubscription triggered by:
 * - RFC 8058 one-click unsubscribe (List-Unsubscribe-Post header) -> ListUnsubscribe event
 * - Manual unsubscribe link clicks -> Unsubscribed event
 *
 * This job:
 * 1. Updates the contact status to UNSUBSCRIBED
 * 2. Sets the unsubscribedAt timestamp
 * 3. Creates an event for analytics (type depends on source)
 */

import type { EventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";
import { dispatchWebhook } from "@/webhooks";

const logger = queueLogger.child({ job: "unsubscribe" });

export const unsubscribe: JobProcessor<"contacts", "unsubscribe"> = async (
  data,
  jobId,
) => {
  const { contactId, broadcastId, source } = data;

  // Determine event type based on source
  const eventType: EventType =
    source === "list-unsubscribe" ? "ListUnsubscribe" : "Unsubscribed";

  logger.info(
    { jobId, contactId, broadcastId, source, eventType },
    "Processing unsubscribe request",
  );

  // Find the contact
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
      email: true,
      status: true,
      workspaceId: true,
    },
  });

  if (!contact) {
    logger.warn({ jobId, contactId }, "Contact not found");
    return;
  }

  // Check if already unsubscribed (idempotency)
  if (contact.status === "UNSUBSCRIBED") {
    logger.info(
      { jobId, contactId, email: contact.email },
      "Contact already unsubscribed, skipping",
    );
    return;
  }

  // Verify the broadcast exists and belongs to the same workspace
  const broadcast = await prisma.broadcast.findFirst({
    where: {
      id: broadcastId,
      workspaceId: contact.workspaceId,
    },
    select: {
      id: true,
      workspaceId: true,
    },
  });

  if (!broadcast) {
    logger.warn(
      { jobId, contactId, broadcastId },
      "Broadcast not found or does not belong to contact's workspace",
    );
    // Still proceed with unsubscribe - the contact requested it
  }

  // Update contact status and create event in a transaction
  await prisma.$transaction(async (tx) => {
    // Update contact status
    await tx.contact.update({
      where: { id: contact.id },
      data: {
        status: "UNSUBSCRIBED",
        unsubscribedAt: new Date(),
      },
    });

    // Create unsubscribe event for analytics
    // Only use broadcastId if the broadcast was found (foreign key constraint)
    await tx.event.create({
      data: {
        type: eventType,
        workspaceId: contact.workspaceId,
        contactId: contact.id,
        broadcastId: broadcast?.id ?? null,
        recipient: contact.email,
      },
    });
  });

  // Dispatch webhooks for unsubscribe
  await dispatchWebhook(contact.workspaceId, "contact.unsubscribed", {
    contactId: contact.id,
    method: source === "list-unsubscribe" ? "list_unsubscribe" : "link",
    reason: null,
  });

  await dispatchWebhook(contact.workspaceId, "contact.status_changed", {
    contactId: contact.id,
    previousStatus: contact.status,
    newStatus: "UNSUBSCRIBED",
    reason: source === "list-unsubscribe" ? "List-Unsubscribe" : "Unsubscribe link clicked",
  });

  logger.info(
    { jobId, contactId, email: contact.email, broadcastId },
    "Contact unsubscribed successfully",
  );
};
