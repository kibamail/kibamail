/**
 * Conditions to Prisma Query Converter
 *
 * Converts segment conditions (MongoDB-style) to Prisma where clauses
 * for querying contacts based on segment criteria.
 */

import type { Prisma } from "@prisma/client";
import type { ConditionInput } from "@/app/api/v1/segments/schema";

/**
 * Convert segment conditions to Prisma where clause
 *
 * @param conditions - Segment conditions (field, tag, topic, or logical operators)
 * @returns Prisma where clause for Contact queries
 */
export function conditionsToPrismaWhere(
  conditions: ConditionInput
): Prisma.ContactWhereInput {
  if (
    "field" in conditions &&
    "operator" in conditions &&
    "value" in conditions
  ) {
    return convertFieldCondition(conditions);
  }

  if ("hasTag" in conditions || "doesNotHaveTag" in conditions) {
    return convertTagCondition(conditions);
  }

  if (
    "subscribedToTopic" in conditions ||
    "notSubscribedToTopic" in conditions
  ) {
    return convertTopicCondition(conditions);
  }

  if ("$and" in conditions || "$or" in conditions || "$not" in conditions) {
    return convertLogicalOperator(conditions);
  }

  throw new Error("Invalid condition structure");
}

/**
 * Convert field condition to Prisma where clause
 */
function convertFieldCondition(condition: {
  field: string;
  operator: string;
  value: string | number | boolean | null | (string | number)[];
}): Prisma.ContactWhereInput {
  const { field, operator, value } = condition;

  switch (operator) {
    case "eq":
      return { [field]: value };

    case "ne":
      return { [field]: { not: value } };

    case "gt":
      return { [field]: { gt: value } };

    case "gte":
      return { [field]: { gte: value } };

    case "lt":
      return { [field]: { lt: value } };

    case "lte":
      return { [field]: { lte: value } };

    case "in":
      return { [field]: { in: value as (string | number)[] } };

    case "nin":
      return { [field]: { notIn: value as (string | number)[] } };

    case "contains":
      return { [field]: { contains: value as string } };

    case "startsWith":
      return { [field]: { startsWith: value as string } };

    case "endsWith":
      return { [field]: { endsWith: value as string } };

    case "exists":
      return value === true ? { [field]: { not: null } } : { [field]: null };

    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

/**
 * Convert tag condition to Prisma where clause
 */
function convertTagCondition(condition: {
  hasTag?: string[];
  doesNotHaveTag?: string[];
}): Prisma.ContactWhereInput {
  const conditions: Prisma.ContactWhereInput[] = [];

  if (condition.hasTag) {
    // Contact must have at least one of these tags
    conditions.push({
      tags: {
        some: {
          tagId: {
            in: condition.hasTag,
          },
        },
      },
    });
  }

  if (condition.doesNotHaveTag) {
    conditions.push({
      tags: {
        none: {
          tagId: {
            in: condition.doesNotHaveTag,
          },
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
function convertLogicalOperator(condition: {
  $and?: ConditionInput[];
  $or?: ConditionInput[];
  $not?: ConditionInput;
}): Prisma.ContactWhereInput {
  if (condition.$and) {
    return {
      AND: condition.$and.map((c) => conditionsToPrismaWhere(c)),
    };
  }

  if (condition.$or) {
    return {
      OR: condition.$or.map((c) => conditionsToPrismaWhere(c)),
    };
  }

  if (condition.$not) {
    return {
      NOT: conditionsToPrismaWhere(condition.$not),
    };
  }

  throw new Error("Invalid logical operator structure");
}
