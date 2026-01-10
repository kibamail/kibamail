/**
 * Transactional Email Schema Validation (External API)
 *
 * Zod schemas for validating transactional email requests
 */

import { z } from "zod";

/**
 * Transactional Email Attachment Schema
 */
const transactionalAttachmentSchema = z.object({
  filename: z.string().min(1, "Attachment filename is required").max(255, "Attachment filename must be 255 characters or less"),
  content: z.string().min(1, "Attachment content is required"),
  contentType: z.string().optional().default("application/octet-stream"),
});

/**
 * Send Transactional Email Request Schema
 */
export const sendTransactionalEmailSchema = z.object({
  from: z
    .string()
    .email("Invalid from email format")
    .min(1, "From email is required")
    .max(255, "From email must be 255 characters or less"),
  to: z.union([
    z.string().email("Invalid to email format"),
    z.array(z.string().email("Invalid to email format")).min(1, "At least one recipient required"),
  ]),
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(500, "Subject must be 500 characters or less"),
  html: z
    .string()
    .min(1, "HTML body is required")
    .max(10_000_000, "HTML body is too large (max 10MB)"),
  text: z
    .string()
    .max(10_000_000, "Text body is too large (max 10MB)")
    .optional(),
  attachments: z.array(transactionalAttachmentSchema).max(25, "Maximum 25 attachments allowed").optional().default([]),
  metadata: z.record(z.string(), z.string()).optional(),
});

/**
 * Type exports for TypeScript
 */
export type SendTransactionalEmailRequest = z.infer<typeof sendTransactionalEmailSchema>;
export type TransactionalAttachment = z.infer<typeof transactionalAttachmentSchema>;
