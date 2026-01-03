"use client";

import { Button } from "@kibamail/owly/button";
import type { FilterBuilderFilter } from "@kibamail/owly/filter-builder";
import * as FilterBuilder from "@kibamail/owly/filter-builder";
import { Text } from "@kibamail/owly";
import { Filter } from "iconoir-react";
import { useCallback, useMemo } from "react";
import { useFlowStore } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/state/flow-store";
import { useIfElseFieldDefinitions } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_hooks/use-if-else-field-definitions";
import type { ConditionInput } from "@/app/(main)/api/v1/segments/schema";
import {
  transformFiltersToConditions,
  transformConditionsToFilters,
} from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_utils/conditions-transformer";

export function IfElseConfig() {
  const { selectedNodeId, nodes, setNodes } = useFlowStore();
  const { fieldDefinitions, isLoading } = useIfElseFieldDefinitions();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const nodeData = selectedNode?.data as {
    conditions?: ConditionInput;
  };

  const currentFilters = useMemo(() => {
    return transformConditionsToFilters(nodeData?.conditions ?? null);
  }, [nodeData?.conditions]);

  const onConditionsChange = useCallback(
    (filters: FilterBuilderFilter[]) => {
      if (!selectedNodeId) return;

      const conditions = transformFiltersToConditions(filters);

      const updatedNodes = nodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: { ...node.data, conditions },
            }
          : node
      );

      setNodes(updatedNodes);
    },
    [selectedNodeId, nodes, setNodes]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Text className="text-xs text-kb-content-tertiary">
          Define conditions to determine which branch contacts will follow.
          Contacts matching all conditions go to the "Yes" branch, others go to
          "No".
        </Text>
      </div>

      {!isLoading && fieldDefinitions && (
        <FilterBuilder.Root
          fields={fieldDefinitions}
          filters={currentFilters}
          onChange={onConditionsChange}
          maxFilters={10}
        >
          <FilterBuilder.Trigger asChild>
            <Button variant="secondary" size="xs" type="button">
              <Filter />
              Add condition
            </Button>
          </FilterBuilder.Trigger>
          <FilterBuilder.Filters className="mt-2" />
        </FilterBuilder.Root>
      )}

      {isLoading && (
        <Text className="text-xs text-kb-content-tertiary">
          Loading fields...
        </Text>
      )}
    </div>
  );
}
