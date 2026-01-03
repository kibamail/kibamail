/**
 * Send Broadcast Job
 *
 * Orchestrates the sending of a broadcast by:
 * 1. Fetching the broadcast and its sending domain limits
 * 2. Snapshotting all recipient contact IDs
 * 3. Scheduling batches based on domain warmup limits
 * 4. Dispatching batch jobs with delays
 */

import { scheduleBroadcast } from "@/lib/broadcasts/batch-scheduler";
import { fetchBroadcastRecipientIds } from "@/lib/broadcasts/recipient-fetcher";
import { prisma } from "@/lib/db";
import type { JobProcessor } from "@/lib/queue";
import { queue, queueLogger } from "@/lib/queue";

const logger = queueLogger.child({ job: "send-broadcast" });

export const sendBroadcast: JobProcessor<
  "broadcasts",
  "send-broadcast"
> = async (data, jobId) => {
  const { broadcastId } = data;

  logger.info({ jobId, broadcastId }, "Starting broadcast send job");

  // Fetch broadcast with sender identity and sending domain
  const broadcast = await prisma.broadcast.findUnique({
    where: { id: broadcastId },
    include: {
      emailContent: true,
      senderIdentity: {
        include: {
          sendingDomain: true,
        },
      },
    },
  });

  if (!broadcast) {
    logger.error({ jobId, broadcastId }, "Broadcast not found");
    throw new Error(`Broadcast ${broadcastId} not found`);
  }

  if (broadcast.status !== "QUEUED_FOR_SENDING") {
    logger.warn(
      { jobId, broadcastId, status: broadcast.status },
      "Broadcast is not in QUEUED_FOR_SENDING status, skipping",
    );
    return;
  }

  // Get sending domain limits
  const sendingDomain = broadcast.senderIdentity?.sendingDomain;
  if (!sendingDomain) {
    logger.error(
      { jobId, broadcastId },
      "No sending domain found for broadcast",
    );
    throw new Error(`Broadcast ${broadcastId} has no sending domain`);
  }

  const limits = {
    maxSendPerDay: sendingDomain.maxSendPerDay,
    maxSendPerHour: sendingDomain.maxSendPerHour,
  };

  logger.info(
    { jobId, broadcastId, limits },
    "Retrieved sending domain limits",
  );

  // Update status to SENDING
  await prisma.broadcast.update({
    where: { id: broadcastId },
    data: { status: "SENDING" },
  });

  // Snapshot recipient contact IDs
  const contactIds = await fetchBroadcastRecipientIds(
    broadcast.workspaceId,
    broadcast,
  );

  if (contactIds.length === 0) {
    logger.warn({ jobId, broadcastId }, "No recipients found for broadcast");
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: "SENT" },
    });
    return;
  }

  logger.info(
    { jobId, broadcastId, recipientCount: contactIds.length },
    "Snapshotted recipient contact IDs",
  );

  // Schedule batches based on warmup limits
  const schedule = scheduleBroadcast(contactIds, limits);

  logger.info(
    {
      jobId,
      broadcastId,
      totalRecipients: schedule.totalRecipients,
      totalBatches: schedule.totalBatches,
      totalDays: schedule.totalDays,
      estimatedCompletion: schedule.estimatedCompletion,
    },
    "Generated broadcast schedule",
  );

  // Dispatch batch jobs
  const batchQueue = queue("broadcasts");
  const batchJobs = schedule.batches.map((batch) => ({
    name: "send-broadcast-batch" as const,
    data: {
      broadcastId,
      batchId: batch.batchId,
      contactIds: batch.contactIds,
    },
    options: {
      delay: batch.delayMs,
    },
  }));

  await batchQueue.pushBulk(batchJobs);

  logger.info(
    { jobId, broadcastId, batchCount: batchJobs.length },
    "Dispatched all batch jobs",
  );
};
