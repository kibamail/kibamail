import * as Tabs from "@kibamail/owly/tabs";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import { getRedisClient } from "@/lib/storage/redis-client";
import { getSegmentContactsKey } from "@/lib/storage/redis-keys";
import { SegmentsTable } from "./_components/segments-table";

async function getSegments(workspaceId: string) {
  const segments = await prisma.segment.findMany({
    where: {
      workspaceId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      conditions: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const redis = getRedisClient();
  const redisKey = getSegmentContactsKey(workspaceId);
  const cachedCounts = await redis.hgetall(redisKey);

  if (Object.keys(cachedCounts).length === 0 && segments.length > 0) {
    const segmentIds = segments.map((s) => s.id);

    await queue("segments").push("compute-contacts-count", {
      segmentIds,
    });
  }

  return segments.map((segment) => {
    const countStr = cachedCounts[segment.id];
    const contactCount = countStr ? parseInt(countStr, 10) : null;

    return {
      ...segment,
      contactCount,
    };
  });
}

export default async function SegmentsPage() {
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const segments = await getSegments(session.currentOrganization.id);

  return (
    <Tabs.Content value="segments" className="py-4">
      <SegmentsTable segments={segments} />
    </Tabs.Content>
  );
}
