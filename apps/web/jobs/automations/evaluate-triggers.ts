import type { JobProcessor } from "@/lib/queue";
import { queue, queueLogger } from "@/lib/queue";
import { prisma } from "@/lib/db";
import {
  EVENT_TO_TRIGGER_MAP,
  type AutomationEvent,
  type AutomationEventType,
} from "@/lib/automations/events";
import {
  findTriggerNode,
  findNextNodeIds,
  type FlowNode,
  type FlowEdge,
} from "@/lib/automations/graph";
import { conditionsToPrismaWhere } from "@/lib/segments/conditions-to-prisma";
import { isTriggerNode } from "@/lib/automations/config";
import { dispatchWebhook } from "@/webhooks/dispatch";

const logger = queueLogger.child({ job: "evaluate-triggers" });

/**
 * Check if an automation's triggerConfig matches the incoming event payload.
 */
function matchesTriggerConfig(
  triggerConfig: Record<string, unknown> | null,
  event: AutomationEvent,
): boolean {
  if (!triggerConfig) return true;

  switch (event.type) {
    case "form.submitted": {
      const configFormId = triggerConfig.formId;
      return !configFormId || configFormId === event.payload.formId;
    }
    case "contact.property_updated": {
      const configPropertyName = triggerConfig.propertyName as string | undefined;
      if (!configPropertyName) return true;
      return event.payload.changedFields.includes(configPropertyName);
    }
    case "email.engagement": {
      const configType = triggerConfig.emailEngagementType as string | undefined;
      if (!configType) return true;
      return configType === event.payload.engagementType;
    }
    case "segment.entered":
    case "segment.exited": {
      const configSegmentId = triggerConfig.segmentId;
      return !configSegmentId || configSegmentId === event.payload.segmentId;
    }
    case "custom_event": {
      const configEventName = triggerConfig.eventName as string | undefined;
      if (!configEventName) return true;
      return configEventName === event.payload.eventName;
    }
    case "contact.subscribed":
    case "api_trigger":
      return true;
    default:
      return true;
  }
}

export const evaluateTriggers: JobProcessor<
  "automations",
  "evaluate-triggers"
> = async (data, jobId) => {
  const { workspaceId, event } = data;
  const typedEvent = event as AutomationEvent;
  const contactId = typedEvent.payload.contactId;

  const triggerType = EVENT_TO_TRIGGER_MAP[typedEvent.type as AutomationEventType];
  if (!triggerType) {
    logger.warn({ jobId, eventType: typedEvent.type }, "Unknown automation event type");
    return;
  }

  logger.info(
    { jobId, workspaceId, eventType: typedEvent.type, triggerType, contactId },
    "Evaluating automation triggers",
  );

  // Find all published automations matching this trigger type
  const automations = await prisma.automation.findMany({
    where: {
      workspaceId,
      triggerType: triggerType as never,
      status: "PUBLISHED",
      deletedAt: null,
    },
  });

  if (automations.length === 0) {
    logger.debug({ jobId, workspaceId, triggerType }, "No matching automations found");
    return;
  }

  // Filter by triggerConfig
  const matched = automations.filter((automation) =>
    matchesTriggerConfig(
      automation.triggerConfig as Record<string, unknown> | null,
      typedEvent,
    ),
  );

  if (matched.length === 0) {
    logger.debug({ jobId, workspaceId, triggerType }, "No automations matched trigger config");
    return;
  }

  // Load contact properties once for condition evaluation
  let contactProperties: Array<{ name: string; slot: string; type: string }> | null = null;

  for (const automation of matched) {
    try {
      const nodes = automation.nodes as unknown as FlowNode[];
      const edges = automation.edges as unknown as FlowEdge[];

      // Find trigger node and check optional conditions
      const triggerNode = findTriggerNode(nodes);
      if (!triggerNode) {
        logger.warn({ automationId: automation.id }, "Automation has no trigger node");
        continue;
      }

      // Evaluate trigger node conditions if present
      if (triggerNode.data.conditions) {
        if (!contactProperties) {
          contactProperties = await prisma.contactProperty.findMany({
            where: { workspaceId },
            select: { name: true, slot: true, type: true },
          });
        }

        const conditionsWhere = conditionsToPrismaWhere(
          triggerNode.data.conditions as never,
          contactProperties,
        );

        const matchingContact = await prisma.contact.findFirst({
          where: { id: contactId, workspaceId, ...conditionsWhere },
          select: { id: true },
        });

        if (!matchingContact) {
          logger.debug(
            { automationId: automation.id, contactId },
            "Contact does not match trigger conditions",
          );
          continue;
        }
      }

      // Check for existing active run (dedup)
      const existingActiveRun = await prisma.automationRun.findFirst({
        where: {
          automationId: automation.id,
          contactId,
          status: "ACTIVE",
        },
      });

      if (existingActiveRun) {
        logger.debug(
          { automationId: automation.id, contactId, runId: existingActiveRun.id },
          "Contact already has active run, skipping",
        );
        continue;
      }

      // Find the first action node (connected to trigger)
      const nextNodeIds = findNextNodeIds(edges, triggerNode.id);
      if (nextNodeIds.length === 0) {
        logger.warn({ automationId: automation.id }, "Trigger node has no outgoing edges");
        continue;
      }

      const firstNodeId = nextNodeIds[0];

      // Create the automation run
      const run = await prisma.automationRun.create({
        data: {
          automationId: automation.id,
          contactId,
          workspaceId,
          status: "ACTIVE",
          currentNodeId: firstNodeId,
          executionState: {
            completedNodes: [],
            branchDecisions: {},
          },
          metadata: {
            entrySource: typedEvent.type,
            triggerPayload: typedEvent.payload,
          },
        },
      });

      // Dispatch first execute-step job
      const pendingJobId = await queue("automations").push("execute-step", {
        automationRunId: run.id,
        nodeId: firstNodeId,
      });

      // Store the pending job ID
      await prisma.automationRun.update({
        where: { id: run.id },
        data: { pendingJobId },
      });

      // Dispatch automation.contact_entered webhook
      await dispatchWebhook(workspaceId, "automation.contact_entered", {
        automationId: automation.id,
        automationRunId: run.id,
        contactId,
        triggerType: automation.triggerType,
        triggerSourceId: null,
      });

      logger.info(
        { automationId: automation.id, runId: run.id, contactId, firstNodeId },
        "Automation run created and first step dispatched",
      );
    } catch (error) {
      logger.error(
        { error, automationId: automation.id, contactId },
        "Failed to process automation trigger",
      );
      // Continue with other automations — don't let one failure block others
    }
  }
};
