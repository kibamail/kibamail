/**
 * Update Workspace - Schema
 *
 * Validation schemas for PATCH /api/internal/v1/workspaces/:id endpoint
 */

import { z } from "zod";

/**
 * Request schema for updating workspace
 */
export const updateWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().nullable().optional(),
  logoUrl: z.string().url("Invalid logo URL").optional(),
});

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

/**
 * Response schema for successful workspace update
 * The API wraps responses in a data field via responseOk()
 */
export const updateWorkspaceResponseSchema = z.object({
  data: z.object({
    success: z.boolean(),
  }),
});

export type UpdateWorkspaceResponse = z.infer<
  typeof updateWorkspaceResponseSchema
>;
