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

/**
 * Email recipient with optional per-email variables
 * Variables are transient (not saved to contact) and override contact properties
 */
const emailWithVariablesSchema = z.object({
  email: z.string().email(),
  variables: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

/**
 * Recipients Schema
 * Defines how recipients can be specified for a broadcast
 *
 * The emails field accepts either:
 * - string[] (simple email addresses, backward compatible)
 * - { email: string, variables?: Record<string, string | number> }[] (with per-email variables)
 */
const recipientsSchema = z.object({
  contacts: z.array(z.string()).optional(),
  emails: z.union([
    z.array(z.string().email()),
    z.array(emailWithVariablesSchema),
  ]).optional(),
  segment: z.string().optional(),
  topic: z.string().optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: "At least one recipient mode is required" }
);

/**
 * Email Content Schema for Create and Send
 * Requires subject and html - no editor-based content allowed
 */
const emailContentCreateAndSendSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(255, "Subject must be 255 characters or less"),
  html: z.string().min(1, "HTML content is required"),
  text: z.string().optional(),
  previewText: z.string().max(255, "Preview text must be 255 characters or less").optional(),
});

/**
 * Create and Send Broadcast Request Schema
 * Creates a broadcast with raw HTML/text content and schedules it for a future time
 * sendAt is required to prevent accidental immediate sends
 */
export const createAndSendBroadcastSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be 255 characters or less"),
  from: emailFromSchema.optional(),
  replyTo: z.email("Invalid reply-to email format").optional(),
  emailContent: emailContentCreateAndSendSchema,
  recipients: recipientsSchema,
  sendAt: z.string().datetime(),
});

/**
 * Create and Send Broadcast Response Schema
 * Returns only object type and broadcast ID
 */
export const createAndSendBroadcastResponseSchema = z.object({
  object: z.literal("broadcast").describe("Object type identifier"),
  id: z.string().describe("Unique broadcast ID for tracking"),
});

export type CreateAndSendBroadcastRequest = z.infer<typeof createAndSendBroadcastSchema>;
export type CreateAndSendBroadcastResponse = z.infer<typeof createAndSendBroadcastResponseSchema>;

/**
 * Broadcast Send Response Schema
 * Represents a single email send within a broadcast
 */
export const broadcastSendResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  contactId: z.string().nullable(),
  status: z.enum(["QUEUED", "SENDING", "SENT", "DELIVERED", "BOUNCED", "COMPLAINED", "FAILED"]),
  queuedAt: z.string(),
  sentAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  firstOpenedAt: z.string().nullable(),
  firstClickedAt: z.string().nullable(),
  bouncedAt: z.string().nullable(),
  complainedAt: z.string().nullable(),
  openCount: z.number(),
  clickCount: z.number(),
  uniqueLinksClicked: z.number(),
  bounceClassification: z.string().nullable(),
  lastResponseCode: z.number().nullable(),
  lastResponseMessage: z.string().nullable(),
});

/**
 * Broadcast Sends List Response Schema
 */
export const broadcastSendListResponseSchema = z.object({
  object: z.literal("broadcast_send_list"),
  hasMore: z.boolean(),
  data: z.array(broadcastSendResponseSchema),
});

/**
 * Broadcast Stats Response Schema
 */
export const broadcastStatsResponseSchema = z.object({
  object: z.literal("broadcast_stats"),
  broadcastId: z.string(),
  recipients: z.object({
    total: z.number(),
    queued: z.number(),
    sent: z.number(),
    delivered: z.number(),
    bounced: z.number(),
    complained: z.number(),
    failed: z.number(),
    unsubscribed: z.number(),
  }),
  engagement: z.object({
    opened: z.number(),
    clicked: z.number(),
    openRate: z.number(),
    clickRate: z.number(),
    clickToOpenRate: z.number(),
  }),
  deliverability: z.object({
    deliveryRate: z.number(),
    bounceRate: z.number(),
    complaintRate: z.number(),
  }),
  detailsPruned: z.boolean(),
});

export type BroadcastSendResponse = z.infer<typeof broadcastSendResponseSchema>;
export type BroadcastSendListResponse = z.infer<typeof broadcastSendListResponseSchema>;
export type BroadcastStatsResponse = z.infer<typeof broadcastStatsResponseSchema>;
