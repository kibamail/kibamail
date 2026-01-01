/**
 * Filter to Condition Converter
 *
 * Converts FilterBuilder filters to segment conditions that match the exact
 * schema required by the backend API.
 */
import { v4 as uuidv4 } from "uuid";
import type { FilterBuilder } from "@kibamail/owly";
import type { ConditionInput } from "@/app/(main)/api/v1/segments/schema";

/**
 * Convert FilterBuilder filters to segment conditions
 *
 * @param filters - Array of FilterBuilder filters
 * @returns ConditionInput that matches the segment schema
 */
export function convertFiltersToConditions(
  filters: FilterBuilder.FilterBuilderFilter[]
): ConditionInput {
  if (filters.length === 0) {
    // Default condition that matches all contacts
    return {
      field: "email",
      operator: "exists",
      value: true,
    };
  }

  if (filters.length === 1) {
    return convertSingleFilter(filters[0]);
  }

  // Multiple filters - combine with AND
  return {
    $and: filters.map(convertSingleFilter),
  };
}

/**
 * Convert a single FilterBuilder filter to a segment condition
 *
 * @param filter - Single FilterBuilder filter
 * @returns ConditionInput (field condition or topic condition)
 */
function convertSingleFilter(
  filter: FilterBuilder.FilterBuilderFilter
): ConditionInput {
  const { fieldId, operatorId, value } = filter;

  if (fieldId.startsWith("subscribedToTopic.")) {
    const topicId = fieldId.replace("subscribedToTopic.", "");

    if (operatorId === "equals" && value.type === "boolean") {
      if (value.value === true) {
        return { subscribedToTopic: [topicId] };
      } else {
        return { notSubscribedToTopic: [topicId] };
      }
    }
  }

  const segmentOperator = mapOperatorToSegmentOperator(operatorId);
  const segmentValue = convertValueToSegmentValue(value, operatorId);

  if (value.type === "date-range") {
    return {
      $and: [
        {
          field: fieldId,
          operator: "gte",
          value: value.start.getTime(),
        },
        {
          field: fieldId,
          operator: "lte",
          value: value.end.getTime(),
        },
      ],
    };
  }

  return {
    field: fieldId,
    operator: segmentOperator,
    value: segmentValue,
  };
}

/**
 * Map FilterBuilder operators to segment schema operators
 *
 * @param filterOperator - FilterBuilder operator ID
 * @returns Segment schema operator
 */
function mapOperatorToSegmentOperator(
  filterOperator: string
):
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "nin"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "exists" {
  const operatorMap: Record<
    string,
    | "eq"
    | "ne"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "nin"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "exists"
  > = {
    equals: "eq",
    "not-equals": "ne",

    "greater-than": "gt",
    "greater-than-equal": "gte",
    "less-than": "lt",
    "less-than-equal": "lte",

    contains: "contains",
    "starts-with": "startsWith",
    "ends-with": "endsWith",

    in: "in",
    "not-in": "nin",

    exists: "exists",
    "not-exists": "exists", // Will be handled with value: false
  };

  return operatorMap[filterOperator] || "eq";
}

/**
 * Convert FilterBuilder value to segment schema value
 *
 * @param value - FilterBuilder value data
 * @param operatorId - FilterBuilder operator ID for context
 * @returns Value in segment schema format
 */
function convertValueToSegmentValue(
  value: any,
  operatorId: string
): string | number | boolean | null | (string | number)[] {
  switch (value.type) {
    case "text":
      return value.value;

    case "number":
      return value.value;

    case "boolean":
      if (operatorId === "not-exists") {
        return false;
      }
      return value.value;

    case "select":
      return value.value;

    case "multi-select":
      return value.values;

    case "date-single":
      return value.value.getTime();

    case "none":
      return null;

    default:
      return null;
  }
}

/**
 * Convert segment conditions back to FilterBuilder filters
 *
 * @param conditions - ConditionInput from segment
 * @returns Array of FilterBuilder filters
 */
export function convertConditionsToFilters(
  conditions: ConditionInput | null | undefined
): FilterBuilder.FilterBuilderFilter[] {
  if (!conditions) {
    return [];
  }

  // Handle $and operator
  if ("$and" in conditions && Array.isArray(conditions.$and)) {
    return conditions.$and
      .map(convertSingleConditionToFilter)
      .filter(Boolean) as FilterBuilder.FilterBuilderFilter[];
  }

  // Handle single condition
  const filter = convertSingleConditionToFilter(conditions);
  return filter ? [filter] : [];
}

/**
 * Convert a single condition to a FilterBuilder filter
 *
 * @param condition - Single condition input
 * @returns FilterBuilder filter or null
 */
function convertSingleConditionToFilter(
  condition: ConditionInput
): FilterBuilder.FilterBuilderFilter | null {
  // Handle topic subscriptions
  if (
    "subscribedToTopic" in condition &&
    Array.isArray(condition.subscribedToTopic)
  ) {
    const topicId = condition.subscribedToTopic[0];
    if (!topicId) return null;

    return {
      id: uuidv4(),
      fieldId: `subscribedToTopic.${topicId}`,
      operatorId: "equals",
      value: { type: "boolean", value: true },
    };
  }

  if (
    "notSubscribedToTopic" in condition &&
    Array.isArray(condition.notSubscribedToTopic)
  ) {
    const topicId = condition.notSubscribedToTopic[0];
    if (!topicId) return null;

    return {
      id: uuidv4(),
      fieldId: `subscribedToTopic.${topicId}`,
      operatorId: "equals",
      value: { type: "boolean", value: false },
    };
  }

  // Handle field conditions
  if ("field" in condition && "operator" in condition && "value" in condition) {
    const operatorId = mapSegmentOperatorToFilterOperator(condition.operator);
    const value = convertSegmentValueToFilterValue(
      condition.value,
      condition.operator
    );

    return {
      id: uuidv4(),
      fieldId: condition.field,
      operatorId,
      value,
    };
  }

  return null;
}

/**
 * Map segment operators back to FilterBuilder operators
 *
 * @param segmentOperator - Segment schema operator
 * @returns FilterBuilder operator ID
 */
function mapSegmentOperatorToFilterOperator(segmentOperator: string): string {
  const operatorMap: Record<string, string> = {
    eq: "equals",
    ne: "not-equals",
    gt: "greater-than",
    gte: "greater-than-equal",
    lt: "less-than",
    lte: "less-than-equal",
    contains: "contains",
    startsWith: "starts-with",
    endsWith: "ends-with",
    in: "in",
    nin: "not-in",
    exists: "exists",
  };

  return operatorMap[segmentOperator] || "equals";
}

/**
 * Convert segment value back to FilterBuilder value format
 *
 * @param value - Value from segment condition
 * @param operator - Operator for context
 * @returns FilterBuilder value data
 */
function convertSegmentValueToFilterValue(
  value: string | number | boolean | null | (string | number)[],
  operator: string
): any {
  if (value === null) {
    return { type: "none", value: null };
  }

  if (typeof value === "boolean") {
    if (operator === "exists" && value === false) {
      return { type: "boolean", value: false };
    }
    return { type: "boolean", value };
  }

  if (typeof value === "string") {
    return { type: "text", value };
  }

  if (typeof value === "number") {
    // Check if it's a timestamp (likely a date)
    if (value > 1000000000000) {
      return { type: "date-single", value: new Date(value) };
    }
    return { type: "number", value };
  }

  if (Array.isArray(value)) {
    return { type: "multi-select", values: value };
  }

  return { type: "none", value: null };
}
