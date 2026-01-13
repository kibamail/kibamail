/**
 * Unsubscribe by SendingId Job
 *
 * Handles unsubscription for email-only sends (no contact record).
 *
 * This job:
 * 1. Looks up the BroadcastSend by sendingId
 * 2. If contactId exists: delegates to existing contact unsubscribe logic
 * 3. If contactId is null (email-only send): adds email to suppression list
 *
 * The suppression list prevents future sends to this email address.
 */

import type { EventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";

const logger = queueLogger.child({ job: "unsubscribe-by-sending-id" });

export const unsubscribeBySendingId: JobProcessor<
  "contacts",
  "unsubscribe-by-sending-id"
> = async (data, jobId) => {
  const { sendingId, source } = data;

  // Determine event type based on source
  const eventType: EventType =
    source === "list-unsubscribe" ? "ListUnsubscribe" : "Unsubscribed";

  logger.info(
    { jobId, sendingId, source, eventType },
    "Processing unsubscribe-by-sending-id request",
  );

  // Look up the BroadcastSend by sendingId
  const broadcastSend = await prisma.broadcastSend.findUnique({
    where: { sendingId },
    select: {
      id: true,
      broadcastId: true,
      contactId: true,
      workspaceId: true,
      email: true,
    },
  });

  if (!broadcastSend) {
    logger.warn({ jobId, sendingId }, "BroadcastSend not found for sendingId");
    return;
  }

  // If contactId exists, this is a contact-based send
  // Delegate to contact unsubscribe logic
  if (broadcastSend.contactId) {
    logger.info(
      { jobId, sendingId, contactId: broadcastSend.contactId },
      "BroadcastSend has contactId, delegating to contact unsubscribe",
    );

    const contact = await prisma.contact.findUnique({
      where: { id: broadcastSend.contactId },
      select: {
        id: true,
        email: true,
        status: true,
        workspaceId: true,
      },
    });

    if (!contact) {
      logger.warn(
        { jobId, sendingId, contactId: broadcastSend.contactId },
        "Contact not found",
      );
      return;
    }

    // Check if already unsubscribed
    if (contact.status === "UNSUBSCRIBED") {
      logger.info(
        { jobId, contactId: contact.id, email: contact.email },
        "Contact already unsubscribed, skipping",
      );
      return;
    }

    // Update contact status and create event
    await prisma.$transaction(async (tx) => {
      await tx.contact.update({
        where: { id: contact.id },
        data: {
          status: "UNSUBSCRIBED",
          unsubscribedAt: new Date(),
        },
      });

      await tx.event.create({
        data: {
          type: eventType,
          workspaceId: contact.workspaceId,
          contactId: contact.id,
          broadcastId: broadcastSend.broadcastId,
          recipient: contact.email,
        },
      });
    });

    logger.info(
      { jobId, contactId: contact.id, email: contact.email },
      "Contact unsubscribed successfully via sendingId",
    );
    return;
  }

  // Email-only send (no contactId) - add to suppression list
  logger.info(
    { jobId, sendingId, email: broadcastSend.email },
    "Email-only send, adding to suppression list",
  );

  // Check if already suppressed
  const existingSuppression = await prisma.suppressionList.findFirst({
    where: {
      workspaceId: broadcastSend.workspaceId,
      email: broadcastSend.email,
      scope: "GLOBAL",
    },
  });

  if (existingSuppression) {
    logger.info(
      { jobId, email: broadcastSend.email },
      "Email already suppressed, skipping",
    );
    return;
  }

  // Add to suppression list
  await prisma.$transaction(async (tx) => {
    await tx.suppressionList.create({
      data: {
        workspaceId: broadcastSend.workspaceId,
        email: broadcastSend.email,
        contactId: null, // No contact for email-only sends
        scope: "GLOBAL",
        reason: "UNSUBSCRIBED",
        notes: `Unsubscribed via ${source} from broadcast send ${sendingId}`,
      },
    });

    // Create event for analytics
    await tx.event.create({
      data: {
        type: eventType,
        workspaceId: broadcastSend.workspaceId,
        contactId: null,
        broadcastId: broadcastSend.broadcastId,
        recipient: broadcastSend.email,
      },
    });
  });

  logger.info(
    { jobId, email: broadcastSend.email, workspaceId: broadcastSend.workspaceId },
    "Email added to suppression list successfully",
  );
};
