"use client";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { Plus } from "iconoir-react";

export function EmptyNode({ selected = false }: NodeProps) {
  const connectionHandleClassName = selected
    ? "w-2! h-2! bg-kb-bg-info!"
    : "w-2! h-2! bg-kb-border-primary!";

  return (
    <div
      className={`w-[300px] h-[92px] rounded-xl border bg-kb-bg-primary bg-kb-background-primary flex items-center justify-center ${
        selected
          ? "border-kb-border-focus"
          : "border-kb-border-tertiary border-dashed"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={connectionHandleClassName}
      />

      <div className="flex items-center justify-center text-kb-content-disabled">
        <Plus className="w-8 h-8" strokeWidth={1.5} />
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="default"
        className={connectionHandleClassName}
      />
    </div>
  );
}
