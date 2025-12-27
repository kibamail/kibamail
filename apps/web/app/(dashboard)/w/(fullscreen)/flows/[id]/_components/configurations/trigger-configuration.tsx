"use client";

import * as Select from "@kibamail/owly/select-field";
import { useCallback } from "react";
import { TriggerNodeType } from "@/app/(dashboard)/w/(fullscreen)/flows/[id]/types/node-types";
import { useFlowStore } from "@/app/(dashboard)/w/(fullscreen)/flows/[id]/state/flow-store";
import { FormFilledConfig } from "./form-filled-config";
import { EventTriggeredConfig } from "./event-triggered-config";
import { TriggerConditionsConfig } from "./trigger-conditions-config";

const triggerOptions = [
  { value: TriggerNodeType.FORM_FILLED, label: "Form filled" },
  { value: TriggerNodeType.CONTACT_SUBSCRIBED, label: "Contact subscribed" },
  { value: TriggerNodeType.EVENT_TRIGGERED, label: "Event triggered" },
];

export function TriggerConfiguration() {
  const { selectedNodeId, nodes, setNodes } = useFlowStore();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const currentTriggerType =
    selectedNode?.type || TriggerNodeType.CONTACT_SUBSCRIBED;

  const onTriggerTypeChange = useCallback(
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
      <Select.Root
        value={currentTriggerType}
        onValueChange={onTriggerTypeChange}
      >
        <Select.Label>Trigger type</Select.Label>
        <Select.Trigger placeholder="Select trigger type" />
        <Select.Content>
          {triggerOptions.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              {option.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>

      <div className="my-3 h-px w-full bg-kb-border-tertiary"></div>

      {currentTriggerType === TriggerNodeType.FORM_FILLED && <FormFilledConfig />}
      {currentTriggerType === TriggerNodeType.EVENT_TRIGGERED && (
        <EventTriggeredConfig />
      )}

      <div className="my-3 h-px w-full bg-kb-border-tertiary"></div>

      <TriggerConditionsConfig />
    </div>
  );
}
