/**
 * Transactional Email Templates Validation Schemas (External API)
 *
 * Zod schemas for the HTML-only transactional template REST surface.
 * Different from the internal visual-editor schemas: `html` is the source
 * of truth here, there is no `contentJson` / `styles`, and `subject` is
 * required on create (transactional mail must have a subject).
 */

import { z } from "zod";

// Letters, numbers, underscores, hyphens. Must start with a letter.
const uniqueSlugPattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export const variableDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["text", "number"]),
});

export type VariableDefinition = z.infer<typeof variableDefinitionSchema>;

/**
 * Create a new transactional email template.
 *
 * - `html` is required — this is the source of truth for rendering.
 * - `uniqueSlug` is required and is the identifier used by
 *   `POST /v1/emails/send` when referencing `template.id`.
 * - `publish: true` (the default) creates and publishes the template
 *   atomically. Pass `publish: false` to keep it as a DRAFT for later
 *   editing.
 */
export const createTransactionalEmailTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
  uniqueSlug: z
    .string()
    .min(1, "Unique slug is required")
    .max(100)
    .regex(
      uniqueSlugPattern,
      "Unique slug must start with a letter and contain only letters, numbers, underscores, or hyphens",
    ),
  subject: z.string().min(1, "Subject is required").max(1000),
  previewText: z.string().max(1000).optional(),
  html: z
    .string()
    .min(1, "HTML body is required")
    .max(10_000_000, "HTML body exceeds 10 MB limit"),
  senderIdentityId: z.string().min(1).optional(),
  replyToIdentityId: z.string().min(1).optional(),
  trackClicks: z.boolean().optional().default(true),
  trackOpens: z.boolean().optional().default(true),
  variables: z.array(variableDefinitionSchema).optional(),
  publish: z.boolean().optional().default(true),
});

export type CreateTransactionalEmailTemplateInput = z.infer<
  typeof createTransactionalEmailTemplateSchema
>;

/**
 * Update an existing transactional email template (DRAFT only).
 *
 * All fields are optional. Publishing is a separate endpoint
 * (POST /publish).
 */
export const updateTransactionalEmailTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  uniqueSlug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      uniqueSlugPattern,
      "Unique slug must start with a letter and contain only letters, numbers, underscores, or hyphens",
    )
    .optional(),
  subject: z.string().min(1).max(1000).optional(),
  previewText: z.string().max(1000).optional().nullable(),
  html: z.string().min(1).max(10_000_000).optional(),
  senderIdentityId: z.string().min(1).optional().nullable(),
  replyToIdentityId: z.string().min(1).optional().nullable(),
  trackClicks: z.boolean().optional(),
  trackOpens: z.boolean().optional(),
  variables: z.array(variableDefinitionSchema).optional(),
});

export type UpdateTransactionalEmailTemplateInput = z.infer<
  typeof updateTransactionalEmailTemplateSchema
>;
