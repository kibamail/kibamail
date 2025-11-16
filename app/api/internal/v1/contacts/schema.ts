/**
 * Internal Contacts Schema Validation
 *
 * Zod schemas for validating contact requests from the dashboard
 * Reuses the external API schema (which includes topics field)
 */

import {
  createContactSchema,
  updateContactSchema,
  type CreateContactRequest,
  type UpdateContactRequest,
} from "@/app/api/v1/contacts/schema";

/**
 * Create Contact Request Schema (Internal)
 * Uses the external API schema directly (includes topics field)
 */
export const createContactInternalSchema = createContactSchema;

/**
 * Update Contact Request Schema (Internal)
 * Uses the external API update schema directly
 */
export const updateContactInternalSchema = updateContactSchema;

/**
 * Type exports for TypeScript
 */
export type CreateContactInternalRequest = CreateContactRequest;
export type UpdateContactInternalRequest = UpdateContactRequest;
