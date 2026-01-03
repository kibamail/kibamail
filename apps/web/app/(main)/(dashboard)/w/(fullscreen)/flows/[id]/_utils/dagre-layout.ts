import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

const NODE_WIDTH = 300;
const NODE_HEIGHT = 92;

export type LayoutDirection = "TB" | "LR";

/**
 * Handle priority for determining left-to-right ordering of branches.
 * Lower number = placed more to the left.
 * Handles not in this map default to 0 (leftmost).
 */
const HANDLE_ORDER: Record<string, number> = {
  // If/else: true (Yes) on left, false (No) on right
  true: 0,
  false: 1,
  // Percentage split: A on left, B on right
  "branch-a": 0,
  "branch-b": 1,
  // Default handle
  default: 0,
};

/**
 * Get the sort order for an edge based on its source handle.
 * Edges with lower order values will have their targets placed more to the left.
 */
function getEdgeOrder(edge: Edge): number {
  const handle = edge.sourceHandle || "default";
  return HANDLE_ORDER[handle] ?? 0;
}

/**
 * Auto-layout nodes using dagre algorithm
 * @param nodes - Array of React Flow nodes
 * @param edges - Array of React Flow edges
 * @param direction - Layout direction: 'TB' (top-bottom) or 'LR' (left-right)
 * @returns Layouted nodes and edges
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection = "TB",
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 50, // Horizontal spacing between nodes
    ranksep: 80, // Vertical spacing between ranks
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Sort edges by handle order so left branches are added first.
  // Dagre places nodes left-to-right based on the order edges are added.
  const sortedEdges = [...edges].sort((a, b) => {
    // First sort by source node, then by handle order
    if (a.source !== b.source) {
      return 0; // Keep original order for different sources
    }
    return getEdgeOrder(a) - getEdgeOrder(b);
  });

  // Add edges to dagre graph in sorted order
  sortedEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Run the layout algorithm
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    return {
      ...node,
      // Shift dagre position (center anchor) to React Flow position (top-left anchor)
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
