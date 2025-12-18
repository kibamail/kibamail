import { prisma } from "@/lib/db";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";

const logger = queueLogger.child({ job: "send-broadcast" });

export const sendBroadcast: JobProcessor<
  "broadcasts",
  "send-broadcast"
> = async (data, jobId) => {
  const { broadcastId } = data;

  logger.info({ jobId, broadcastId }, "Starting broadcast send job");

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
      "Broadcast is not in QUEUED_FOR_SENDING status, skipping"
    );
    return;
  }

  // Log broadcast details for now (actual sending logic to be implemented later)
  logger.info(
    {
      jobId,
      broadcastId,
      name: broadcast.name,
      subject: broadcast.emailContent?.subject,
      sendAt: broadcast.sendAt,
      topicId: broadcast.topicId,
      segmentId: broadcast.segmentId,
      senderEmail: broadcast.senderIdentity
        ? `${broadcast.senderIdentity.email}@${broadcast.senderIdentity.sendingDomain?.name}`
        : null,
    },
    "Broadcast ready to send - logging details (sending not yet implemented)"
  );

  // TODO: Implement actual broadcast sending logic
  // 1. Update status to SENDING
  // 2. Fetch recipients based on topic/segment/all contacts
  // 3. Render email for each recipient (personalization)
  // 4. Queue individual email sends
  // 5. Update status to SENT when complete
};
