"use client";

import * as MultiSelect from "@kibamail/owly/multi-select";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { internalApi } from "@/lib/api/client";
import { useFlowStore } from "@/app/(dashboard)/w/(fullscreen)/flows/[id]/state/flow-store";

interface TopicConfigProps {
  mode: "add" | "remove";
}

export function TopicConfig({ mode }: TopicConfigProps) {
  const { selectedNodeId, nodes, setNodes } = useFlowStore();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const nodeData = selectedNode?.data as {
    topicIds?: string[];
  };
  const currentTopicIds = nodeData?.topicIds ?? [];

  const { data: topicsResponse, isLoading } = useQuery({
    queryKey: ["topics"],
    queryFn: () => internalApi.topics().list(),
  });

  const topics = topicsResponse?.data ?? [];

  const handleTopicsChange = useCallback(
    (topicIds: string[]) => {
      if (!selectedNodeId) return;

      const updatedNodes = nodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: { ...node.data, topicIds },
            }
          : node
      );

      setNodes(updatedNodes);
    },
    [selectedNodeId, nodes, setNodes]
  );

  const label = mode === "add" ? "Topics to add" : "Topics to remove";
  const placeholder =
    mode === "add"
      ? "Select topics to add contact to"
      : "Select topics to remove contact from";

  return (
    <div className="flex flex-col gap-4">
      <MultiSelect.Root
        value={currentTopicIds}
        onValueChange={handleTopicsChange}
      >
        <MultiSelect.Label>{label}</MultiSelect.Label>
        <MultiSelect.Trigger
          placeholder={isLoading ? "Loading topics..." : placeholder}
          disabled={isLoading}
        />
        <MultiSelect.Content className="z-50">
          {topics.map((topic) => (
            <MultiSelect.Item key={topic.id} value={topic.id}>
              {topic.name}
            </MultiSelect.Item>
          ))}
        </MultiSelect.Content>
      </MultiSelect.Root>
    </div>
  );
}

export function AddToTopicConfig() {
  return <TopicConfig mode="add" />;
}

export function RemoveFromTopicConfig() {
  return <TopicConfig mode="remove" />;
}
