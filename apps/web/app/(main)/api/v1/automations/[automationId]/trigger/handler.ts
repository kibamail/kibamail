import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import { responseCreated } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { queue } from "@/lib/queue";
import { findTriggerNode, findNextNodeIds, type FlowNode, type FlowEdge } from "@/lib/automations/graph";
import { dispatchWebhook } from "@/webhooks/dispatch";

const triggerSchema = z.object({
  contactId: z.string().min(1, "contactId is required"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function triggerAutomation(
  workspaceId: string,
  automationId: string,
  request: NextRequest,
) {
  const body = await validateRequestBody(triggerSchema, request);

  const automation = await prisma.automation.findFirst({
    where: { id: automationId, workspaceId, deletedAt: null },
  });

  if (!automation) {
    throw new NotFoundError("Automation not found", ErrorCode.RESOURCE_NOT_FOUND);
  }

  if (automation.status !== "PUBLISHED") {
    throw new BadRequestError(
      "Automation must be published to trigger",
      ErrorCode.INVALID_PARAMETER,
    );
  }

  if (automation.triggerType !== "API") {
    throw new BadRequestError(
      "Only API-type automations can be triggered via this endpoint",
      ErrorCode.INVALID_PARAMETER,
    );
  }

  const contact = await prisma.contact.findFirst({
    where: { id: body.contactId, workspaceId },
    select: { id: true },
  });

  if (!contact) {
    throw new BadRequestError(
      "Contact not found in this workspace",
      ErrorCode.RESOURCE_NOT_FOUND,
    );
  }

  const existingRun = await prisma.automationRun.findFirst({
    where: {
      automationId: automation.id,
      contactId: body.contactId,
      status: "ACTIVE",
    },
  });

  if (existingRun) {
    throw new ConflictError(
      "Contact already has an active run for this automation",
      ErrorCode.RESOURCE_ALREADY_EXISTS,
    );
  }

  const nodes = automation.nodes as unknown as FlowNode[];
  const edges = automation.edges as unknown as FlowEdge[];
  const triggerNode = findTriggerNode(nodes);

  if (!triggerNode) {
    throw new BadRequestError(
      "Automation has no trigger node",
      ErrorCode.INVALID_PARAMETER,
    );
  }

  const nextNodeIds = findNextNodeIds(edges, triggerNode.id);
  if (nextNodeIds.length === 0) {
    throw new BadRequestError(
      "Automation trigger has no connected nodes",
      ErrorCode.INVALID_PARAMETER,
    );
  }

  const firstNodeId = nextNodeIds[0];

  const run = await prisma.automationRun.create({
    data: {
      automationId: automation.id,
      contactId: body.contactId,
      workspaceId,
      status: "ACTIVE",
      currentNodeId: firstNodeId,
      executionState: {
        completedNodes: [],
        branchDecisions: {},
      },
      metadata: {
        entrySource: "api_trigger",
        triggerPayload: body.metadata || {},
      },
    },
  });

  const pendingJobId = await queue("automations").push("execute-step", {
    automationRunId: run.id,
    nodeId: firstNodeId,
  });

  await prisma.automationRun.update({
    where: { id: run.id },
    data: { pendingJobId },
  });

  await dispatchWebhook(workspaceId, "automation.contact_entered", {
    automationId: automation.id,
    automationRunId: run.id,
    contactId: body.contactId,
    triggerType: "API",
    triggerSourceId: null,
  });

  return responseCreated({
    object: "automation_run",
    id: run.id,
    automationId: automation.id,
    contactId: body.contactId,
    status: "ACTIVE",
  });
}
