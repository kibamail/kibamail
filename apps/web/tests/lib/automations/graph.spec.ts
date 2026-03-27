import { describe, expect, test } from "vitest";
import {
  findTriggerNode,
  findNextNodeIds,
  getNodeById,
  delayToMs,
  type FlowNode,
  type FlowEdge,
} from "@/lib/automations/graph";

function makeNode(
  id: string,
  type: string,
  data: Record<string, unknown> = {},
): FlowNode {
  return { id, type, position: { x: 0, y: 0 }, data };
}

function makeEdge(
  source: string,
  target: string,
  sourceHandle?: string,
): FlowEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle: sourceHandle ?? null,
  };
}

describe("findTriggerNode", () => {
  test("returns the trigger node from a nodes array", () => {
    const nodes: FlowNode[] = [
      makeNode("1", "contact-subscribed"),
      makeNode("2", "send-email"),
      makeNode("3", "time-delay"),
    ];

    const result = findTriggerNode(nodes);
    expect(result).toBeDefined();
    expect(result!.id).toBe("1");
    expect(result!.type).toBe("contact-subscribed");
  });

  test("returns undefined when no trigger node exists", () => {
    const nodes: FlowNode[] = [
      makeNode("1", "send-email"),
      makeNode("2", "time-delay"),
    ];

    expect(findTriggerNode(nodes)).toBeUndefined();
  });

  test("returns the first trigger node when multiple exist", () => {
    const nodes: FlowNode[] = [
      makeNode("1", "contact-subscribed"),
      makeNode("2", "form-filled"),
    ];

    const result = findTriggerNode(nodes);
    expect(result!.id).toBe("1");
  });

  test("returns undefined for empty array", () => {
    expect(findTriggerNode([])).toBeUndefined();
  });
});

describe("getNodeById", () => {
  test("returns the node with matching ID", () => {
    const nodes: FlowNode[] = [
      makeNode("a", "send-email"),
      makeNode("b", "time-delay"),
    ];

    const result = getNodeById(nodes, "b");
    expect(result).toBeDefined();
    expect(result!.type).toBe("time-delay");
  });

  test("returns undefined for non-existent ID", () => {
    const nodes: FlowNode[] = [makeNode("a", "send-email")];
    expect(getNodeById(nodes, "z")).toBeUndefined();
  });
});

describe("findNextNodeIds", () => {
  const edges: FlowEdge[] = [
    makeEdge("trigger", "step1"),
    makeEdge("step1", "step2"),
    makeEdge("step2", "step3a", "true"),
    makeEdge("step2", "step3b", "false"),
  ];

  test("returns target node IDs for outgoing edges", () => {
    expect(findNextNodeIds(edges, "trigger")).toEqual(["step1"]);
    expect(findNextNodeIds(edges, "step1")).toEqual(["step2"]);
  });

  test("returns empty array for terminal nodes", () => {
    expect(findNextNodeIds(edges, "step3a")).toEqual([]);
    expect(findNextNodeIds(edges, "step3b")).toEqual([]);
  });

  test("filters by sourceHandle when provided", () => {
    expect(findNextNodeIds(edges, "step2", "true")).toEqual(["step3a"]);
    expect(findNextNodeIds(edges, "step2", "false")).toEqual(["step3b"]);
  });

  test("returns empty when sourceHandle does not match", () => {
    expect(findNextNodeIds(edges, "step2", "nonexistent")).toEqual([]);
  });

  test("returns all targets when no sourceHandle filter", () => {
    expect(findNextNodeIds(edges, "step2")).toEqual(["step3a", "step3b"]);
  });

  test("handles multiple outgoing edges without handles", () => {
    const fanOutEdges: FlowEdge[] = [
      makeEdge("start", "a"),
      makeEdge("start", "b"),
      makeEdge("start", "c"),
    ];
    expect(findNextNodeIds(fanOutEdges, "start")).toEqual(["a", "b", "c"]);
  });
});

describe("delayToMs", () => {
  test("converts seconds correctly", () => {
    expect(delayToMs(30, "seconds")).toBe(30_000);
    expect(delayToMs(1, "seconds")).toBe(1_000);
  });

  test("converts minutes correctly", () => {
    expect(delayToMs(5, "minutes")).toBe(300_000);
    expect(delayToMs(1, "minutes")).toBe(60_000);
  });

  test("converts hours correctly", () => {
    expect(delayToMs(2, "hours")).toBe(7_200_000);
    expect(delayToMs(1, "hours")).toBe(3_600_000);
  });

  test("converts days correctly", () => {
    expect(delayToMs(1, "days")).toBe(86_400_000);
    expect(delayToMs(7, "days")).toBe(604_800_000);
  });
});
