/**
 * Conditions to Prisma Query Converter
 *
 * Converts segment conditions (MongoDB-style) to Prisma where clauses
 * for querying contacts based on segment criteria.
 */

import type { Prisma } from "@prisma/client";
import type { ConditionInput } from "@/app/api/v1/segments/schema";

/**
 * Contact property definition for field mapping
 */
interface ContactPropertyDefinition {
  name: string;
  slot: string;
  type: string;
}

/**
 * List of built-in contact fields that can be queried
 */
export const BUILT_IN_CONTACT_FIELDS = [
  "email",
  "firstName",
  "lastName",
  "phone",
  "country",
  "timezone",
  "city",
  "status",
  "createdAt",
  "updatedAt",
] as const;

/**
 * Validate that all fields in conditions are either built-in or custom properties
 *
 * @param conditions - Segment conditions to validate
 * @param contactProperties - Array of contact property definitions
 * @returns Object with isValid and invalidFields array
 */
export function validateConditionFields(
  conditions: ConditionInput,
  contactProperties: ContactPropertyDefinition[]
): { isValid: boolean; invalidFields: string[] } {
  const invalidFields: string[] = [];
  const propertyNames = new Set(contactProperties.map((p) => p.name));
  const builtInFields = new Set(BUILT_IN_CONTACT_FIELDS);

  function checkFieldValidity(field: string): void {
    if (!builtInFields.has(field as any) && !propertyNames.has(field)) {
      invalidFields.push(field);
    }
  }

  function validateRecursive(cond: ConditionInput): void {
    // Field condition
    if ("field" in cond && "operator" in cond && "value" in cond) {
      checkFieldValidity(cond.field);
      return;
    }

    // Topic conditions (no field validation needed)
    if ("subscribedToTopic" in cond || "notSubscribedToTopic" in cond) {
      return;
    }

    // Logical operators
    if ("$and" in cond && cond.$and) {
      cond.$and.forEach(validateRecursive);
    }
    if ("$or" in cond && cond.$or) {
      cond.$or.forEach(validateRecursive);
    }
    if ("$not" in cond && cond.$not) {
      validateRecursive(cond.$not);
    }
  }

  validateRecursive(conditions);

  return {
    isValid: invalidFields.length === 0,
    invalidFields,
  };
}

/**
 * Convert segment conditions to Prisma where clause
 *
 * @param conditions - Segment conditions (field, topic, or logical operators)
 * @param contactProperties - Array of contact property definitions for field mapping
 * @returns Prisma where clause for Contact queries
 */
export function conditionsToPrismaWhere(
  conditions: ConditionInput,
  contactProperties: ContactPropertyDefinition[] = []
): Prisma.ContactWhereInput {
  if (
    "field" in conditions &&
    "operator" in conditions &&
    "value" in conditions
  ) {
    return convertFieldCondition(conditions, contactProperties);
  }

  if (
    "subscribedToTopic" in conditions ||
    "notSubscribedToTopic" in conditions
  ) {
    return convertTopicCondition(conditions);
  }

  if ("$and" in conditions || "$or" in conditions || "$not" in conditions) {
    return convertLogicalOperator(conditions, contactProperties);
  }

  throw new Error("Invalid condition structure");
}

/**
 * Convert field condition to Prisma where clause
 * Maps custom property names to their slot columns
 */
function convertFieldCondition(
  condition: {
    field: string;
    operator: string;
    value: string | number | boolean | null | (string | number)[];
  },
  contactProperties: ContactPropertyDefinition[]
): Prisma.ContactWhereInput {
  const { field, operator, value } = condition;

  const property = contactProperties.find((p) => p.name === field);
  const actualField = property ? property.slot : field;

  switch (operator) {
    case "eq":
      return { [actualField]: value };

    case "ne":
      return { [actualField]: { not: value } };

    case "gt":
      return { [actualField]: { gt: value } };

    case "gte":
      return { [actualField]: { gte: value } };

    case "lt":
      return { [actualField]: { lt: value } };

    case "lte":
      return { [actualField]: { lte: value } };

    case "in":
      return { [actualField]: { in: value as (string | number)[] } };

    case "nin":
      return { [actualField]: { notIn: value as (string | number)[] } };

    case "contains":
      return { [actualField]: { contains: value as string } };

    case "startsWith":
      return { [actualField]: { startsWith: value as string } };

    case "endsWith":
      return { [actualField]: { endsWith: value as string } };

    case "exists":
      return value === true
        ? { [actualField]: { not: null } }
        : { [actualField]: null };

    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

/**
 * Convert topic condition to Prisma where clause
 */
function convertTopicCondition(condition: {
  subscribedToTopic?: string[];
  notSubscribedToTopic?: string[];
}): Prisma.ContactWhereInput {
  const conditions: Prisma.ContactWhereInput[] = [];

  if (condition.subscribedToTopic) {
    conditions.push({
      topics: {
        some: {
          topicId: {
            in: condition.subscribedToTopic,
          },
          status: "SUBSCRIBED",
        },
      },
    });
  }

  if (condition.notSubscribedToTopic) {
    conditions.push({
      topics: {
        none: {
          topicId: {
            in: condition.notSubscribedToTopic,
          },
          status: "SUBSCRIBED",
        },
      },
    });
  }

  if (conditions.length === 2) {
    return { AND: conditions };
  }

  return conditions[0];
}

/**
 * Convert logical operator to Prisma where clause
 */
function convertLogicalOperator(
  condition: {
    $and?: ConditionInput[];
    $or?: ConditionInput[];
    $not?: ConditionInput;
  },
  contactProperties: ContactPropertyDefinition[]
): Prisma.ContactWhereInput {
  if (condition.$and) {
    return {
      AND: condition.$and.map((c) =>
        conditionsToPrismaWhere(c, contactProperties)
      ),
    };
  }

  if (condition.$or) {
    return {
      OR: condition.$or.map((c) =>
        conditionsToPrismaWhere(c, contactProperties)
      ),
    };
  }

  if (condition.$not) {
    return {
      NOT: conditionsToPrismaWhere(condition.$not, contactProperties),
    };
  }

  throw new Error("Invalid logical operator structure");
}
