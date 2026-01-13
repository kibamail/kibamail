/**
 * Email Templates Validation Schemas (Internal API)
 *
 * Zod schemas for validating email template API requests.
 */

import { z } from "zod";

/**
 * Schema for creating a new email template
 * Only requires a name - emailContent is automatically created
 * Sender identities can only be set during updates
 */
/**
 * Regex pattern for valid unique slug:
 * - Letters (upper or lower), numbers, underscores, and hyphens
 * - Must start with a letter
 * - Allows camelCase, snake_case, kebab-case, SCREAMING_SNAKE_CASE, etc.
 */
const uniqueSlugPattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export const createEmailTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
  uniqueSlug: z
    .string()
    .min(1, "Unique slug is required")
    .max(100)
    .regex(
      uniqueSlugPattern,
      "Unique slug must start with a letter and contain only letters, numbers, underscores, or hyphens",
    )
    .optional(),
  trackClicks: z.boolean().optional().default(true),
  trackOpens: z.boolean().optional().default(true),
});

export type CreateEmailTemplateInput = z.infer<
  typeof createEmailTemplateSchema
>;

/**
 * Schema for custom variable definition
 */
export const variableDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["text", "number"]),
});

export type VariableDefinition = z.infer<typeof variableDefinitionSchema>;

/**
 * Schema for email content updates
 */
export const emailContentSchema = z.object({
  subject: z.string().max(1000).optional().nullable(),
  previewText: z.string().max(1000).optional().nullable(),
  contentJson: z.unknown().optional(),
  styles: z.unknown().optional(),
  variables: z.array(variableDefinitionSchema).optional(),
});

/**
 * Schema for updating an email template
 * Note: emailContentId is immutable and cannot be changed
 */
export const updateEmailTemplateSchema = z.object({
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
    .optional()
    .nullable(),
  senderIdentityId: z.string().min(1).optional().nullable(),
  replyToIdentityId: z.string().min(1).optional().nullable(),
  templateGroupId: z.string().min(1).optional().nullable(),
  trackClicks: z.boolean().optional(),
  trackOpens: z.boolean().optional(),
  emailContent: emailContentSchema.optional(),
});

export type UpdateEmailTemplateInput = z.infer<
  typeof updateEmailTemplateSchema
>;
