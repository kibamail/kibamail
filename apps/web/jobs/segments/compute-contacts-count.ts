/**
 * Compute Contacts Count Job
 *
 * Computes the number of contacts for the given segments.
 * This job runs in the background to update segment contact counts.
 */

import type { ConditionInput } from "@/app/api/v1/segments/schema";
import { prisma } from "@/lib/db";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";
import { conditionsToPrismaWhere } from "@/lib/segments/conditions-to-prisma";
import { getRedisClient } from "@/lib/storage/redis-client";
import { getSegmentContactsKey } from "@/lib/storage/redis-keys";

const logger = queueLogger.child({ job: "compute-contacts-count" });

/**
 * Job processor for computing segment contacts count
 *
 * @param data - Job data containing segment IDs
 * @param jobId - Unique job identifier
 */
export const computeContactsCount: JobProcessor<
  "segments",
  "compute-contacts-count"
> = async (data, jobId) => {
  logger.info(
    {
      jobId,
      segmentIds: data.segmentIds,
      count: data.segmentIds.length,
    },
    "Computing contacts count for segments",
  );

  if (data.segmentIds.length === 0) {
    logger.warn({ jobId }, "No segments to process");
    return;
  }

  const segments = await prisma.segment.findMany({
    where: {
      id: { in: data.segmentIds },
    },
    select: {
      id: true,
      workspaceId: true,
      conditions: true,
    },
  });

  if (segments.length === 0) {
    logger.warn({ jobId, segmentIds: data.segmentIds }, "No segments found");
    return;
  }

  type SegmentData = (typeof segments)[number];
  const segmentsByWorkspace = segments.reduce<Record<string, SegmentData[]>>(
    (acc, segment) => {
      if (!acc[segment.workspaceId]) {
        acc[segment.workspaceId] = [];
      }
      acc[segment.workspaceId].push(segment);
      return acc;
    },
    {},
  );

  const redis = getRedisClient();

  for (const [workspaceId, workspaceSegments] of Object.entries(
    segmentsByWorkspace,
  )) {
    logger.debug(
      {
        jobId,
        workspaceId,
        segmentCount: workspaceSegments.length,
      },
      "Processing workspace segments",
    );

    // Fetch contact properties for this workspace
    const contactProperties = await prisma.contactProperty.findMany({
      where: { workspaceId },
      select: {
        name: true,
        slot: true,
        type: true,
      },
    });

    const counts: Record<string, number> = {};

    for (const segment of workspaceSegments) {
      const whereClause = segment.conditions
        ? conditionsToPrismaWhere(
            segment.conditions as ConditionInput,
            contactProperties,
          )
        : {};

      const count = await prisma.contact.count({
        where: {
          workspaceId,
          ...whereClause,
        },
      });

      counts[segment.id] = count;
    }

    const redisKey = getSegmentContactsKey(workspaceId);

    if (Object.keys(counts).length > 0) {
      const pipeline = redis.pipeline();

      for (const [segmentId, count] of Object.entries(counts)) {
        pipeline.hset(redisKey, segmentId, count);
      }

      pipeline.expire(redisKey, 3600);

      await pipeline.exec();

      logger.info(
        {
          jobId,
          workspaceId,
          redisKey,
          segmentCount: Object.keys(counts).length,
          totalContacts: Object.values(counts).reduce(
            (sum, count) => sum + count,
            0,
          ),
        },
        "Stored segment counts in Redis",
      );
    }
  }
};
