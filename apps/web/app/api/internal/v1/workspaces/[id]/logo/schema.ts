/**
 * Update Organization Logo - Schema
 *
 * Validation schemas for /api/internal/v1/workspaces/:id/logo endpoint
 */

import { z } from "zod";

/**
 * Response schema for successful logo upload
 * Note: This only uploads to S3, doesn't update Logto yet
 * responseOk() spreads the data directly (no data wrapper)
 */
export const updateLogoResponseSchema = z.object({
  success: z.boolean(),
  logoUrl: z.string().url(),
});

export type UpdateLogoResponse = z.infer<typeof updateLogoResponseSchema>;
