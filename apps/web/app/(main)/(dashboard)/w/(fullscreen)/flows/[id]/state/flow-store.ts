import type { Edge, Node } from "@xyflow/react";
import { create } from "zustand";
import {
  getLayoutedElements,
  type LayoutDirection,
} from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_utils/dagre-layout";
import {
  SpecialNodeType,
  TriggerNodeType,
} from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/types/node-types";

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

  // Initialization
  initializeFromAutomation: (nodes: Node[], edges: Edge[]) => void;
}

const initialTriggerId = `${TriggerNodeType.CONTACT_SUBSCRIBED}-initial`;

export const useFlowStore = create<FlowState>((set) => ({
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

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),

  updateNode: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...data } : node,
      ),
    })),

  deleteNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter(
        (edge) => edge.source !== id && edge.target !== id,
      ),
    })),

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

      const newNodeX = (sourceNode.position.x + targetNode.position.x) / 2;
      const newNodeY = (sourceNode.position.y + targetNode.position.y) / 2;

      const downstreamNodeIds = new Set<string>();
      const queue = [edge.target];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (downstreamNodeIds.has(currentId)) continue;
        downstreamNodeIds.add(currentId);

        for (const e of state.edges) {
          if (e.source === currentId && !downstreamNodeIds.has(e.target)) {
            queue.push(e.target);
          }
        }
      }

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

      const newNodeId = `${SpecialNodeType.EMPTY}-${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        type: SpecialNodeType.EMPTY,
        position: { x: newNodeX, y: newNodeY },
        data: {},
      };

      const updatedEdges = state.edges.filter((e) => e.id !== edgeId);

      const sourceToNewEdge: Edge = {
        id: `${edge.source}-${newNodeId}`,
        source: edge.source,
        target: newNodeId,
        sourceHandle: edge.sourceHandle,
        type: edge.type,
        data: edge.data,
      };

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

  autoLayout: (direction = "TB") =>
    set((state) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(state.nodes, state.edges, direction);
      return {
        nodes: layoutedNodes,
        edges: layoutedEdges,
      };
    }),

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

  initializeFromAutomation: (nodes, edges) => {
    const triggerNode = nodes.find(
      (n) =>
        n.type?.includes("subscribed") ||
        n.type?.includes("updated") ||
        n.type?.includes("filled") ||
        n.type?.includes("trigger") ||
        n.type?.includes("entry") ||
        n.type?.includes("exit") ||
        n.type?.includes("engagement") ||
        n.type?.includes("event") ||
        n.type?.includes("webhook"),
    );

    set({
      nodes,
      edges,
      selectedNodeId: triggerNode?.id || nodes[0]?.id || null,
      sidebarScreen: "node-configuration",
    });
  },
}));
