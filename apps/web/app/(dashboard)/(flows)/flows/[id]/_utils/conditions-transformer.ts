import type { FilterBuilderFilter } from "@kibamail/owly/filter-builder";
import type { ConditionInput } from "@/app/api/v1/segments/schema";

const operatorMap: Record<string, string> = {
  "equals": "eq",
  "not-equals": "ne",
  "contains": "contains",
  "starts-with": "startsWith",
  "ends-with": "endsWith",
  "greater-than": "gt",
  "less-than": "lt",
  "greater-than-or-equal": "gte",
  "less-than-or-equal": "lte",
  "in": "in",
  "not-in": "nin",
  "is-empty": "exists",
  "is-not-empty": "exists",
};

function extractValue(valueData: FilterBuilderFilter["value"]): string | number | boolean | null | (string | number)[] {
  switch (valueData.type) {
    case "text":
      return valueData.value;
    case "number":
      return valueData.value;
    case "boolean":
      return valueData.value;
    case "select":
      return valueData.value;
    case "multi-select":
      return valueData.values;
    case "date-single":
      return valueData.value.toISOString();
    case "date-range":
      return [valueData.start.toISOString(), valueData.end.toISOString()];
    case "none":
      return null;
    default:
      return null;
  }
}

function transformFilter(filter: FilterBuilderFilter): ConditionInput | null {
  const { fieldId, operatorId, value } = filter;

  if (fieldId.startsWith("topic.")) {
    const topicId = fieldId.replace("topic.", "");

    if (operatorId === "subscribed") {
      return { subscribedToTopic: [topicId] };
    } else if (operatorId === "not-subscribed") {
      return { notSubscribedToTopic: [topicId] };
    }
    return null;
  }

  const field = fieldId.startsWith("property.") ? fieldId : fieldId;

  const backendOperator = operatorMap[operatorId];
  if (!backendOperator) {
    console.warn(`Unknown operator: ${operatorId}`);
    return null;
  }

  if (operatorId === "is-empty") {
    return {
      field,
      operator: "exists" as const,
      value: false,
    };
  }

  if (operatorId === "is-not-empty") {
    return {
      field,
      operator: "exists" as const,
      value: true,
    };
  }

  if (operatorId === "between" && value.type === "date-range") {
    return {
      $and: [
        { field, operator: "gte" as const, value: value.start.toISOString() },
        { field, operator: "lte" as const, value: value.end.toISOString() },
      ],
    };
  }

  const extractedValue = extractValue(value);

  if (extractedValue === null && backendOperator !== "exists") {
    return null;
  }

  return {
    field,
    operator: backendOperator as "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "nin" | "contains" | "startsWith" | "endsWith" | "exists",
    value: extractedValue as string | number | boolean | null | (string | number)[],
  };
}

export function transformFiltersToConditions(filters: FilterBuilderFilter[]): ConditionInput | null {
  if (!filters || filters.length === 0) {
    return null;
  }

  const conditions: ConditionInput[] = [];

  for (const filter of filters) {
    const condition = transformFilter(filter);
    if (condition) {
      conditions.push(condition);
    }
  }

  if (conditions.length === 0) {
    return null;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { $and: conditions };
}

export function transformConditionsToFilters(conditions: ConditionInput | null): FilterBuilderFilter[] {
  if (!conditions) {
    return [];
  }

  const filters: FilterBuilderFilter[] = [];
  const generateId = () => `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  function processCondition(condition: ConditionInput): void {
    if ("$and" in condition && condition.$and) {
      for (const subCondition of condition.$and) {
        processCondition(subCondition);
      }
      return;
    }

    if ("$or" in condition && condition.$or) {
      for (const subCondition of condition.$or) {
        processCondition(subCondition);
      }
      return;
    }

    if ("$not" in condition) {
      return;
    }

    if ("subscribedToTopic" in condition && condition.subscribedToTopic) {
      for (const topicId of condition.subscribedToTopic) {
        filters.push({
          id: generateId(),
          fieldId: `topic.${topicId}`,
          operatorId: "subscribed",
          value: { type: "none" },
        });
      }
      return;
    }

    if ("notSubscribedToTopic" in condition && condition.notSubscribedToTopic) {
      for (const topicId of condition.notSubscribedToTopic) {
        filters.push({
          id: generateId(),
          fieldId: `topic.${topicId}`,
          operatorId: "not-subscribed",
          value: { type: "none" },
        });
      }
      return;
    }

    if ("field" in condition && "operator" in condition) {
      const { field, operator, value } = condition;

      const operatorId = Object.entries(operatorMap).find(
        ([_, backendOp]) => backendOp === operator
      )?.[0] || operator;

      let finalOperatorId = operatorId;
      let filterValue: FilterBuilderFilter["value"];

      if (operator === "exists") {
        finalOperatorId = value === true ? "is-not-empty" : "is-empty";
        filterValue = { type: "none" };
      } else if (typeof value === "string") {
        filterValue = { type: "text", value };
      } else if (typeof value === "number") {
        filterValue = { type: "number", value };
      } else if (typeof value === "boolean") {
        filterValue = { type: "boolean", value };
      } else if (Array.isArray(value)) {
        filterValue = { type: "multi-select", values: value.map(String) };
      } else {
        filterValue = { type: "none" };
      }

      filters.push({
        id: generateId(),
        fieldId: field,
        operatorId: finalOperatorId,
        value: filterValue,
      });
    }
  }

  processCondition(conditions);
  return filters;
}
