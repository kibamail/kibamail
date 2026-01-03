"use client";

import * as TextField from "@kibamail/owly/text-field";
import { useFlowStore } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/state/flow-store";
import { useCallback } from "react";

interface Split {
  id: string;
  name: string;
  percentage: number;
}

interface NodeData {
  splits?: Split[];
}

export function PercentageSplitConfiguration() {
  const { nodes, setNodes, edges, setEdges, selectedNodeId } = useFlowStore();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const nodeData = selectedNode?.data as NodeData;
  const splits: Split[] = nodeData?.splits || [
    { id: "branch-a", name: "A", percentage: 50 },
    { id: "branch-b", name: "B", percentage: 50 },
  ];

  const onPercentageChange = useCallback(
    (branchId: string, newPercentage: number) => {
      const clampedPercentage = Math.max(0, Math.min(100, newPercentage));
      const otherBranchId = branchId === "branch-a" ? "branch-b" : "branch-a";
      const otherPercentage = 100 - clampedPercentage;

      const branchName =
        splits.find((s) => s.id === branchId)?.name ||
        (branchId === "branch-a" ? "A" : "B");
      const otherBranchName =
        splits.find((s) => s.id === otherBranchId)?.name ||
        (otherBranchId === "branch-a" ? "A" : "B");

      const updatedSplits = [
        { id: branchId, name: branchName, percentage: clampedPercentage },
        {
          id: otherBranchId,
          name: otherBranchName,
          percentage: otherPercentage,
        },
      ];

      const updatedNodes = nodes.map((node) => {
        if (node.id === selectedNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              splits: updatedSplits,
            },
          };
        }
        return node;
      });

      const updatedEdges = edges.map((edge) => {
        if (edge.source === selectedNodeId) {
          const split = updatedSplits.find((s) => s.id === edge.sourceHandle);
          if (split) {
            return {
              ...edge,
              data: {
                ...edge.data,
                percentage: split.percentage,
                name: split.name,
              },
            };
          }
        }
        return edge;
      });

      setNodes(updatedNodes);
      setEdges(updatedEdges);
    },
    [nodes, edges, selectedNodeId, setNodes, setEdges]
  );

  const branchAPercentage =
    splits.find((s) => s.id === "branch-a")?.percentage ?? 50;
  const branchBPercentage =
    splits.find((s) => s.id === "branch-b")?.percentage ?? 50;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-kb-content-primary">
          Split Distribution
        </h3>
        <p className="text-xs text-kb-content-tertiary">
          Adjust the percentage split for each branch. Total must equal 100%.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <TextField.Root
          type="number"
          value={branchAPercentage.toString()}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onPercentageChange("branch-a", Number(event.target.value))
          }
          min="0"
          max="100"
        >
          <TextField.Label>Branch A (%)</TextField.Label>
        </TextField.Root>

        <TextField.Root
          type="number"
          value={branchBPercentage.toString()}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onPercentageChange("branch-b", Number(event.target.value))
          }
          min="0"
          max="100"
        >
          <TextField.Label>Branch B (%)</TextField.Label>
        </TextField.Root>
      </div>

      <div className="p-3 bg-kb-bg-secondary rounded-lg">
        <p className="text-xs text-kb-content-secondary">
          Total: {branchAPercentage + branchBPercentage}%
          {branchAPercentage + branchBPercentage !== 100 && (
            <span className="text-kb-content-error ml-1">
              (Must equal 100%)
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
