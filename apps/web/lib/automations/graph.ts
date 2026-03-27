/**
 * Automation Graph Traversal Utilities
 *
 * Pure functions for navigating React Flow node/edge graphs stored on automations.
 */

import { isTriggerNode } from "./config";

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/**
 * Find the single trigger node in a nodes array.
 * Returns undefined if no trigger node exists.
 */
export function findTriggerNode(nodes: FlowNode[]): FlowNode | undefined {
  return nodes.find((node) => isTriggerNode(node.type));
}

/**
 * Get a node by its ID.
 */
export function getNodeById(
  nodes: FlowNode[],
  nodeId: string,
): FlowNode | undefined {
  return nodes.find((node) => node.id === nodeId);
}

/**
 * Find the target node IDs for outgoing edges from a given node.
 *
 * When sourceHandle is provided, only edges matching that handle are returned.
 * This is used for branching nodes:
 * - IF_ELSE: sourceHandle is "true" or "false"
 * - PERCENTAGE_SPLIT: sourceHandle is the split branch ID
 */
export function findNextNodeIds(
  edges: FlowEdge[],
  currentNodeId: string,
  sourceHandle?: string,
): string[] {
  const outgoing = edges.filter((e) => e.source === currentNodeId);

  if (sourceHandle !== undefined) {
    const matching = outgoing.filter((e) => e.sourceHandle === sourceHandle);
    return matching.map((e) => e.target);
  }

  return outgoing.map((e) => e.target);
}

/**
 * Convert a time delay configuration to milliseconds.
 */
export function delayToMs(
  duration: number,
  unit: "seconds" | "minutes" | "hours" | "days",
): number {
  const multipliers: Record<string, number> = {
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };
  return duration * (multipliers[unit] ?? 0);
}
