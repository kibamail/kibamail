"use client";

import { Activity, Server, User, WebWindow } from "iconoir-react";
import type { NodeProps } from "@xyflow/react";
import { BaseFlowNode } from "./base-flow-node";

export function FormFilledNode(props: NodeProps) {
  return (
    <BaseFlowNode
      icon={<Activity className="w-5 h-5" />}
      label="Form filled"
      type="trigger"
      selected={props.selected}
    />
  );
}

export function ContactSubscribedNode(props: NodeProps) {
  return (
    <BaseFlowNode
      icon={<User className="w-5 h-5" />}
      label="Contact subscribed"
      type="trigger"
      selected={props.selected}
    />
  );
}

export function ContactPropertyUpdatedNode(props: NodeProps) {
  return (
    <BaseFlowNode
      icon={<User className="w-5 h-5" />}
      label="Contact property updated"
      type="trigger"
      selected={props.selected}
    />
  );
}

export function EventTriggeredNode(props: NodeProps) {
  return (
    <BaseFlowNode
      icon={<Server className="w-5 h-5" />}
      label="Event triggered"
      type="trigger"
      selected={props.selected}
    />
  );
}
