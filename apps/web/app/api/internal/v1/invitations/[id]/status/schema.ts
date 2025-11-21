/**
 * Update Invitation Status Endpoint - Validation Schemas
 *
 * Schemas for PUT /api/internal/v1/invitations/[id]/status
 */

import { z } from "zod";

/**
 * Invitation status values
 */
export const invitationStatusSchema = z.enum(["Accepted", "Revoked"]);

/**
 * PUT /api/internal/v1/invitations/[id]/status - Update Invitation Status
 *
 * Request Body Schema
 */
export const updateInvitationStatusSchema = z.object({
  status: invitationStatusSchema,
});

/**
 * PUT /api/internal/v1/invitations/[id]/status - Update Invitation Status
 *
 * Response Schema
 */
export const updateInvitationStatusResponseSchema = z.object({});

// Type exports
export type UpdateInvitationStatusInput = z.infer<
  typeof updateInvitationStatusSchema
>;
export type UpdateInvitationStatusResponse = z.infer<
  typeof updateInvitationStatusResponseSchema
>;
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;
