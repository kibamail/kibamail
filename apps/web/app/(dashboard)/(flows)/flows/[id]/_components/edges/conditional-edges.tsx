"use client";

import { Badge } from "@kibamail/owly/badge";
import { BaseEdge, type EdgeProps, getSmoothStepPath } from "@xyflow/react";

export function IfElseTrueEdge({
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
        width={60}
        height={24}
        x={labelX - 30}
        y={labelY - 12}
        className="overflow-visible"
      >
        <Badge variant="success" size="sm">
          Yes
        </Badge>
      </foreignObject>
    </>
  );
}

export function IfElseFalseEdge({
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
        width={60}
        height={24}
        x={labelX - 30}
        y={labelY - 12}
        className="overflow-visible"
      >
        <Badge variant="error" size="sm">
          No
        </Badge>
      </foreignObject>
    </>
  );
}

export function PercentageSplitAEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const percentage = (data as any)?.percentage ?? 50;
  const name = (data as any)?.name ?? "A";

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      <foreignObject
        width={80}
        height={24}
        x={labelX - 40}
        y={labelY - 12}
        className="overflow-visible"
      >
        <Badge variant="neutral" size="sm" className="gap-1.5">
          <span className="w-4 h-4 flex items-center justify-center border border-kb-border-tertiary rounded text-kb-content-secondary text-xs">
            {name}
          </span>
          {percentage}%
        </Badge>
      </foreignObject>
    </>
  );
}

export function PercentageSplitBEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const percentage = (data as any)?.percentage ?? 50;
  const name = (data as any)?.name ?? "B";

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      <foreignObject
        width={80}
        height={24}
        x={labelX - 40}
        y={labelY - 12}
        className="overflow-visible"
      >
        <Badge variant="neutral" size="sm" className="gap-1.5">
          <span className="w-4 h-4 flex items-center justify-center border border-kb-border-tertiary rounded text-kb-content-secondary text-xs">
            {name}
          </span>
          {percentage}%
        </Badge>
      </foreignObject>
    </>
  );
}
