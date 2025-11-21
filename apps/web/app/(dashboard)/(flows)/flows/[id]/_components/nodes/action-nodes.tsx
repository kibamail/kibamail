"use client";

import {
  DataTransferBoth,
  Mail,
  MinusCircle,
  PlusCircle,
  User,
  UserXmark,
} from "iconoir-react";
import type { NodeProps } from "@xyflow/react";
import { BaseFlowNode } from "./base-flow-node";

export function SendEmailNode(props: NodeProps) {
  return (
    <BaseFlowNode
      icon={<Mail className="w-5 h-5" />}
      label="Send email"
      type="action"
      selected={props.selected}
    />
  );
}

export function SendWebhookNode(props: NodeProps) {
  return (
    <BaseFlowNode
      icon={<DataTransferBoth className="w-5 h-5" />}
      label="Send webhook"
      type="action"
      selected={props.selected}
    />
  );
}

export function UpdateContactNode(props: NodeProps) {
  return (
    <BaseFlowNode
      icon={<User className="w-5 h-5" />}
      label="Update contact"
      type="action"
      selected={props.selected}
    />
  );
}

export function UnsubscribeContactNode(props: NodeProps) {
  return (
    <BaseFlowNode
      icon={<UserXmark className="w-5 h-5" />}
      label="Unsubscribe contact"
      type="action"
      selected={props.selected}
    />
  );
}

export function AddToTopicNode(props: NodeProps) {
  return (
    <BaseFlowNode
      icon={<PlusCircle className="w-5 h-5" />}
      label="Add contact to topic"
      type="action"
      selected={props.selected}
    />
  );
}

export function RemoveFromTopicNode(props: NodeProps) {
  return (
    <BaseFlowNode
      icon={<MinusCircle className="w-5 h-5" />}
      label="Remove contact from topic"
      type="action"
      selected={props.selected}
    />
  );
}
