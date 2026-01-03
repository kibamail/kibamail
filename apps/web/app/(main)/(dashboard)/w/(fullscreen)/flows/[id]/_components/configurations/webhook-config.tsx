"use client";

import * as TextField from "@kibamail/owly/text-field";
import { useCallback } from "react";
import { useFlowStore } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/state/flow-store";

export function WebhookConfig() {
  const { selectedNodeId, nodes, setNodes } = useFlowStore();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const currentUrl = (selectedNode?.data as { url?: string })?.url ?? "";

  const onUrlChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedNodeId) return;

      const updatedNodes = nodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: { ...node.data, url: event.target.value },
            }
          : node,
      );

      setNodes(updatedNodes);
    },
    [selectedNodeId, nodes, setNodes],
  );

  return (
    <div className="flex flex-col gap-4">
      <TextField.Root value={currentUrl} onChange={onUrlChange}>
        <TextField.Label>Webhook URL</TextField.Label>
        <TextField.Hint>
          Enter the URL that will receive a POST request when this action is
          triggered. The request body will contain the contact data.
        </TextField.Hint>
      </TextField.Root>
    </div>
  );
}
