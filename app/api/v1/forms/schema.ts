import * as z from "zod/v4";

/**
 * Validate fields against SurveyJS schema
 *
 * Note: The SurveyJS schema uses non-standard JSON Schema types (e.g., "numeric" instead of "number")
 * which are not compatible with standard JSON Schema validators like Ajv.
 *
 * For now, we validate that fields is a valid object. The actual SurveyJS validation
 * happens on the frontend when rendering the form.
 *
 * Future improvement: Create a custom validator or pre-process the SurveyJS schema
 * to convert non-standard types to JSON Schema compliant types.
 */
export function validateFields(fields: unknown): {
  valid: boolean;
  errors?: Array<{ field: string; message: string }>;
} {
  // Basic validation: fields must be an object
  if (typeof fields !== "object" || fields === null || Array.isArray(fields)) {
    return {
      valid: false,
      errors: [
        {
          field: "fields",
          message: "Fields must be a valid object",
        },
      ],
    };
  }

  const fieldsObj = fields as Record<string, unknown>;
  if ("pages" in fieldsObj && !Array.isArray(fieldsObj.pages)) {
    return {
      valid: false,
      errors: [
        {
          field: "fields.pages",
          message: "Pages must be an array",
        },
      ],
    };
  }

  return { valid: true };
}

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
  // Fields will be validated separately against SurveyJS schema
  fields: z.any(),
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
  fields: z.any().optional(),
});

/**
 * Form Response Schema
 */
export const formResponseSchema = z.object({
  object: z.literal("form"),
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  version: z.number(),
  fields: z.unknown(),
  settings: z.unknown().nullable(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Form List Response Schema
 */
export const formListResponseSchema = z.object({
  object: z.literal("form_list"),
  hasMore: z.boolean(),
  data: z.array(formResponseSchema.omit({ object: true })),
});

/**
 * Type exports
 */
export type CreateFormRequest = z.infer<typeof createFormSchema>;
export type UpdateFormRequest = z.infer<typeof updateFormSchema>;
export type FormResponse = z.infer<typeof formResponseSchema>;
export type FormListResponse = z.infer<typeof formListResponseSchema>;
