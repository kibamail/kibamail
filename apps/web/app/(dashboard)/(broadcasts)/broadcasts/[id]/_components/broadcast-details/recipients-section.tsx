"use client";

import { useEffect, useState } from "react";
import * as Select from "@kibamail/owly/select-field";
import * as Tabs from "@kibamail/owly/tabs";
import { Text } from "@kibamail/owly/text";
import { Group, Filter, User } from "iconoir-react";
import { useTopics } from "@/hooks/use-topics";
import { useSegments } from "@/hooks/use-segments";
import { SectionHeader } from "./shared";
import type { BroadcastDetails } from "./types";

type RecipientType = "all" | "topic" | "segment";

interface RecipientsSectionProps {
  topicId?: string;
  segmentId?: string;
  onChange: (updates: Partial<BroadcastDetails>) => void;
}

export function RecipientsSection({
  topicId,
  segmentId,
  onChange,
}: RecipientsSectionProps) {
  const { data: topicsData, isLoading: isLoadingTopics } = useTopics();
  const { data: segmentsData, isLoading: isLoadingSegments } = useSegments();

  const topics = topicsData?.data || [];
  const segments = segmentsData?.data || [];

  function getCurrentRecipientType(): RecipientType {
    if (topicId) return "topic";
    if (segmentId) return "segment";
    return "all";
  }

  const [recipientType, setRecipientType] = useState<RecipientType>(
    getCurrentRecipientType
  );

  useEffect(() => {
    setRecipientType(getCurrentRecipientType());
  }, [topicId, segmentId]);

  function onRecipientTypeChange(type: string) {
    const newType = type as RecipientType;
    setRecipientType(newType);

    if (newType === "all") {
      onChange({ topicId: undefined, segmentId: undefined });
    }
  }

  function onTopicChange(id: string) {
    onChange({ topicId: id, segmentId: undefined });
  }

  function onSegmentChange(id: string) {
    onChange({ segmentId: id, topicId: undefined });
  }

  return (
    <section>
      <SectionHeader
        title="Recipients"
        description="Choose who will receive this broadcast."
      />

      <Tabs.Root
        value={recipientType}
        onValueChange={onRecipientTypeChange}
        width="full"
      >
        <Tabs.List>
          <Tabs.Trigger value="all">
            <Group className="w-4 h-4" />
            All contacts
          </Tabs.Trigger>
          <Tabs.Trigger value="topic">
            <User className="w-4 h-4" />
            By topic
          </Tabs.Trigger>
          <Tabs.Trigger value="segment">
            <Filter className="w-4 h-4" />
            By segment
          </Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>

        <Tabs.Content value="all">
          <div className="py-4">
            <Text className="text-kb-content-secondary">
              This broadcast will be sent to all contacts in your audience.
            </Text>
          </div>
        </Tabs.Content>

        <Tabs.Content value="topic">
          <div className="py-4">
            <Select.Root value={topicId || ""} onValueChange={onTopicChange}>
              <Select.Label>Select topic</Select.Label>
              <Select.Trigger
                placeholder={
                  isLoadingTopics ? "Loading topics..." : "Select a topic"
                }
              />
              <Select.Content className="z-50">
                {topics.map((topic) => (
                  <Select.Item key={topic.id} value={topic.id}>
                    {topic.name}
                  </Select.Item>
                ))}
                {topics.length === 0 && !isLoadingTopics && (
                  <div className="px-3 py-2 text-sm text-kb-content-secondary">
                    No topics available
                  </div>
                )}
              </Select.Content>
            </Select.Root>
          </div>
        </Tabs.Content>

        <Tabs.Content value="segment">
          <div className="py-4">
            <Select.Root
              value={segmentId || ""}
              onValueChange={onSegmentChange}
            >
              <Select.Label>Select segment</Select.Label>
              <Select.Trigger
                placeholder={
                  isLoadingSegments ? "Loading segments..." : "Select a segment"
                }
              />
              <Select.Content className="z-50">
                {segments.map((segment) => (
                  <Select.Item key={segment.id} value={segment.id}>
                    {segment.name}
                  </Select.Item>
                ))}
                {segments.length === 0 && !isLoadingSegments && (
                  <div className="px-3 py-2 text-sm text-kb-content-secondary">
                    No segments available
                  </div>
                )}
              </Select.Content>
            </Select.Root>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </section>
  );
}
