"use client";

import * as TextField from "@kibamail/owly/text-field";
import { useFlowStore } from "@/app/(dashboard)/w/(fullscreen)/flows/[id]/state/flow-store";
import { useCallback } from "react";

export function PercentageSplitConfiguration() {
  const { nodes, setNodes, edges, setEdges, selectedNodeId } = useFlowStore();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const splits = (selectedNode?.data as any)?.splits || [
    { id: "branch-a", name: "A", percentage: 50 },
    { id: "branch-b", name: "B", percentage: 50 },
  ];

  const handlePercentageChange = useCallback(
    (branchId: string, newPercentage: number) => {
      // Ensure percentage is between 0 and 100
      const clampedPercentage = Math.max(0, Math.min(100, newPercentage));

      // Calculate the other branch's percentage to balance to 100%
      const otherBranchId = branchId === "branch-a" ? "branch-b" : "branch-a";
      const otherPercentage = 100 - clampedPercentage;

      // Get existing split names
      const branchName =
        splits.find((s: any) => s.id === branchId)?.name ||
        (branchId === "branch-a" ? "A" : "B");
      const otherBranchName =
        splits.find((s: any) => s.id === otherBranchId)?.name ||
        (otherBranchId === "branch-a" ? "A" : "B");

      const updatedSplits = [
        { id: branchId, name: branchName, percentage: clampedPercentage },
        {
          id: otherBranchId,
          name: otherBranchName,
          percentage: otherPercentage,
        },
      ];

      // Update the node data
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

      // Update edges connected to this node to reflect new percentages
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
    splits.find((s: any) => s.id === "branch-a")?.percentage ?? 50;
  const branchBPercentage =
    splits.find((s: any) => s.id === "branch-b")?.percentage ?? 50;

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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handlePercentageChange("branch-a", Number(e.target.value))
          }
          min="0"
          max="100"
        >
          <TextField.Label>Branch A (%)</TextField.Label>
        </TextField.Root>

        <TextField.Root
          type="number"
          value={branchBPercentage.toString()}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handlePercentageChange("branch-b", Number(e.target.value))
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
