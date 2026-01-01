/**
 * Contacts Schema Validation (External API)
 *
 * Zod schemas for validating contact requests
 */

import { z } from "zod";
import { conditionSchema } from "@/app/(main)/api/v1/segments/schema";

/**
 * Contact Status Enum
 */
export const ContactStatusEnum = z.enum([
  "SUBSCRIBED",
  "UNSUBSCRIBED",
  "BOUNCED",
  "COMPLAINED",
  "ARCHIVED",
  "UNCONFIRMED",
]);

/**
 * Create Contact Request Schema
 */
export const createContactSchema = z.object({
  email: z
    .email("Invalid email format")
    .min(1, "Email is required")
    .max(255, "Email must be 255 characters or less"),
  firstName: z
    .string()
    .max(100, "First name must be 100 characters or less")
    .optional()
    .nullable(),
  lastName: z
    .string()
    .max(100, "Last name must be 100 characters or less")
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(50, "Phone must be 50 characters or less")
    .optional()
    .nullable(),
  country: z
    .string()
    .max(10, "Country must be 10 characters or less")
    .optional()
    .nullable(),
  timezone: z
    .string()
    .max(100, "Timezone must be 100 characters or less")
    .optional()
    .nullable(),
  city: z
    .string()
    .max(100, "City must be 100 characters or less")
    .optional()
    .nullable(),
  status: ContactStatusEnum.optional().default("SUBSCRIBED"),
  subscribedAt: z.coerce.date().optional().nullable(),
  unsubscribedAt: z.coerce.date().optional().nullable(),
  properties: z
    .record(z.string(), z.union([z.string(), z.number(), z.null()]))
    .optional(),
  topics: z.array(z.string()).optional().default([]),
});

/**
 * Update Contact Request Schema
 */
export const updateContactSchema = z.object({
  email: z
    .email("Invalid email format")
    .min(1, "Email is required")
    .max(255, "Email must be 255 characters or less")
    .optional(),
  firstName: z
    .string()
    .max(100, "First name must be 100 characters or less")
    .optional()
    .nullable(),
  lastName: z
    .string()
    .max(100, "Last name must be 100 characters or less")
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(50, "Phone must be 50 characters or less")
    .optional()
    .nullable(),
  country: z
    .string()
    .max(10, "Country must be 10 characters or less")
    .optional()
    .nullable(),
  timezone: z
    .string()
    .max(100, "Timezone must be 100 characters or less")
    .optional()
    .nullable(),
  city: z
    .string()
    .max(100, "City must be 100 characters or less")
    .optional()
    .nullable(),
  status: ContactStatusEnum.optional(),
  subscribedAt: z.coerce.date().optional().nullable(),
  unsubscribedAt: z.coerce.date().optional().nullable(),
  properties: z
    .record(z.string(), z.union([z.string(), z.number(), z.null()]))
    .optional(),
  topics: z.array(z.string()).optional(),
});

/**
 * Contact Response Schema
 */
export const contactResponseSchema = z.object({
  object: z.literal("contact"),
  id: z.string(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  country: z.string().nullable(),
  timezone: z.string().nullable(),
  city: z.string().nullable(),
  status: ContactStatusEnum,
  subscribedAt: z.date().nullable(),
  unsubscribedAt: z.date().nullable(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
  topics: z.array(z.string()),
});

/**
 * Contact List Response Schema
 */
export const contactListResponseSchema = z.object({
  object: z.literal("contact_list"),
  hasMore: z.boolean(),
  data: z.array(contactResponseSchema.omit({ object: true })),
});

/**
 * Contact Delete Response Schema
 * Simple response confirming deletion with just the deleted contact's ID
 */
export const contactDeleteResponseSchema = z.object({
  object: z.literal("contact"),
  id: z.string().describe("ID of the deleted contact"),
});

/**
 * Search Contacts Request Schema
 */
export const searchContactsSchema = z.object({
  filters: conditionSchema,
});

/**
 * Type exports for TypeScript
 */
export type CreateContactRequest = z.infer<typeof createContactSchema>;
export type UpdateContactRequest = z.infer<typeof updateContactSchema>;
export type ContactResponse = z.infer<typeof contactResponseSchema>;
export type ContactListResponse = z.infer<typeof contactListResponseSchema>;
export type ContactDeleteResponse = z.infer<typeof contactDeleteResponseSchema>;
export type SearchContactsRequest = z.infer<typeof searchContactsSchema>;
