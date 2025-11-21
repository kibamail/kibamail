"use client";

import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import type {
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback } from "react";
import { edgeTypes } from "../edges";
import { nodeTypes } from "../nodes";
import { useFlowStore } from "../../state/flow-store";
import "./flow.css";

export function FlowCanvas() {
  const { nodes, edges, setNodes, setEdges, openNodeConfiguration } =
    useFlowStore();

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes(applyNodeChanges(changes, nodes));
    },
    [nodes, setNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges(applyEdgeChanges(changes, edges));
    },
    [edges, setEdges]
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      // Find the source node to determine edge type
      const sourceNode = nodes.find((node) => node.id === connection.source);

      // Determine edge type based on source node and handle
      let edgeType = "custom-edge";
      let edgeData = {};

      if (sourceNode?.type === "if-else") {
        edgeType =
          connection.sourceHandle === "true"
            ? "if-else-true-edge"
            : "if-else-false-edge";
      } else if (sourceNode?.type === "percentage-split") {
        edgeType =
          connection.sourceHandle === "branch-a"
            ? "percentage-split-a-edge"
            : "percentage-split-b-edge";

        // Add percentage data to edge
        const splits = (sourceNode.data as any)?.splits || [];
        const split = splits.find(
          (s: { id: string; name: string; percentage: number }) =>
            s.id === connection.sourceHandle
        );
        if (split) {
          edgeData = { percentage: split.percentage, name: split.name };
        }
      }

      // Create the new edge with the determined type
      const newEdge = {
        ...connection,
        type: edgeType,
        data: edgeData,
      };

      setEdges(addEdge(newEdge, edges));
    },
    [edges, setEdges, nodes]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      openNodeConfiguration(node.id);
    },
    [openNodeConfiguration]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
