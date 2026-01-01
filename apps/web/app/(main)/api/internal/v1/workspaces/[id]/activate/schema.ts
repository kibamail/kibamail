/**
 * Activate Workspace - Validation Schemas
 *
 * Schemas for /api/internal/v1/workspaces/:id/activate endpoint
 */

import { z } from "zod";

/**
 * POST /api/internal/v1/workspaces/:id/activate - Activate Workspace
 *
 * Response Schema
 */
export const activateWorkspaceResponseSchema = z.object({
  success: z.boolean(),
});

// Type exports
export type ActivateWorkspaceResponse = z.infer<
  typeof activateWorkspaceResponseSchema
>;
