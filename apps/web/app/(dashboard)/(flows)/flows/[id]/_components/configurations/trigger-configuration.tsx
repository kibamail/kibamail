"use client";

import * as Select from "@kibamail/owly/select-field";
import { useCallback } from "react";
import { useFlowStore } from "../../state/flow-store";

const triggerOptions = [
  { value: "form-filled", label: "Form filled" },
  { value: "contact-subscribed", label: "Contact subscribed" },
  { value: "contact-property-updated", label: "Contact property updated" },
  { value: "webhook-trigger", label: "Webhook trigger" },
];

export function TriggerConfiguration() {
  const { selectedNodeId, nodes, setNodes } = useFlowStore();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const currentTriggerType = selectedNode?.type || "contact-subscribed";

  const handleTriggerTypeChange = useCallback(
    (value: string) => {
      if (!selectedNodeId) return;

      const updatedNodes = nodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              type: value,
              data: { ...node.data, triggerType: value },
            }
          : node
      );

      setNodes(updatedNodes);
    },
    [selectedNodeId, nodes, setNodes]
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-kb-content-primary mb-4">
          Trigger Configuration
        </h3>
        <Select.Root
          value={currentTriggerType}
          onValueChange={handleTriggerTypeChange}
        >
          <Select.Label>Trigger Type</Select.Label>
          <Select.Trigger placeholder="Select trigger type" />
          <Select.Content>
            {triggerOptions.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>
    </div>
  );
}
