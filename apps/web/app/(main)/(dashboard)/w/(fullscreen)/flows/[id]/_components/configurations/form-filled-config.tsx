"use client";

import * as Select from "@kibamail/owly/select-field";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { internalApi } from "@/lib/api/client";
import { useFlowStore } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/state/flow-store";

export function FormFilledConfig() {
  const { selectedNodeId, nodes, setNodes } = useFlowStore();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const currentFormId = (selectedNode?.data as { formId?: string })?.formId;

  const { data: formsResponse, isLoading } = useQuery({
    queryKey: ["forms"],
    queryFn: () => internalApi.forms().list(),
  });

  const handleFormChange = useCallback(
    (formId: string) => {
      if (!selectedNodeId) return;

      const updatedNodes = nodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: { ...node.data, formId },
            }
          : node
      );

      setNodes(updatedNodes);
    },
    [selectedNodeId, nodes, setNodes]
  );

  const forms = formsResponse?.data ?? [];

  return (
    <Select.Root value={currentFormId ?? ""} onValueChange={handleFormChange}>
      <Select.Label>Select form</Select.Label>
      <Select.Trigger
        placeholder={isLoading ? "Loading forms..." : "Select a form"}
        disabled={isLoading}
      />
      <Select.Content>
        {forms.map((form) => (
          <Select.Item key={form.id} value={form.id}>
            {form.name}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
