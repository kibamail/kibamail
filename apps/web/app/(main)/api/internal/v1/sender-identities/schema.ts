/**
 * Sender Identity Validation Schemas
 *
 * Zod schemas for sender identity API requests.
 */

import { z } from "zod";

/**
 * Schema for creating a new sender identity
 */
export const createSenderIdentitySchema = z.object({
  /** Display name (e.g., "Newsletter Team", "Support") */
  name: z.string().min(1, "Name is required").max(200, "Name is too long"),
  /** Email local part only (e.g., "newsletter", "support") */
  email: z
    .string()
    .min(1, "Email is required")
    .max(64, "Email local part is too long")
    .regex(
      /^[a-zA-Z0-9._%+-]+$/,
      "Email can only contain letters, numbers, dots, underscores, percent, plus and hyphens",
    ),
  /** ID of the verified sending domain */
  sendingDomainId: z.string().min(1, "Sending domain is required"),
});

/**
 * Schema for updating an existing sender identity
 */
export const updateSenderIdentitySchema = z.object({
  /** Display name */
  name: z.string().min(1, "Name is required").max(200, "Name is too long").optional(),
  /** Reply-to email address */
  replyToEmail: z.string().email("Invalid email address").nullable().optional(),
});

export type CreateSenderIdentityInput = z.infer<typeof createSenderIdentitySchema>;
export type UpdateSenderIdentityInput = z.infer<typeof updateSenderIdentitySchema>;
