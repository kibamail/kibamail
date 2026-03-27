import type { JobProcessor } from "@/lib/queue";
import { queue, queueLogger } from "@/lib/queue";
import { prisma } from "@/lib/db";

const logger = queueLogger.child({ job: "pause-automation" });

export const pauseAutomation: JobProcessor<
  "automations",
  "pause-automation"
> = async (data, jobId) => {
  const { automationId, workspaceId } = data;

  logger.info({ jobId, automationId }, "Pausing automation runs");

  // Find all active runs with pending jobs
  const activeRuns = await prisma.automationRun.findMany({
    where: {
      automationId,
      workspaceId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      pendingJobId: true,
    },
  });

  if (activeRuns.length === 0) {
    logger.info({ automationId }, "No active runs to pause");
    return;
  }

  const bullmqQueue = queue("automations").getQueue().getQueue();
  let removedJobs = 0;

  // Remove pending BullMQ jobs for each run
  for (const run of activeRuns) {
    if (run.pendingJobId) {
      try {
        const job = await bullmqQueue.getJob(run.pendingJobId);
        if (job) {
          await job.remove();
          removedJobs++;
        }
      } catch (error) {
        logger.warn(
          { runId: run.id, pendingJobId: run.pendingJobId, error },
          "Failed to remove pending job (may already be processed)",
        );
      }
    }
  }

  // Batch update all active runs to PAUSED
  const result = await prisma.automationRun.updateMany({
    where: {
      automationId,
      workspaceId,
      status: "ACTIVE",
    },
    data: {
      status: "PAUSED",
      pendingJobId: null,
    },
  });

  logger.info(
    { automationId, pausedRuns: result.count, removedJobs },
    "Automation runs paused",
  );
};

/**
 * Resume paused runs for an automation.
 * Called when an automation is re-published after being archived/paused.
 */
export async function resumeAutomationRuns(
  automationId: string,
  workspaceId: string,
): Promise<number> {
  const pausedRuns = await prisma.automationRun.findMany({
    where: {
      automationId,
      workspaceId,
      status: "PAUSED",
    },
    select: {
      id: true,
      currentNodeId: true,
      scheduledAt: true,
    },
  });

  if (pausedRuns.length === 0) return 0;

  let resumed = 0;

  for (const run of pausedRuns) {
    if (!run.currentNodeId) continue;

    // Calculate delay for TIME_DELAY nodes
    let delay: number | undefined;
    if (run.scheduledAt) {
      const remaining = run.scheduledAt.getTime() - Date.now();
      delay = remaining > 0 ? remaining : undefined;
    }

    const pendingJobId = await queue("automations").push(
      "execute-step",
      { automationRunId: run.id, nodeId: run.currentNodeId },
      delay ? { delay } : undefined,
    );

    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: "ACTIVE",
        pendingJobId,
      },
    });

    resumed++;
  }

  return resumed;
}
