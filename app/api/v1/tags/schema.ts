/**
 * Tags Schema Validation (External API)
 *
 * Zod schemas for validating tag requests
 */

import { z } from "zod";

/**
 * Create Tag Request Schema
 */
export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, "Tag name is required")
    .max(50, "Tag name must be 50 characters or less")
    .trim(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color code (e.g., #3B82F6)")
    .optional()
    .default("#3B82F6"),
});

/**
 * Update Tag Request Schema
 */
export const updateTagSchema = z.object({
  name: z
    .string()
    .min(1, "Tag name is required")
    .max(50, "Tag name must be 50 characters or less")
    .trim()
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color code (e.g., #3B82F6)")
    .optional(),
});

/**
 * Tag Response Schema
 */
export const tagResponseSchema = z.object({
  object: z.literal("tag"),
  id: z.string(),
  name: z.string(),
  color: z.string(),
});

/**
 * Tag List Response Schema
 */
export const tagListResponseSchema = z.object({
  object: z.literal("tag_list"),
  hasMore: z.boolean(),
  data: z.array(tagResponseSchema.omit({ object: true })),
});

/**
 * Type exports for TypeScript
 */
export type CreateTagRequest = z.infer<typeof createTagSchema>;
export type UpdateTagRequest = z.infer<typeof updateTagSchema>;
export type TagResponse = z.infer<typeof tagResponseSchema>;
export type TagListResponse = z.infer<typeof tagListResponseSchema>;
