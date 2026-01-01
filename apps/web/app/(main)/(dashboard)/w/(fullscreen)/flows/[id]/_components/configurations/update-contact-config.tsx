"use client";

import * as Select from "@kibamail/owly/select-field";
import * as TextField from "@kibamail/owly/text-field";
import * as DateField from "@kibamail/owly/date-field";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { internalApi } from "@/lib/api/client";
import { useFlowStore } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/state/flow-store";

type FieldType = "STRING" | "NUMBER" | "DATE";

interface FieldOption {
  id: string;
  name: string;
  type: FieldType;
  isBuiltIn: boolean;
}

const builtInFields: FieldOption[] = [
  { id: "firstName", name: "First name", type: "STRING", isBuiltIn: true },
  { id: "lastName", name: "Last name", type: "STRING", isBuiltIn: true },
];

export function UpdateContactConfig() {
  const { selectedNodeId, nodes, setNodes } = useFlowStore();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const nodeData = selectedNode?.data as {
    fieldId?: string;
    fieldValue?: string;
  };
  const currentFieldId = nodeData?.fieldId ?? "";
  const currentFieldValue = nodeData?.fieldValue ?? "";

  const { data: propertiesResponse, isLoading } = useQuery({
    queryKey: ["contact-properties"],
    queryFn: () => internalApi.contactProperties().list(),
  });

  const fieldOptions = useMemo(() => {
    const customProperties: FieldOption[] =
      propertiesResponse?.data?.map((prop) => ({
        id: prop.id,
        name: prop.name,
        type: prop.type as FieldType,
        isBuiltIn: false,
      })) ?? [];

    return [...builtInFields, ...customProperties];
  }, [propertiesResponse]);

  const selectedField = fieldOptions.find((f) => f.id === currentFieldId);

  const onFieldChange = useCallback(
    (fieldId: string) => {
      if (!selectedNodeId) return;

      const updatedNodes = nodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: { ...node.data, fieldId, fieldValue: "" },
            }
          : node
      );

      setNodes(updatedNodes);
    },
    [selectedNodeId, nodes, setNodes]
  );

  const onValueChange = useCallback(
    (value: string) => {
      if (!selectedNodeId) return;

      const updatedNodes = nodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: { ...node.data, fieldValue: value },
            }
          : node
      );

      setNodes(updatedNodes);
    },
    [selectedNodeId, nodes, setNodes]
  );

  const renderValueInput = () => {
    if (!selectedField) return null;

    switch (selectedField.type) {
      case "DATE": {
        const dateValue = currentFieldValue
          ? new Date(parseInt(currentFieldValue, 10))
          : undefined;
        return (
          <DateField.Root
            value={dateValue}
            onValueChange={(date) =>
              onValueChange(date ? date.getTime().toString() : "")
            }
            label="Value"
            hint=""
          />
        );
      }

      case "NUMBER":
        return (
          <TextField.Root
            type="number"
            value={currentFieldValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onValueChange(e.target.value)
            }
          >
            <TextField.Label>Value</TextField.Label>
          </TextField.Root>
        );

      default:
        return (
          <TextField.Root
            type="text"
            value={currentFieldValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onValueChange(e.target.value)
            }
          >
            <TextField.Label>Value</TextField.Label>
          </TextField.Root>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Select.Root value={currentFieldId} onValueChange={onFieldChange}>
        <Select.Label>Field to update</Select.Label>
        <Select.Trigger
          placeholder={isLoading ? "Loading fields..." : "Select a field"}
          disabled={isLoading}
        />
        <Select.Content>
          <Select.Group>
            {builtInFields.map((field) => (
              <Select.Item key={field.id} value={field.id}>
                {field.name}
              </Select.Item>
            ))}
          </Select.Group>

          {fieldOptions.filter((f) => !f.isBuiltIn).length > 0 && (
            <Select.Group>
              {fieldOptions
                .filter((f) => !f.isBuiltIn)
                .map((field) => (
                  <Select.Item key={field.id} value={field.id}>
                    {field.name}
                  </Select.Item>
                ))}
            </Select.Group>
          )}
        </Select.Content>
      </Select.Root>

      {selectedField && renderValueInput()}
    </div>
  );
}
