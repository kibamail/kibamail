import type { Edge, Node } from "@xyflow/react";
import { create } from "zustand";

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

  // Sidebar actions
  setSidebarScreen: (screen: SidebarScreen) => void;
  setSelectedNodeId: (id: string | null) => void;
  openNodeConfiguration: (nodeId: string) => void;
  closeNodeConfiguration: () => void;
}

const initialTriggerId = "contact-subscribed-initial";

export const useFlowStore = create<FlowState>((set) => ({
  // Initial state with default trigger node
  nodes: [
    {
      id: initialTriggerId,
      type: "contact-subscribed",
      position: { x: 250, y: 100 },
      data: { triggerType: "contact-subscribed" },
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
