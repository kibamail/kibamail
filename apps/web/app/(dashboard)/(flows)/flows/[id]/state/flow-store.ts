import type { Edge, Node } from "@xyflow/react";
import { create } from "zustand";
import { SpecialNodeType, TriggerNodeType } from "../types/node-types";
import {
  getLayoutedElements,
  type LayoutDirection,
} from "../_utils/dagre-layout";

export type SidebarScreen = "node-selector" | "node-configuration";

export interface FlowState {
  // ReactFlow state
  nodes: Node[];
  edges: Edge[];

  // Sidebar state
  sidebarScreen: SidebarScreen;
  selectedNodeId: string | null;

  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  updateNode: (id: string, data: Partial<Node>) => void;
  deleteNode: (id: string) => void;

  addEdge: (edge: Edge) => void;
  deleteEdge: (id: string) => void;
  insertNodeOnEdge: (edgeId: string) => void;

  // Layout actions
  autoLayout: (direction?: LayoutDirection) => void;

  // Sidebar actions
  setSidebarScreen: (screen: SidebarScreen) => void;
  setSelectedNodeId: (id: string | null) => void;
  openNodeConfiguration: (nodeId: string) => void;
  closeNodeConfiguration: () => void;
}

const initialTriggerId = `${TriggerNodeType.CONTACT_SUBSCRIBED}-initial`;

export const useFlowStore = create<FlowState>((set) => ({
  // Initial state with default trigger node
  nodes: [
    {
      id: initialTriggerId,
      type: TriggerNodeType.CONTACT_SUBSCRIBED,
      position: { x: 250, y: 100 },
      data: { triggerType: TriggerNodeType.CONTACT_SUBSCRIBED },
    },
  ],
  edges: [],
  sidebarScreen: "node-configuration",
  selectedNodeId: initialTriggerId,

  // Node actions
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),

  updateNode: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...data } : node
      ),
    })),

  deleteNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter(
        (edge) => edge.source !== id && edge.target !== id
      ),
    })),

  // Edge actions
  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
    })),

  deleteEdge: (id) =>
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
    })),

  insertNodeOnEdge: (edgeId) =>
    set((state) => {
      const edge = state.edges.find((e) => e.id === edgeId);
      if (!edge) return state;

      const sourceNode = state.nodes.find((n) => n.id === edge.source);
      const targetNode = state.nodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) return state;

      // Calculate midpoint position for the new node
      const newNodeX = (sourceNode.position.x + targetNode.position.x) / 2;
      const newNodeY = (sourceNode.position.y + targetNode.position.y) / 2;

      // Find all downstream nodes from target using BFS
      const downstreamNodeIds = new Set<string>();
      const queue = [edge.target];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (downstreamNodeIds.has(currentId)) continue;
        downstreamNodeIds.add(currentId);

        // Find all edges where current node is the source
        for (const e of state.edges) {
          if (e.source === currentId && !downstreamNodeIds.has(e.target)) {
            queue.push(e.target);
          }
        }
      }

      // Shift downstream nodes down by 150px (node height + padding)
      const shiftAmount = 150;
      const updatedNodes = state.nodes.map((node) => {
        if (downstreamNodeIds.has(node.id)) {
          return {
            ...node,
            position: {
              ...node.position,
              y: node.position.y + shiftAmount,
            },
          };
        }
        return node;
      });

      // Create the new empty node
      const newNodeId = `${SpecialNodeType.EMPTY}-${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        type: SpecialNodeType.EMPTY,
        position: { x: newNodeX, y: newNodeY },
        data: {},
      };

      // Remove the old edge and create two new edges
      const updatedEdges = state.edges.filter((e) => e.id !== edgeId);

      // Edge from source to new node (preserve sourceHandle)
      const sourceToNewEdge: Edge = {
        id: `${edge.source}-${newNodeId}`,
        source: edge.source,
        target: newNodeId,
        sourceHandle: edge.sourceHandle,
        type: edge.type,
        data: edge.data,
      };

      // Edge from new node to original target
      const newToTargetEdge: Edge = {
        id: `${newNodeId}-${edge.target}`,
        source: newNodeId,
        target: edge.target,
        type: "custom-edge",
      };

      return {
        nodes: [...updatedNodes, newNode],
        edges: [...updatedEdges, sourceToNewEdge, newToTargetEdge],
        sidebarScreen: "node-configuration" as SidebarScreen,
        selectedNodeId: newNodeId,
      };
    }),

  // Layout actions
  autoLayout: (direction = "TB") =>
    set((state) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        state.nodes,
        state.edges,
        direction
      );
      return {
        nodes: layoutedNodes,
        edges: layoutedEdges,
      };
    }),

  // Sidebar actions
  setSidebarScreen: (screen) => set({ sidebarScreen: screen }),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  openNodeConfiguration: (nodeId) =>
    set({
      sidebarScreen: "node-configuration",
      selectedNodeId: nodeId,
    }),

  closeNodeConfiguration: () =>
    set({
      sidebarScreen: "node-selector",
      selectedNodeId: null,
    }),
}));
