"use client";

import { Clock, NetworkReverse, Percentage } from "iconoir-react";
import type { NodeProps } from "@xyflow/react";
import { Badge } from "@kibamail/owly/badge";
import { BaseFlowNode } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_components/nodes/base-flow-node";
import { useFlowEditor } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_components/flow-editor-context";
import type { ConditionInput } from "@/app/(main)/api/v1/segments/schema";

function countConditions(
  conditions: ConditionInput | null | undefined
): number {
  if (!conditions) return 0;

  if ("$and" in conditions && conditions.$and) {
    return conditions.$and.length;
  }

  if ("$or" in conditions && conditions.$or) {
    return conditions.$or.length;
  }

  if ("$not" in conditions) {
    return 1;
  }

  if (
    "field" in conditions ||
    "subscribedToTopic" in conditions ||
    "notSubscribedToTopic" in conditions
  ) {
    return 1;
  }

  return 0;
}

export function IfElseNode(props: NodeProps) {
  const { getNodeErrors } = useFlowEditor();
  const conditions = props.data?.conditions as ConditionInput | undefined;
  const conditionCount = countConditions(conditions);

  return (
    <BaseFlowNode
      icon={<NetworkReverse className="w-5 h-5" />}
      label="If/else"
      type="rule"
      selected={props.selected}
      outputHandles={[{ id: "true" }, { id: "false" }]}
      errors={getNodeErrors(props.id)}
    >
      <div className="w-full flex items-center justify-center h-full">
        <Badge variant={conditionCount > 0 ? "info" : "neutral"} size="sm">
          {conditionCount} {conditionCount === 1 ? "condition" : "conditions"}
        </Badge>
      </div>
    </BaseFlowNode>
  );
}

export function PercentageSplitNode(props: NodeProps) {
  const { getNodeErrors } = useFlowEditor();
  const splits = props.data?.splits as
    | Array<{ name: string; percentage: number }>
    | undefined;

  return (
    <BaseFlowNode
      icon={<Percentage className="w-5 h-5" />}
      label="Percentage split"
      type="rule"
      selected={props.selected}
      outputHandles={[{ id: "branch-a" }, { id: "branch-b" }]}
      errors={getNodeErrors(props.id)}
    >
      {splits && splits.length > 0 ? (
        <span className="text-xs text-kb-content-tertiary truncate">
          {splits.map((s) => `${s.name}: ${s.percentage}%`).join(" / ")}
        </span>
      ) : null}
    </BaseFlowNode>
  );
}

export function TimeDelayNode(props: NodeProps) {
  const { getNodeErrors } = useFlowEditor();
  const duration = props.data?.duration as number | undefined;
  const unit = props.data?.unit as string | undefined;

  return (
    <BaseFlowNode
      icon={<Clock className="w-5 h-5" />}
      label="Time delay"
      type="rule"
      selected={props.selected}
      errors={getNodeErrors(props.id)}
    >
      {duration && unit ? (
        <span className="text-xs text-kb-content-tertiary">
          Wait {duration} {unit}
        </span>
      ) : (
        <span className="text-xs text-kb-content-quaternary">
          Not configured
        </span>
      )}
    </BaseFlowNode>
  );
}
