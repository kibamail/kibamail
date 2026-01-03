/**
 * Confirm Double Opt-In Job
 *
 * Confirms a contact's subscription by updating their status from
 * UNCONFIRMED to SUBSCRIBED.
 *
 * This job is dispatched when a user clicks the confirmation link
 * in their double opt-in email.
 */

import { prisma } from "@/lib/db";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";

const logger = queueLogger.child({ job: "confirm-double-opt-in" });

export const confirmDoubleOptIn: JobProcessor<
  "forms",
  "confirm-double-opt-in"
> = async (data, jobId) => {
  const { formId, confirmationToken } = data;

  logger.info(
    { jobId, formId, tokenPrefix: confirmationToken.slice(0, 8) },
    "Processing double opt-in confirmation",
  );

  // Find the contact by confirmation token
  const contact = await prisma.contact.findFirst({
    where: {
      confirmationToken,
    },
    select: {
      id: true,
      email: true,
      status: true,
      workspaceId: true,
    },
  });

  if (!contact) {
    logger.warn(
      { jobId, tokenPrefix: confirmationToken.slice(0, 8) },
      "No contact found with this confirmation token",
    );
    return;
  }

  // Check if already confirmed
  if (contact.status === "SUBSCRIBED") {
    logger.info(
      { jobId, contactId: contact.id, email: contact.email },
      "Contact already confirmed, skipping",
    );
    return;
  }

  // Check if contact is in a valid state for confirmation
  if (contact.status !== "UNCONFIRMED") {
    logger.warn(
      { jobId, contactId: contact.id, status: contact.status },
      "Contact is not in UNCONFIRMED status, cannot confirm",
    );
    return;
  }

  // Verify the form exists and belongs to the same workspace
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: {
      id: true,
      workspaceId: true,
    },
  });

  if (!form) {
    logger.warn({ jobId, formId }, "Form not found");
    return;
  }

  if (form.workspaceId !== contact.workspaceId) {
    logger.warn(
      {
        jobId,
        formId,
        formWorkspaceId: form.workspaceId,
        contactWorkspaceId: contact.workspaceId,
      },
      "Form and contact belong to different workspaces",
    );
    return;
  }

  // Update the contact status to SUBSCRIBED and clear the token
  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      status: "SUBSCRIBED",
      confirmationToken: null,
    },
  });

  logger.info(
    { jobId, contactId: contact.id, email: contact.email, formId },
    "Contact confirmed successfully",
  );
};
