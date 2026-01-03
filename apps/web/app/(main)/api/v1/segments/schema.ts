import * as z from "zod/v4";

/**
 * MongoDB-style Query Operators
 */
const ComparisonOperators = z.enum([
  "eq", // equals
  "ne", // not equals
  "gt", // greater than
  "gte", // greater than or equal
  "lt", // less than
  "lte", // less than or equal
  "in", // in array
  "nin", // not in array
  "contains", // string contains
  "startsWith", // string starts with
  "endsWith", // string ends with
  "exists", // field exists (value should be boolean)
]);

/**
 * Field Condition Schema
 * Represents a single condition on a field
 */
const fieldConditionSchema = z
  .object({
    field: z.string().min(1, "Field name is required"),
    operator: ComparisonOperators,
    value: z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(z.union([z.string(), z.number()])),
    ]),
  })
  .refine(
    (data) => {
      // Null values can only be used with the "exists" operator
      if (data.value === null && data.operator !== "exists") {
        return false;
      }
      return true;
    },
    {
      message:
        'Null values can only be used with the "exists" operator. Use {"operator": "exists", "value": false} to check for null/empty fields.',
      path: ["value"],
    },
  );

/**
 * Topic Condition Schema
 * Check if contact is subscribed or not subscribed to specific topics
 */
const topicConditionSchema = z
  .object({
    subscribedToTopic: z.array(z.string()).min(1).optional(),
    notSubscribedToTopic: z.array(z.string()).min(1).optional(),
  })
  .refine((data) => !!(data.subscribedToTopic || data.notSubscribedToTopic), {
    message:
      "At least one of 'subscribedToTopic' or 'notSubscribedToTopic' must be specified",
  });

/**
 * Recursive Condition Schema
 * Supports nested logical operations with $and, $or, $not
 * Also supports field conditions and topic conditions
 */
export type ConditionInput =
  | z.infer<typeof fieldConditionSchema>
  | z.infer<typeof topicConditionSchema>
  | {
      $and?: ConditionInput[];
      $or?: ConditionInput[];
      $not?: ConditionInput;
    };

export const conditionSchema: z.ZodType<ConditionInput> = z.lazy(() =>
  z.union([
    fieldConditionSchema,
    topicConditionSchema,
    z
      .object({
        $and: z.array(conditionSchema).min(1).optional(),
        $or: z.array(conditionSchema).min(1).optional(),
        $not: conditionSchema.optional(),
      })
      .refine((data) => !!(data.$and || data.$or || data.$not), {
        message: "At least one logical operator ($and, $or, $not) is required",
      }),
  ]),
);

/**
 * Create Segment Request Schema
 */
export const createSegmentSchema = z.object({
  name: z
    .string()
    .min(1, "Segment name is required")
    .max(100, "Segment name must be 100 characters or less")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .trim()
    .optional()
    .nullable(),
  conditions: conditionSchema,
});

/**
 * Update Segment Request Schema
 */
export const updateSegmentSchema = z.object({
  name: z
    .string()
    .min(1, "Segment name is required")
    .max(100, "Segment name must be 100 characters or less")
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .trim()
    .optional()
    .nullable(),
  conditions: conditionSchema.optional(),
});

/**
 * Segment Response Schema
 */
export const segmentResponseSchema = z.object({
  object: z.literal("segment"),
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  conditions: conditionSchema,
});

/**
 * Segment List Response Schema
 */
export const segmentListResponseSchema = z.object({
  object: z.literal("segment_list"),
  hasMore: z.boolean(),
  data: z.array(segmentResponseSchema.omit({ object: true })),
});

/**
 * Segment Delete Response Schema
 */
const _segmentDeleteResponseSchema = z.object({
  object: z.literal("segment"),
  id: z.string().describe("ID of the deleted segment"),
});

/**
 * Type exports
 */
export type CreateSegmentRequest = z.infer<typeof createSegmentSchema>;
export type SegmentResponse = z.infer<typeof segmentResponseSchema>;
export type SegmentListResponse = z.infer<typeof segmentListResponseSchema>;
