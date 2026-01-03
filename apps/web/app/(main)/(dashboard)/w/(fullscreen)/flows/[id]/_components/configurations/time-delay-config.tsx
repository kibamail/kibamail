"use client";

import { InputLabel, Text } from "@kibamail/owly";
import * as Select from "@kibamail/owly/select-field";
import * as TextField from "@kibamail/owly/text-field";
import { useCallback } from "react";
import { useFlowStore } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/state/flow-store";

type DelayUnit = "hours" | "days" | "weeks";

const delayUnits: { value: DelayUnit; label: string }[] = [
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
];

export function TimeDelayConfig() {
  const { selectedNodeId, nodes, setNodes } = useFlowStore();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const nodeData = selectedNode?.data as {
    delayValue?: number;
    delayUnit?: DelayUnit;
  };
  const currentDelayValue = nodeData?.delayValue ?? 1;
  const currentDelayUnit = nodeData?.delayUnit ?? "days";

  const onValueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedNodeId) return;

      const value = Math.max(1, parseInt(event.target.value, 10) || 1);

      const updatedNodes = nodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: { ...node.data, delayValue: value },
            }
          : node,
      );

      setNodes(updatedNodes);
    },
    [selectedNodeId, nodes, setNodes],
  );

  const onUnitChange = useCallback(
    (unit: string) => {
      if (!selectedNodeId) return;

      const updatedNodes = nodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: { ...node.data, delayUnit: unit },
            }
          : node,
      );

      setNodes(updatedNodes);
    },
    [selectedNodeId, nodes, setNodes],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Text className="text-xs text-kb-content-tertiary">
          Set how long to wait before proceeding to the next step.
        </Text>
      </div>

      <div className="flex flex-col gap-1">
        <InputLabel>Delay for</InputLabel>
        <div className="flex gap-3">
          <div className="flex-1">
            <TextField.Root
              type="number"
              min="1"
              value={currentDelayValue.toString()}
              onChange={onValueChange}
            ></TextField.Root>
          </div>

          <div className="flex-1">
            <Select.Root value={currentDelayUnit} onValueChange={onUnitChange}>
              <Select.Trigger placeholder="Select unit" />
              <Select.Content>
                {delayUnits.map((unit) => (
                  <Select.Item key={unit.value} value={unit.value}>
                    {unit.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
        </div>
      </div>
    </div>
  );
}
