"use client";

import * as TextField from "@kibamail/owly/text-field";
import { useCallback } from "react";
import { useFlowStore } from "@/app/(dashboard)/w/(fullscreen)/flows/[id]/state/flow-store";

export function EventTriggeredConfig() {
  const { selectedNodeId, nodes, setNodes } = useFlowStore();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const currentEventName =
    (selectedNode?.data as { eventName?: string })?.eventName ?? "";

  const handleEventNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedNodeId) return;

      const updatedNodes = nodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: { ...node.data, eventName: e.target.value },
            }
          : node
      );

      setNodes(updatedNodes);
    },
    [selectedNodeId, nodes, setNodes]
  );

  return (
    <div className="flex flex-col gap-4">
      <TextField.Root value={currentEventName} onChange={handleEventNameChange}>
        <TextField.Label>Event name</TextField.Label>
        <TextField.Hint>
          Enter the name of the event that will trigger this flow (e.g.,
          "purchase.completed", "user.upgraded")
        </TextField.Hint>
      </TextField.Root>
    </div>
  );
}
