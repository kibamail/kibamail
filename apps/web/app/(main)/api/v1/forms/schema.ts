import * as z from "zod/v4";
import { formBuilderSchema } from "@/lib/form-builder/schema";

/**
 * Form type enum values
 */
const formTypeEnum = z.enum(["SIGN_UP", "SURVEY"]);

/**
 * Form display enum values
 */
const formDisplayEnum = z.enum(["POPUP", "INLINE_EMBED"]);

/**
 * Create Form Request Schema
 */
export const createFormSchema = z.object({
  name: z
    .string()
    .min(1, "Form name is required")
    .max(200, "Form name must be 200 characters or less")
    .trim(),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or less")
    .trim()
    .optional()
    .nullable(),
  type: formTypeEnum.optional().default("SIGN_UP"),
  display: formDisplayEnum.optional().default("INLINE_EMBED"),
  fields: formBuilderSchema.optional(),
});

/**
 * SEO fields schema for form customization
 */
const seoFieldsSchema = z.object({
  seoTitle: z
    .string()
    .max(200, "SEO title must be 200 characters or less")
    .optional()
    .nullable(),
  seoDescription: z
    .string()
    .max(500, "SEO description must be 500 characters or less")
    .optional()
    .nullable(),
  seoImageUrl: z
    .string()
    .url("Must be a valid URL")
    .max(2000, "URL must be 2000 characters or less")
    .optional()
    .nullable(),
  seoFaviconUrl: z
    .string()
    .url("Must be a valid URL")
    .max(2000, "URL must be 2000 characters or less")
    .optional()
    .nullable(),
  slug: z
    .string()
    .max(100, "Slug must be 100 characters or less")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must be lowercase alphanumeric with hyphens only"
    )
    .optional()
    .nullable(),
});

export const updateFormSchema = z.object({
  name: z
    .string()
    .min(1, "Form name is required")
    .max(200, "Form name must be 200 characters or less")
    .trim()
    .optional(),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or less")
    .trim()
    .optional()
    .nullable(),
  type: formTypeEnum.optional(),
  display: formDisplayEnum.optional(),
  fields: formBuilderSchema.optional(),
  settings: z.any().optional(),
  doubleOptInEmailId: z.string().optional().nullable(),
  ...seoFieldsSchema.shape,
});

/**
 * Form Response Schema
 * Returns only the generated form ID after creation
 */
export const formResponseSchema = z.object({
  object: z.literal("form"),
  id: z.string().describe("Unique form identifier"),
});

/**
 * Form List Item Schema (simplified for list endpoints)
 */
const formListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: formTypeEnum,
  display: formDisplayEnum,
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

/**
 * Form List Response Schema
 */
export const formListResponseSchema = z.object({
  object: z.literal("form_list"),
  hasMore: z.boolean(),
  data: z.array(formListItemSchema),
});

/**
 * Form Version Item Schema (for versions list)
 */
const formVersionItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: formTypeEnum,
  display: formDisplayEnum,
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  version: z.number(),
});

/**
 * Form Version List Response Schema
 */
export const formVersionListResponseSchema = z.object({
  object: z.literal("form_version_list"),
  data: z.array(formVersionItemSchema),
});

/**
 * Form Delete Response Schema
 */
export const formDeleteResponseSchema = z.object({
  object: z.literal("form"),
  id: z.string().describe("ID of the deleted form"),
});

/**
 * Form Submission Response Schema
 */
export const formSubmissionResponseSchema = z.object({
  object: z.literal("form_submission"),
  data: z.object({
    id: z.string().describe("Unique form submission identifier"),
  }),
});

/**
 * Type exports
 */
export type CreateFormRequest = z.infer<typeof createFormSchema>;
export type FormResponse = z.infer<typeof formResponseSchema>;
export type FormListResponse = z.infer<typeof formListResponseSchema>;
export type FormSubmissionResponse = z.infer<
  typeof formSubmissionResponseSchema
>;
