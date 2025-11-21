"use client";

import { Clock, NetworkReverse, Percentage } from "iconoir-react";
import type { NodeProps } from "@xyflow/react";
import { BaseFlowNode } from "./base-flow-node";

export function IfElseNode(props: NodeProps) {
  return (
    <BaseFlowNode
      icon={<NetworkReverse className="w-5 h-5" />}
      label="If/else"
      type="rule"
      selected={props.selected}
      outputHandles={[{ id: "true" }, { id: "false" }]}
    />
  );
}

export function PercentageSplitNode(props: NodeProps) {
  return (
    <BaseFlowNode
      icon={<Percentage className="w-5 h-5" />}
      label="Percentage split"
      type="rule"
      selected={props.selected}
      outputHandles={[{ id: "branch-a" }, { id: "branch-b" }]}
    />
  );
}

export function TimeDelayNode(props: NodeProps) {
  return (
    <BaseFlowNode
      icon={<Clock className="w-5 h-5" />}
      label="Time delay"
      type="rule"
      selected={props.selected}
    />
  );
}
