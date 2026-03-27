import type { Automation, Contact } from "@prisma/client";
import { prisma } from "@/lib/db";
import { findTriggerNode, findNextNodeIds, getNodeById, type FlowNode, type FlowEdge } from "./graph";
import { AUTOMATION_RULES, getNodeConfig } from "./config";
import { evaluateCondition, pickSplit, createSeededRandom } from "./simulation/evaluators";
import { describeTrigger, describeCondition, describeActionType, describeAction } from "./simulation/describers";
import type { SimulationStep, SimulationResult } from "./simulation/types";

export type { SimulationStep, SimulationResult } from "./simulation/types";

const MAX_STEPS = 100;

export async function simulateAutomation(
  automation: Automation,
  contact: Contact,
  workspaceId: string,
  seed?: number,
): Promise<SimulationResult> {
  const nodes = automation.nodes as unknown as FlowNode[];
  const edges = automation.edges as unknown as FlowEdge[];
  const steps: SimulationStep[] = [];
  let stepNumber = 0;

  const triggerNode = findTriggerNode(nodes);
  if (!triggerNode) {
    return buildResult(automation, contact, "error", steps, "Automation has no trigger node");
  }

  steps.push({
    step: ++stepNumber,
    nodeId: triggerNode.id,
    nodeType: triggerNode.type,
    nodeName: getNodeConfig(triggerNode.type)?.name ?? triggerNode.type,
    action: "trigger",
    detail: describeTrigger(automation, triggerNode),
  });

  const firstNodeIds = findNextNodeIds(edges, triggerNode.id);
  if (firstNodeIds.length === 0) {
    return buildResult(automation, contact, "completed", steps);
  }

  let currentNodeId: string | null = firstNodeIds[0];
  const seededRandom = seed !== undefined ? createSeededRandom(seed) : null;

  const contactProperties = await prisma.contactProperty.findMany({
    where: { workspaceId },
    select: { name: true, slot: true, type: true },
  });

  while (currentNodeId && stepNumber < MAX_STEPS) {
    const node = getNodeById(nodes, currentNodeId);
    if (!node) {
      return buildResult(automation, contact, "error", steps, `Node '${currentNodeId}' not found in graph`);
    }

    const nodeName = getNodeConfig(node.type)?.name ?? node.type;
    const step = await simulateNode(node, nodeName, contact, workspaceId, contactProperties, seededRandom);

    steps.push({ step: ++stepNumber, ...step });
    currentNodeId = advanceToNext(edges, node, step.branch);
  }

  if (stepNumber >= MAX_STEPS) {
    return buildResult(automation, contact, "error", steps, "Simulation exceeded maximum steps (possible circular reference)");
  }

  return buildResult(automation, contact, "completed", steps);
}

async function simulateNode(
  node: FlowNode,
  nodeName: string,
  contact: Contact,
  workspaceId: string,
  contactProperties: Array<{ name: string; slot: string; type: string }>,
  seededRandom: (() => number) | null,
): Promise<Omit<SimulationStep, "step">> {
  if (node.type === AUTOMATION_RULES.IF_ELSE.id) {
    const branch = await evaluateCondition(contact, node, workspaceId, contactProperties);
    return {
      nodeId: node.id, nodeType: node.type, nodeName,
      action: "evaluated_condition",
      detail: describeCondition(node, branch),
      branch,
    };
  }

  if (node.type === AUTOMATION_RULES.PERCENTAGE_SPLIT.id) {
    const splits = node.data.splits as Array<{ id: string; name: string; percentage: number }>;
    const branch = pickSplit(splits, seededRandom);
    const split = splits.find((s) => s.id === branch);
    return {
      nodeId: node.id, nodeType: node.type, nodeName,
      action: "split",
      detail: `Routed to '${split?.name ?? branch}' (${split?.percentage ?? "?"}%)`,
      branch,
    };
  }

  if (node.type === AUTOMATION_RULES.TIME_DELAY.id) {
    return {
      nodeId: node.id, nodeType: node.type, nodeName,
      action: "would_wait",
      detail: `Would wait ${node.data.duration as number} ${node.data.unit as string} (skipped in simulation)`,
    };
  }

  return {
    nodeId: node.id, nodeType: node.type, nodeName,
    action: describeActionType(node.type),
    detail: await describeAction(node, contact, workspaceId),
  };
}

function advanceToNext(edges: FlowEdge[], node: FlowNode, branch?: string): string | null {
  const nextIds = branch
    ? findNextNodeIds(edges, node.id, branch)
    : findNextNodeIds(edges, node.id);
  return nextIds.length > 0 ? nextIds[0] : null;
}

function buildResult(
  automation: Automation,
  contact: Contact,
  status: "completed" | "error",
  steps: SimulationStep[],
  errorMessage?: string,
): SimulationResult {
  return {
    object: "automation_simulation",
    automationId: automation.id,
    automationName: automation.name,
    contactId: contact.id,
    contactEmail: contact.email,
    status,
    errorMessage,
    totalSteps: steps.length,
    steps,
  };
}
