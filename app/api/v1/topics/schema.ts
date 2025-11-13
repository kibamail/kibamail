import * as z from "zod/v4";

/**
 * Topic Visibility Enum
 */
export const TopicVisibilityEnum = z.enum(["PUBLIC", "PRIVATE"]);

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
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(100, "Slug must be 100 characters or less")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  visibility: TopicVisibilityEnum.optional().default("PUBLIC"),
  isPrimary: z.boolean().optional().default(false),
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
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(100, "Slug must be 100 characters or less")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .optional(),
  visibility: TopicVisibilityEnum.optional(),
  isPrimary: z.boolean().optional(),
});

/**
 * Topic Response Schema
 */
export const topicResponseSchema = z.object({
  type: z.literal("topic"),
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  visibility: TopicVisibilityEnum,
  isPrimary: z.boolean(),
});

/**
 * Topic List Response Schema
 */
export const topicListResponseSchema = z.object({
  type: z.literal("topic_list"),
  hasMore: z.boolean(),
  data: z.array(topicResponseSchema.omit({ type: true })),
});

/**
 * Type exports
 */
export type CreateTopicRequest = z.infer<typeof createTopicSchema>;
export type UpdateTopicRequest = z.infer<typeof updateTopicSchema>;
export type TopicResponse = z.infer<typeof topicResponseSchema>;
export type TopicListResponse = z.infer<typeof topicListResponseSchema>;
