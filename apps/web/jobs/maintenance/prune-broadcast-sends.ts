/**
 * Prune Broadcast Sends Job
 *
 * Deletes BroadcastSend records older than the retention period.
 * Aggregate stats on Broadcast model are preserved.
 *
 * Run schedule: Daily via cron or manual trigger
 */

import { prisma } from "@/lib/db";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";

const logger = queueLogger.child({ job: "prune-broadcast-sends" });

// Default retention period: 60 days
const DEFAULT_RETENTION_DAYS = 60;

// Process broadcasts in batches to avoid memory issues
const BATCH_SIZE = 100;

export const pruneBroadcastSends: JobProcessor<
  "maintenance",
  "prune-broadcast-sends"
> = async (data, jobId) => {
  const retentionDays = data.retentionDays ?? DEFAULT_RETENTION_DAYS;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  logger.info(
    { jobId, cutoffDate: cutoffDate.toISOString(), retentionDays },
    "Starting broadcast sends pruning"
  );

  let totalBroadcastsPruned = 0;
  let totalRecordsDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    // Find broadcasts that:
    // 1. Are completed (SENT status)
    // 2. Created before the cutoff date
    // 3. Haven't been pruned yet
    const broadcastsToPrune = await prisma.broadcast.findMany({
      where: {
        detailsPruned: false,
        status: "SENT",
        createdAt: { lt: cutoffDate },
      },
      select: { id: true, name: true, createdAt: true },
      take: BATCH_SIZE,
    });

    if (broadcastsToPrune.length === 0) {
      hasMore = false;
      break;
    }

    for (const broadcast of broadcastsToPrune) {
      try {
        // Delete all BroadcastSend records for this broadcast
        const deleteResult = await prisma.broadcastSend.deleteMany({
          where: { broadcastId: broadcast.id },
        });

        // Mark broadcast as pruned
        await prisma.broadcast.update({
          where: { id: broadcast.id },
          data: {
            detailsPruned: true,
            statsRecomputedAt: new Date(),
          },
        });

        totalRecordsDeleted += deleteResult.count;
        totalBroadcastsPruned++;

        logger.debug(
          {
            broadcastId: broadcast.id,
            broadcastName: broadcast.name,
            deletedRecords: deleteResult.count,
          },
          "Pruned broadcast sends"
        );
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : String(error),
            broadcastId: broadcast.id,
          },
          "Failed to prune broadcast sends"
        );
        // Continue with next broadcast
      }
    }

    // If we got fewer than BATCH_SIZE, we're done
    if (broadcastsToPrune.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  logger.info(
    {
      jobId,
      totalBroadcastsPruned,
      totalRecordsDeleted,
      retentionDays,
    },
    "Broadcast sends pruning complete"
  );
};
