/**
 * Email Validation Schemas (Internal API)
 *
 * Zod schemas for validating email API requests.
 */

import { z } from "zod";

/**
 * Schema for creating a new email
 */
export const createEmailSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  subject: z.string().max(998).optional(),
  previewText: z.string().max(255).optional(),
  content: z.any().optional(),
  styles: z.any().optional(),
  senderIdentityId: z.string().optional(),
  replyToIdentityId: z.string().optional(),
  trackClicks: z.boolean().optional().default(true),
  trackOpens: z.boolean().optional().default(true),
  type: z
    .enum(["TRANSACTIONAL", "AUTOMATION", "NOTIFICATION"])
    .optional()
    .default("TRANSACTIONAL"),
});

/**
 * Schema for updating an email
 */
export const updateEmailSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().max(998).optional().nullable(),
  previewText: z.string().max(255).optional().nullable(),
  content: z.any().optional().nullable(),
  styles: z.any().optional().nullable(),
  senderIdentityId: z.string().optional().nullable(),
  replyToIdentityId: z.string().optional().nullable(),
  trackClicks: z.boolean().optional(),
  trackOpens: z.boolean().optional(),
  type: z.enum(["TRANSACTIONAL", "AUTOMATION", "NOTIFICATION"]).optional(),
});

export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;
