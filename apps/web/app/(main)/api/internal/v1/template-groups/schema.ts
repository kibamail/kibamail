/**
 * Template Groups Validation Schemas (Internal API)
 *
 * Zod schemas for validating template group API requests.
 */

import { z } from "zod";

/**
 * Hex color validation regex
 */
const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * Schema for creating a new template group
 */
export const createTemplateGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(hexColorRegex, "Invalid hex color format")
    .optional()
    .default("#6366F1"),
  icon: z.string().min(1).max(50).optional().default("folder"),
});

export type CreateTemplateGroupInput = z.infer<
  typeof createTemplateGroupSchema
>;

/**
 * Schema for updating a template group
 */
export const updateTemplateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z
    .string()
    .regex(hexColorRegex, "Invalid hex color format")
    .optional(),
  icon: z.string().min(1).max(50).optional(),
});

export type UpdateTemplateGroupInput = z.infer<
  typeof updateTemplateGroupSchema
>;
