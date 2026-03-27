import type { JobProcessor } from "@/lib/queue";
import { queue, queueLogger } from "@/lib/queue";
import { prisma } from "@/lib/db";
import {
  findNextNodeIds,
  getNodeById,
  delayToMs,
  type FlowNode,
  type FlowEdge,
} from "@/lib/automations/graph";
import { AUTOMATION_RULES } from "@/lib/automations/config";
import { getExecutor } from "@/lib/automations/executors";
import { conditionsToPrismaWhere } from "@/lib/segments/conditions-to-prisma";
import { dispatchWebhook } from "@/webhooks/dispatch";

const logger = queueLogger.child({ job: "execute-step" });

interface ExecutionState {
  completedNodes: string[];
  branchDecisions: Record<string, string>;
}

export const executeStep: JobProcessor<
  "automations",
  "execute-step"
> = async (data, jobId) => {
  const { automationRunId, nodeId } = data;

  const run = await prisma.automationRun.findUnique({
    where: { id: automationRunId },
    include: {
      automation: true,
      contact: true,
    },
  });

  if (!run) {
    logger.warn({ jobId, automationRunId }, "Automation run not found");
    return;
  }

  // Guard: only process ACTIVE runs
  if (run.status !== "ACTIVE") {
    logger.debug({ jobId, automationRunId, status: run.status }, "Run is not active, skipping");
    return;
  }

  // Guard: automation must still be published
  if (run.automation.status !== "PUBLISHED") {
    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
        pendingJobId: null,
        errorMessage: "Automation is no longer published",
      },
    });
    logger.info({ jobId, automationRunId }, "Automation no longer published, run cancelled");
    return;
  }

  const nodes = run.automation.nodes as unknown as FlowNode[];
  const edges = run.automation.edges as unknown as FlowEdge[];
  const node = getNodeById(nodes, nodeId);

  if (!node) {
    await markFailed(run.id, run.workspaceId, run.automation.id, run.contactId, `Node ${nodeId} not found in automation graph`, nodeId);
    return;
  }

  const executionState: ExecutionState = (run.executionState as unknown as ExecutionState) || {
    completedNodes: [],
    branchDecisions: {},
  };

  logger.info(
    { jobId, automationRunId, nodeId, nodeType: node.type },
    "Executing automation step",
  );

  try {
    let nextNodeIds: string[] = [];
    let dispatched = false;

    // Handle rule nodes inline
    if (node.type === AUTOMATION_RULES.IF_ELSE.id) {
      const result = await evaluateIfElse(run, node);
      executionState.branchDecisions[nodeId] = result;
      nextNodeIds = findNextNodeIds(edges, nodeId, result);
    } else if (node.type === AUTOMATION_RULES.PERCENTAGE_SPLIT.id) {
      const result = evaluatePercentageSplit(node);
      executionState.branchDecisions[nodeId] = result;
      nextNodeIds = findNextNodeIds(edges, nodeId, result);
    } else if (node.type === AUTOMATION_RULES.TIME_DELAY.id) {
      const duration = node.data.duration as number;
      const unit = node.data.unit as "seconds" | "minutes" | "hours" | "days";
      const delayMs = delayToMs(duration, unit);

      nextNodeIds = findNextNodeIds(edges, nodeId);
      if (nextNodeIds.length > 0) {
        const nextNodeId = nextNodeIds[0];
        const pendingJobId = await queue("automations").push(
          "execute-step",
          { automationRunId: run.id, nodeId: nextNodeId },
          { delay: delayMs },
        );

        executionState.completedNodes.push(nodeId);

        await prisma.automationRun.update({
          where: { id: run.id },
          data: {
            currentNodeId: nodeId,
            scheduledAt: new Date(Date.now() + delayMs),
            pendingJobId,
            executionState: executionState as never,
          },
        });

        await dispatchStepCompleted(run, node);
        dispatched = true;
      }
    } else {
      // Action node — execute via the executor registry
      const executor = getExecutor(node.type);
      if (executor) {
        await executor(
          {
            run,
            automation: run.automation,
            contact: run.contact,
            workspaceId: run.workspaceId,
          },
          node.data,
        );
      } else {
        logger.warn({ nodeType: node.type }, "No executor found for node type, skipping");
      }
      nextNodeIds = findNextNodeIds(edges, nodeId);
    }

    // If TIME_DELAY already dispatched, we're done
    if (dispatched) return;

    executionState.completedNodes.push(nodeId);

    // Terminal node — run complete
    if (nextNodeIds.length === 0) {
      await prisma.automationRun.update({
        where: { id: run.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          currentNodeId: null,
          pendingJobId: null,
          executionState: executionState as never,
        },
      });

      await dispatchStepCompleted(run, node);
      await dispatchWebhook(run.workspaceId, "automation.contact_exited", {
        automationId: run.automation.id,
        automationRunId: run.id,
        contactId: run.contactId,
        exitReason: "completed",
      });

      logger.info({ automationRunId, nodeId }, "Automation run completed");
      return;
    }

    // Advance to next node
    const nextNodeId = nextNodeIds[0];
    const pendingJobId = await queue("automations").push("execute-step", {
      automationRunId: run.id,
      nodeId: nextNodeId,
    });

    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        currentNodeId: nextNodeId,
        pendingJobId,
        scheduledAt: null,
        executionState: executionState as never,
      },
    });

    await dispatchStepCompleted(run, node);
  } catch (error) {
    // Check if this is the last attempt
    const bullmqQueue = queue("automations").getQueue().getQueue();
    const job = await bullmqQueue.getJob(jobId);
    const maxAttempts = job?.opts?.attempts ?? 3;
    const isLastAttempt = job ? job.attemptsMade >= maxAttempts : true;

    if (isLastAttempt) {
      await markFailed(
        run.id,
        run.workspaceId,
        run.automation.id,
        run.contactId,
        error instanceof Error ? error.message : String(error),
        nodeId,
      );
    }

    throw error;
  }
};

async function evaluateIfElse(
  run: { contactId: string; workspaceId: string; contact: { id: string } },
  node: FlowNode,
): Promise<string> {
  const conditions = node.data.conditions;
  if (!conditions) return "true";

  const contactProperties = await prisma.contactProperty.findMany({
    where: { workspaceId: run.workspaceId },
    select: { name: true, slot: true, type: true },
  });

  const conditionsWhere = conditionsToPrismaWhere(
    conditions as never,
    contactProperties,
  );

  const match = await prisma.contact.findFirst({
    where: { id: run.contactId, ...conditionsWhere },
    select: { id: true },
  });

  return match ? "true" : "false";
}

function evaluatePercentageSplit(node: FlowNode): string {
  const splits = node.data.splits as Array<{
    id: string;
    name: string;
    percentage: number;
  }>;

  const random = Math.random() * 100;
  let cumulative = 0;

  for (const split of splits) {
    cumulative += split.percentage;
    if (random < cumulative) {
      return split.id;
    }
  }

  // Fallback to last split
  return splits[splits.length - 1].id;
}

async function markFailed(
  runId: string,
  workspaceId: string,
  automationId: string,
  contactId: string,
  errorMessage: string,
  failedNodeId: string,
): Promise<void> {
  await prisma.automationRun.update({
    where: { id: runId },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      pendingJobId: null,
      errorMessage,
    },
  });

  await dispatchWebhook(workspaceId, "automation.failed", {
    automationId,
    automationRunId: runId,
    contactId,
    error: errorMessage,
    failedNodeId,
  });

  logger.error({ runId, errorMessage, failedNodeId }, "Automation run failed");
}

async function dispatchStepCompleted(
  run: { id: string; workspaceId: string; contactId: string; automation: { id: string } },
  node: FlowNode,
): Promise<void> {
  await dispatchWebhook(run.workspaceId, "automation.step_completed", {
    automationId: run.automation.id,
    automationRunId: run.id,
    contactId: run.contactId,
    nodeId: node.id,
    nodeType: node.type,
    nodeName: (node.data.label as string) || null,
  });
}
