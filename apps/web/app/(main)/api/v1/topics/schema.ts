import * as z from "zod/v4";

/**
 * Topic Visibility Enum
 */
const TopicVisibilityEnum = z.enum(["PUBLIC", "PRIVATE"]);

/**
 * Create Topic Request Schema
 */
export const createTopicSchema = z.object({
  name: z
    .string()
    .min(1, "Topic name is required")
    .max(100, "Topic name must be 100 characters or less")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .trim()
    .optional()
    .nullable(),
  visibility: TopicVisibilityEnum.optional().default("PUBLIC"),
  defaultOptIn: z.boolean().optional().default(false),
});

/**
 * Update Topic Request Schema
 */
export const updateTopicSchema = z.object({
  name: z
    .string()
    .min(1, "Topic name is required")
    .max(100, "Topic name must be 100 characters or less")
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .trim()
    .optional()
    .nullable(),
  visibility: TopicVisibilityEnum.optional(),
  defaultOptIn: z.boolean().optional(),
});

/**
 * Topic Response Schema
 */
export const topicResponseSchema = z.object({
  object: z.literal("topic"),
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  visibility: TopicVisibilityEnum,
  defaultOptIn: z.boolean(),
});

/**
 * Topic List Response Schema
 */
export const topicListResponseSchema = z.object({
  object: z.literal("topic_list"),
  hasMore: z.boolean(),
  data: z.array(topicResponseSchema.omit({ object: true })),
});

/**
 * Topic Delete Response Schema
 */
const _topicDeleteResponseSchema = z.object({
  object: z.literal("topic"),
  id: z.string().describe("ID of the deleted topic"),
});

/**
 * Type exports
 */
export type CreateTopicRequest = z.infer<typeof createTopicSchema>;
export type TopicResponse = z.infer<typeof topicResponseSchema>;
export type TopicListResponse = z.infer<typeof topicListResponseSchema>;
