/**
 * Contact Imports - Schema
 *
 * Zod schemas for contact import request/response validation
 */

import { z } from "zod";

// Response schema for creating a contact import
const createContactImportResponseSchema = z.object({
  id: z.string(),
  fileKey: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  status: z.string(),
  createdAt: z.string(),
});

export type CreateContactImportResponse = z.infer<
  typeof createContactImportResponseSchema
>;

// Request schema for updating a contact import
export const updateContactImportSchema = z.object({
  columnMapping: z.record(z.string(), z.string()).optional(),
  topicIds: z.array(z.string()).optional(),
  autoSubscribe: z.boolean().optional(),
  updateExisting: z.boolean().optional(),
  totalRows: z.number().optional(),
});

export type UpdateContactImportRequest = z.infer<
  typeof updateContactImportSchema
>;

// Response schema for updating a contact import
const updateContactImportResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  ready: z.boolean(),
  missing: z.array(z.string()),
  updatedAt: z.string(),
});

export type UpdateContactImportResponse = z.infer<
  typeof updateContactImportResponseSchema
>;

// Response schema for getting a contact import
const contactImportResponseSchema = z.object({
  id: z.string(),
  fileKey: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  status: z.string(),
  columnMapping: z.record(z.string(), z.string()).nullable(),
  topicIds: z.array(z.string()),
  autoSubscribe: z.boolean(),
  updateExisting: z.boolean(),
  totalRows: z.number(),
  processedRows: z.number(),
  createdCount: z.number(),
  updatedCount: z.number(),
  skippedCount: z.number(),
  failedCount: z.number(),
  errorMessage: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ContactImportResponse = z.infer<typeof contactImportResponseSchema>;
