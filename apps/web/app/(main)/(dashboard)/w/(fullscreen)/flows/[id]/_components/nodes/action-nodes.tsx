"use client";

import { useQuery } from "@tanstack/react-query";
import type { NodeProps } from "@xyflow/react";
import {
  DataTransferBoth,
  Mail,
  MinusCircle,
  PlusCircle,
  User,
  UserXmark,
} from "iconoir-react";
import { useFlowEditor } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_components/flow-editor-context";
import { BaseFlowNode } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_components/nodes/base-flow-node";
import { internalApi } from "@/lib/api/client";

function useTopicNames(topicIds: string[] | undefined) {
  const { data: topicsResponse } = useQuery({
    queryKey: ["topics"],
    queryFn: () => internalApi.topics().list(),
    staleTime: 5 * 60 * 1000,
  });

  if (!topicIds || topicIds.length === 0 || !topicsResponse?.data) {
    return [];
  }

  const topicsMap = new Map(topicsResponse.data.map((t) => [t.id, t.name]));
  return topicIds.map((id) => topicsMap.get(id)).filter(Boolean) as string[];
}

export function SendEmailNode(props: NodeProps) {
  const { getNodeErrors } = useFlowEditor();
  const subject = props.data?.subject as string | undefined;

  return (
    <BaseFlowNode
      icon={<Mail className="w-5 h-5" />}
      label="Send email"
      type="action"
      selected={props.selected}
      errors={getNodeErrors(props.id)}
    >
      {subject ? (
        <span className="text-xs text-kb-content-tertiary truncate max-w-full">
          {subject}
        </span>
      ) : (
        <span className="text-xs text-kb-content-quaternary">
          No subject set
        </span>
      )}
    </BaseFlowNode>
  );
}

export function SendWebhookNode(props: NodeProps) {
  const { getNodeErrors } = useFlowEditor();
  const url = props.data?.url as string | undefined;

  return (
    <BaseFlowNode
      icon={<DataTransferBoth className="w-5 h-5" />}
      label="Send webhook"
      type="action"
      selected={props.selected}
      errors={getNodeErrors(props.id)}
    >
      {url ? (
        <span className="text-xs text-kb-content-tertiary truncate max-w-full">
          {url}
        </span>
      ) : (
        <span className="text-xs text-kb-content-quaternary">No URL set</span>
      )}
    </BaseFlowNode>
  );
}

export function UpdateContactNode(props: NodeProps) {
  const { getNodeErrors } = useFlowEditor();
  const fieldId = props.data?.fieldId as string | undefined;
  const fieldValue = props.data?.fieldValue as string | undefined;

  return (
    <BaseFlowNode
      icon={<User className="w-5 h-5" />}
      label="Update contact"
      type="action"
      selected={props.selected}
      errors={getNodeErrors(props.id)}
    >
      {fieldId && fieldValue ? (
        <span className="text-xs text-kb-content-tertiary truncate max-w-full">
          Set {fieldId} to "{fieldValue}"
        </span>
      ) : (
        <span className="text-xs text-kb-content-quaternary">
          Not configured
        </span>
      )}
    </BaseFlowNode>
  );
}

export function UnsubscribeContactNode(props: NodeProps) {
  const { getNodeErrors } = useFlowEditor();
  return (
    <BaseFlowNode
      icon={<UserXmark className="w-5 h-5" />}
      label="Unsubscribe contact"
      type="action"
      selected={props.selected}
      errors={getNodeErrors(props.id)}
    >
      <span className="text-xs text-kb-content-tertiary">
        Remove from all topics
      </span>
    </BaseFlowNode>
  );
}

export function AddToTopicNode(props: NodeProps) {
  const { getNodeErrors } = useFlowEditor();
  const topicIds = props.data?.topicIds as string[] | undefined;
  const topicNames = useTopicNames(topicIds);

  return (
    <BaseFlowNode
      icon={<PlusCircle className="w-5 h-5" />}
      label="Add to topic"
      type="action"
      selected={props.selected}
      errors={getNodeErrors(props.id)}
    >
      {topicNames.length > 0 ? (
        <span className="text-xs text-kb-content-tertiary truncate max-w-full">
          {topicNames.join(", ")}
        </span>
      ) : (
        <span className="text-xs text-kb-content-quaternary">
          No topics selected
        </span>
      )}
    </BaseFlowNode>
  );
}

export function RemoveFromTopicNode(props: NodeProps) {
  const { getNodeErrors } = useFlowEditor();
  const topicIds = props.data?.topicIds as string[] | undefined;
  const topicNames = useTopicNames(topicIds);

  return (
    <BaseFlowNode
      icon={<MinusCircle className="w-5 h-5" />}
      label="Remove from topic"
      type="action"
      selected={props.selected}
      errors={getNodeErrors(props.id)}
    >
      {topicNames.length > 0 ? (
        <span className="text-xs text-kb-content-tertiary truncate max-w-full">
          {topicNames.join(", ")}
        </span>
      ) : (
        <span className="text-xs text-kb-content-quaternary">
          No topics selected
        </span>
      )}
    </BaseFlowNode>
  );
}
