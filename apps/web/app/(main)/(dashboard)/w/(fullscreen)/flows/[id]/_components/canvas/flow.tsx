"use client";

import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import type { OnConnect, OnEdgesChange, OnNodesChange } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback } from "react";
import { RuleNodeType } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/types/node-types";
import { useFlowStore } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/state/flow-store";
import { useFlowEditor } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_components/flow-editor-context";
import { edgeTypes } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_components/edges";
import { nodeTypes } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_components/nodes";
import { FlowToolbar } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_components/canvas/flow-toolbar";
import "./flow.css";

export function FlowCanvas() {
  const { nodes, edges, setNodes, setEdges, openNodeConfiguration } =
    useFlowStore();
  const { automation } = useFlowEditor();

  const isReadOnly = automation?.status !== "DRAFT";

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const filteredChanges = isReadOnly
        ? changes.filter((change) => change.type === "select")
        : changes;
      setNodes(applyNodeChanges(filteredChanges, nodes));
    },
    [nodes, setNodes, isReadOnly]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges(applyEdgeChanges(changes, edges));
    },
    [edges, setEdges]
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      const sourceNode = nodes.find((node) => node.id === connection.source);

      let edgeType = "custom-edge";
      let edgeData = {};

      if (sourceNode?.type === RuleNodeType.IF_ELSE) {
        edgeType =
          connection.sourceHandle === "true"
            ? "if-else-true-edge"
            : "if-else-false-edge";
      } else if (sourceNode?.type === RuleNodeType.PERCENTAGE_SPLIT) {
        edgeType =
          connection.sourceHandle === "branch-a"
            ? "percentage-split-a-edge"
            : "percentage-split-b-edge";

        const nodeData = sourceNode.data as { splits?: { id: string; name: string; percentage: number }[] };
        const splits = nodeData?.splits || [];
        const split = splits.find((s) => s.id === connection.sourceHandle);
        if (split) {
          edgeData = { percentage: split.percentage, name: split.name };
        }
      }

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
    <div className="w-full h-full bg-kb-bg-hover relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={isReadOnly ? undefined : onEdgesChange}
        onConnect={isReadOnly ? undefined : onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={!isReadOnly}
        nodesConnectable={!isReadOnly}
        elementsSelectable
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
      {!isReadOnly && <FlowToolbar />}
    </div>
  );
}
