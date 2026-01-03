/**
 * Broadcasts Schema Validation (External API)
 *
 * Zod schemas for validating broadcast requests
 */

import { z } from "zod";

/**
 * Maximum length for the local part of email addresses (before @)
 * RFC 5321 allows up to 64 characters, but we use a more practical limit
 */
const MAX_EMAIL_LOCAL_PART_LENGTH = 64;

/**
 * Email "from" field validation
 * Must be in format: local-part@domain
 * Local part can contain alphanumeric characters, dots, hyphens, underscores, plus signs
 */
const emailFromSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    "Invalid email format. Must be in format: name@domain.com",
  )
  .refine(
    (email) => {
      const localPart = email.split("@")[0];
      return localPart.length <= MAX_EMAIL_LOCAL_PART_LENGTH;
    },
    {
      message: `Email local part must be ${MAX_EMAIL_LOCAL_PART_LENGTH} characters or less`,
    },
  );

/**
 * Email Content Schema
 * Used for both create and update requests
 */
const emailContentSchema = z.object({
  subject: z
    .string()
    .max(255, "Subject must be 255 characters or less")
    .optional(),
  text: z.string().optional(),
  html: z.string().optional(),
  previewText: z
    .string()
    .max(255, "Preview text must be 255 characters or less")
    .optional(),
  contentJson: z.record(z.string(), z.unknown()).optional(),
  styles: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Create Broadcast Request Schema
 */
export const createBroadcastSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less"),
  from: emailFromSchema.optional(),
  emailContent: emailContentSchema.optional(),
  replyTo: z.email("Invalid reply-to email format").optional(),
  topicId: z.string().optional(),
  segmentId: z.string().optional(),
});

/**
 * Update Broadcast Request Schema
 */
export const updateBroadcastSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less")
    .optional(),
  from: emailFromSchema.optional(),
  emailContent: emailContentSchema.nullable().optional(),
  replyTo: z.email("Invalid reply-to email format").optional(),
  replyToIdentityId: z.string().nullable().optional(),
  topicId: z.string().nullable().optional(),
  segmentId: z.string().nullable().optional(),
  sendAt: z.coerce.date().nullable().optional(),
  trackClicks: z.boolean().nullable().optional(),
  trackOpens: z.boolean().nullable().optional(),
});

/**
 * Email Content Response Schema
 */
const emailContentResponseSchema = z.object({
  subject: z.string().nullable(),
  text: z.string().nullable(),
  html: z.string().nullable(),
  previewText: z.string().nullable(),
  json: z.record(z.string(), z.unknown()).nullable(),
  styles: z.record(z.string(), z.unknown()).nullable(),
});

/**
 * Broadcast Response Schema
 */
export const broadcastResponseSchema = z.object({
  object: z.literal("broadcast"),
  id: z.string(),
  name: z.string(),
  status: z.string(),
  from: z.string().nullable(),
  emailContent: emailContentResponseSchema.nullable(),
  replyTo: z.string().nullable(),
  topicId: z.string().nullable(),
  segmentId: z.string().nullable(),
  sendAt: z.string().nullable(),
  createdAt: z.string(),
});

/**
 * Broadcast List Response Schema
 */
export const broadcastListResponseSchema = z.object({
  object: z.literal("broadcast_list"),
  hasMore: z.boolean(),
  data: z.array(broadcastResponseSchema.omit({ object: true })),
});

/**
 * Type exports for TypeScript
 */
export type CreateBroadcastRequest = z.infer<typeof createBroadcastSchema>;
export type UpdateBroadcastRequest = z.infer<typeof updateBroadcastSchema>;
export type BroadcastResponse = z.infer<typeof broadcastResponseSchema>;
export type BroadcastListResponse = z.infer<typeof broadcastListResponseSchema>;
