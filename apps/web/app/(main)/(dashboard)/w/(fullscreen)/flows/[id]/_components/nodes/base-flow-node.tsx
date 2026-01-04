"use client";

import { Badge } from "@kibamail/owly/badge";
import { Handle, Position } from "@xyflow/react";
import type React from "react";
import type { ValidationError } from "@/lib/automations/validation";

export interface BaseFlowNodeProps {
  icon: React.ReactNode;
  label: string;
  type: "action" | "rule" | "trigger";
  children?: React.ReactNode;
  selected?: boolean;
  outputHandles?: Array<{
    id: string;
    label?: string;
  }>;
  errors?: ValidationError[];
}

export function BaseFlowNode({
  icon,
  label,
  type,
  children,
  selected = false,
  outputHandles = [{ id: "default" }],
  errors = [],
}: BaseFlowNodeProps) {
  const hasMultipleOutputs = outputHandles.length > 1;
  const isTrigger = type === "trigger";
  const hasErrors = errors.length > 0;
  const connectionHandleClassName = selected
    ? "w-2! h-2! bg-kb-bg-info!"
    : "w-2! h-2! bg-kb-border-primary!";

  const getBorderClassName = () => {
    if (hasErrors) return "border-kb-border-negative";
    if (selected) return "border-kb-border-focus";
    return "border-kb-border-tertiary";
  };

  return (
    <div
      className={`w-[300px] h-[92px] rounded-xl border bg-kb-bg-primary bg-kb-background-primary flex flex-col ${getBorderClassName()}`}
    >
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className={connectionHandleClassName}
        />
      )}

      <div className="h-[46px] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 shrink-0 flex items-center justify-center text-kb-content-secondary">
            {icon}
          </div>
          <span className="text-sm font-medium text-kb-content-secondary">
            {label}
          </span>
        </div>
        <Badge variant="neutral" size="sm">
          {type}
        </Badge>
      </div>

      <div className="w-full h-px bg-kb-border-tertiary shrink-0" />

      <div className="h-[46px] px-3 flex items-center shrink-0">{children}</div>

      {hasMultipleOutputs ? (
        <div className="absolute bottom-0 left-0 right-0 flex justify-around">
          {outputHandles.map((outputHandle) => (
            <Handle
              key={outputHandle.id}
              type="source"
              position={Position.Bottom}
              id={outputHandle.id}
              className={connectionHandleClassName}
              style={{
                position: "relative",
                left: 0,
                transform: "none",
              }}
            />
          ))}
        </div>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          id={outputHandles[0].id}
          className={connectionHandleClassName}
        />
      )}
    </div>
  );
}
