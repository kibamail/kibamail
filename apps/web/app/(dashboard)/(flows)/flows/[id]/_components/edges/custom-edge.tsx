"use client";

import { BaseEdge, type EdgeProps, getSmoothStepPath } from "@xyflow/react";
import { Plus } from "iconoir-react";
import { useFlowStore } from "@/app/(dashboard)/(flows)/flows/[id]/state/flow-store";

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const insertNodeOnEdge = useFlowStore((state) => state.insertNodeOnEdge);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      <foreignObject
        width={24}
        height={24}
        x={labelX - 12}
        y={labelY - 12}
        className="overflow-visible"
      >
        <button
          type="button"
          className="w-6 h-6 flex items-center justify-center text-white cursor-pointer"
          style={{
            borderRadius: "8px",
            border: "1px solid rgba(0, 0, 0, 0.05)",
            background: "#3B82F6",
            boxShadow:
              "0 2px 0 0 rgba(255, 255, 255, 0.05) inset, 0 1px 0 0 rgba(0, 0, 0, 0.10)",
          }}
          onClick={(e) => {
            e.stopPropagation();
            insertNodeOnEdge(id);
          }}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </foreignObject>
    </>
  );
}
