import type { Contact } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conditionsToPrismaWhere } from "@/lib/segments/conditions-to-prisma";
import type { FlowNode } from "../graph";

export async function evaluateCondition(
  contact: Contact,
  node: FlowNode,
  workspaceId: string,
  contactProperties: Array<{ name: string; slot: string; type: string }>,
): Promise<string> {
  const conditions = node.data.conditions;
  if (!conditions) return "true";

  const conditionsWhere = conditionsToPrismaWhere(conditions as never, contactProperties);
  const match = await prisma.contact.findFirst({
    where: { id: contact.id, workspaceId, ...conditionsWhere },
    select: { id: true },
  });

  return match ? "true" : "false";
}

export function pickSplit(
  splits: Array<{ id: string; percentage: number }>,
  seededRandom: (() => number) | null,
): string {
  const random = (seededRandom ? seededRandom() : Math.random()) * 100;
  let cumulative = 0;
  for (const split of splits) {
    cumulative += split.percentage;
    if (random < cumulative) return split.id;
  }
  return splits[splits.length - 1].id;
}

export function createSeededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
