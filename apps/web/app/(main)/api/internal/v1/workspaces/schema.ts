/**
 * Workspaces Collection - Validation Schemas
 *
 * Schemas for /api/internal/v1/workspaces endpoints
 */

import { z } from "zod";

/**
 * Workspace Entity Schema
 */
export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

/**
 * POST /api/internal/v1/workspaces - Create Workspace
 *
 * Request Body Schema
 */
export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name must not exceed 50 characters"),
  description: z.string().max(500, "Description is too long").optional(),
});

/**
 * POST /api/internal/v1/workspaces - Create Workspace
 *
 * Response Schema
 */
export const createWorkspaceResponseSchema = z.object({
  data: workspaceSchema,
});

// Type exports
export type Workspace = z.infer<typeof workspaceSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type CreateWorkspaceResponse = z.infer<
  typeof createWorkspaceResponseSchema
>;
