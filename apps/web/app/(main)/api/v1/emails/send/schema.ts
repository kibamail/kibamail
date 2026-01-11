/**
 * Transactional Email Schema Validation (External API)
 *
 * Zod schemas for validating transactional email requests
 */

import { z } from "zod/v4";

/**
 * Transactional Email Attachment Schema
 */
const transactionalAttachmentSchema = z.object({
  filename: z.string().min(1, "Attachment filename is required").max(255, "Attachment filename must be 255 characters or less").describe("Original filename of the attachment"),
  content: z.string().min(1, "Attachment content is required").describe("Base64-encoded file content"),
  contentType: z.string().optional().default("application/octet-stream").describe("MIME type of the file (e.g., application/pdf, image/png)"),
});

/**
 * Transactional Email Reply-To Schema
 */
const replyToSchema = z.object({
  email: z.email("Invalid reply-to email format").describe("Reply-to email address"),
  name: z.string().max(255, "Reply-To name must be 255 characters or less").optional().describe("Reply-to display name (optional)"),
});

/**
 * Send Transactional Email Request Schema
 */
export const sendTransactionalEmailSchema = z.object({
  from: z
    .email("Invalid from email format")
    .min(1, "From email is required")
    .max(255, "From email must be 255 characters or less")
    .describe("Sender email address (must be from a verified sending domain)"),
  to: z.union([
    z.email("Invalid to email format"),
    z.array(z.email("Invalid to email format")).min(1, "At least one recipient required"),
  ]).describe("Recipient email address(es) - single email or array of emails"),
  replyTo: replyToSchema.optional().describe("Custom reply-to address (optional)"),
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(500, "Subject must be 500 characters or less")
    .describe("Email subject line"),
  previewText: z
    .string()
    .max(150, "Preview text must be 150 characters or less")
    .optional()
    .describe("Preview text shown in email clients (optional)"),
  html: z
    .string()
    .min(1, "HTML body is required")
    .max(10_000_000, "HTML body is too large (max 10MB)")
    .describe("HTML email body content"),
  text: z
    .string()
    .max(10_000_000, "Text body is too large (max 10MB)")
    .optional()
    .describe("Plain text email body content (auto-generated from HTML if not provided)"),
  attachments: z.array(transactionalAttachmentSchema).max(25, "Maximum 25 attachments allowed").optional().default([]).describe("Email attachments (max 25 files, 25MB total)"),
  metadata: z.record(z.string(), z.string()).optional().describe("Custom metadata for tracking (key-value pairs)"),
});

/**
 * Send Transactional Email Response Schema
 */
export const sendTransactionalEmailResponseSchema = z.object({
  object: z.literal("email").describe("Object type identifier"),
  id: z.string().describe("Unique email send ID for tracking"),
});

/**
 * Type exports for TypeScript
 */
export type SendTransactionalEmailRequest = z.infer<typeof sendTransactionalEmailSchema>;
export type SendTransactionalEmailResponse = z.infer<typeof sendTransactionalEmailResponseSchema>;
export type TransactionalAttachment = z.infer<typeof transactionalAttachmentSchema>;
export type ReplyTo = z.infer<typeof replyToSchema>;
