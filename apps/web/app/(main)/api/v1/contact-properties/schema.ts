/**
 * Contact Properties Schema Validation (External API)
 *
 * Zod schemas for validating contact property requests.
 * The slot field is managed internally and not exposed via API.
 */

import { z } from "zod";

/**
 * Contact Property Type Enum
 */
const ContactPropertyTypeEnum = z.enum(["DATE", "NUMBER", "STRING"]);

/**
 * Default value validation per type
 */
const dateDefaultValue = z
  .string()
  .regex(/^\d+$/, "Date default value must be a Unix timestamp in milliseconds")
  .refine((val) => {
    const num = parseInt(val, 10);
    return num > 0 && num <= Date.now() + 315360000000; // Allow up to 10 years in future
  }, "Unix timestamp must be a valid date");

const numberDefaultValue = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, "Number default value must be a decimal number");

const stringDefaultValue = z
  .string()
  .min(1, "String default value must be at least 1 character")
  .max(255, "String default value must be 255 characters or less");

/**
 * Create Contact Property Request Schema
 */
export const createContactPropertySchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be 100 characters or less")
      .regex(
        /^[a-zA-Z0-9_\s-]+$/,
        "Name can only contain letters, numbers, spaces, hyphens, and underscores",
      )
      .trim(),
    type: ContactPropertyTypeEnum,
    defaultValue: z
      .string()
      .max(255, "Default value must be 255 characters or less")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      // Only validate if defaultValue is explicitly provided (not null/undefined)
      if (data.defaultValue === null || data.defaultValue === undefined) {
        return true;
      }

      if (data.type === "DATE") {
        return dateDefaultValue.safeParse(data.defaultValue).success;
      }
      if (data.type === "NUMBER") {
        return numberDefaultValue.safeParse(data.defaultValue).success;
      }
      if (data.type === "STRING") {
        return stringDefaultValue.safeParse(data.defaultValue).success;
      }
      return false;
    },
    {
      message:
        "Default value validation failed: DATE must be Unix timestamp, NUMBER must be decimal, STRING must be 1-255 chars",
      path: ["defaultValue"],
    },
  );

/**
 * Update Contact Property Request Schema
 */
export const updateContactPropertySchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be 100 characters or less")
      .regex(
        /^[a-zA-Z0-9_\s-]+$/,
        "Name can only contain letters, numbers, spaces, hyphens, and underscores",
      )
      .trim()
      .optional(),
    defaultValue: z
      .string()
      .max(255, "Default value must be 255 characters or less")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      // Cannot validate default value without knowing the type
      // Type changes are not allowed after creation
      return true;
    },
    {
      message: "Invalid update data",
    },
  );

/**
 * Contact Property Response Schema
 */
export const contactPropertyResponseSchema = z.object({
  object: z.literal("contact_property"),
  id: z.string(),
  name: z.string(),
  type: ContactPropertyTypeEnum,
  defaultValue: z.string().nullable(),
});

/**
 * Contact Property List Response Schema
 */
export const contactPropertyListResponseSchema = z.object({
  object: z.literal("contact_property_list"),
  hasMore: z.boolean(),
  data: z.array(contactPropertyResponseSchema.omit({ object: true })),
});

/**
 * Contact Property Delete Response Schema
 */
const contactPropertyDeleteResponseSchema = z.object({
  object: z.literal("contact_property"),
  id: z.string().describe("ID of the deleted contact property"),
});

/**
 * Type exports for TypeScript
 */
export type CreateContactPropertyRequest = z.infer<
  typeof createContactPropertySchema
>;
type UpdateContactPropertyRequest = z.infer<typeof updateContactPropertySchema>;
export type ContactPropertyResponse = z.infer<
  typeof contactPropertyResponseSchema
>;
export type ContactPropertyListResponse = z.infer<
  typeof contactPropertyListResponseSchema
>;
type ContactPropertyDeleteResponse = z.infer<
  typeof contactPropertyDeleteResponseSchema
>;
