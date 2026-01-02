import * as z from "zod/v4";
import { formBuilderSchema } from "@/lib/form-builder/schema";

/**
 * Form type enum values
 */
export const formTypeEnum = z.enum(["SIGN_UP", "SURVEY"]);

/**
 * Form display enum values
 */
export const formDisplayEnum = z.enum(["POPUP", "INLINE_EMBED"]);

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
  // Fields validated against our form builder schema
  fields: formBuilderSchema.optional(),
});

/**
 * Update Form Request Schema
 */
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
  // Fields validated against our form builder schema
  fields: formBuilderSchema.optional(),
  settings: z.any().optional(),
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
export const formListItemSchema = z.object({
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
export const formVersionItemSchema = z.object({
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
export type UpdateFormRequest = z.infer<typeof updateFormSchema>;
export type FormResponse = z.infer<typeof formResponseSchema>;
export type FormListResponse = z.infer<typeof formListResponseSchema>;
export type FormDeleteResponse = z.infer<typeof formDeleteResponseSchema>;
export type FormSubmissionResponse = z.infer<typeof formSubmissionResponseSchema>;
