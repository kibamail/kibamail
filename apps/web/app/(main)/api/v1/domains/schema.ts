/**
 * Sending Domains Schema
 *
 * Validation schemas for domain CRUD operations.
 */

import * as z from "zod/v4";

/**
 * Domain name regex pattern
 * Matches valid domain names like example.com, sub.example.co.uk
 */
const domainNameRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/;

/**
 * Create Sending Domain Request Schema
 */
export const createSendingDomainSchema = z.object({
  name: z
    .string()
    .min(1, "Domain name is required")
    .max(100, "Domain name must be 100 characters or less")
    .regex(domainNameRegex, "Invalid domain name format")
    .trim()
    .toLowerCase(),
  dmarcEnabled: z.boolean().optional().default(false),
});

/**
 * Update Sending Domain Request Schema
 */
export const updateSendingDomainSchema = z.object({
  openTrackingEnabled: z.boolean().optional(),
  clickTrackingEnabled: z.boolean().optional(),
  dmarcEnabled: z.boolean().optional(),
});

/**
 * DNS Record Response Schema
 */
const dnsRecordSchema = z.object({
  type: z.enum(["TXT", "CNAME"]),
  hostname: z.string(),
  value: z.string(),
});

/**
 * DNS Records Response Schema
 */
const dnsRecordsSchema = z.object({
  dkim: dnsRecordSchema,
  returnPath: dnsRecordSchema,
  tracking: dnsRecordSchema,
});

/**
 * Record Verification Status Schema
 */
const recordVerificationSchema = z.object({
  configured: z.boolean(),
  expected: z.string(),
  found: z.array(z.string()),
});

/**
 * DNS Verification Response Schema
 */
const dnsVerificationSchema = z.object({
  dkim: recordVerificationSchema,
  returnPath: recordVerificationSchema,
  tracking: recordVerificationSchema,
  dmarc: recordVerificationSchema,
  mx: recordVerificationSchema.optional(),
  allVerified: z.boolean(),
});

/**
 * SSL Issuance Status Schema
 */
const sslStatusSchema = z
  .enum(["pending", "in_progress", "completed", "failed"])
  .nullable();

/**
 * Sending Domain Response Schema
 */
export const sendingDomainResponseSchema = z.object({
  object: z.literal("sending_domain"),
  id: z.string(),
  name: z.string(),
  dkimVerified: z.boolean(),
  returnPathVerified: z.boolean(),
  trackingVerified: z.boolean(),
  openTrackingEnabled: z.boolean(),
  clickTrackingEnabled: z.boolean(),
  dnsRecords: dnsRecordsSchema,
  createdAt: z.string(),
  sslStatus: sslStatusSchema,
  sslError: z.string().nullable(),
});

/**
 * Sending Domain List Response Schema
 */
export const sendingDomainListResponseSchema = z.object({
  object: z.literal("sending_domain_list"),
  hasMore: z.boolean(),
  data: z.array(sendingDomainResponseSchema.omit({ object: true })),
});

/**
 * Sending Domain Verify Response Schema
 * Includes domain data plus verification results
 */
export const sendingDomainVerifyResponseSchema = z.object({
  object: z.literal("sending_domain"),
  id: z.string(),
  name: z.string(),
  dkimVerified: z.boolean(),
  returnPathVerified: z.boolean(),
  trackingVerified: z.boolean(),
  openTrackingEnabled: z.boolean(),
  clickTrackingEnabled: z.boolean(),
  dnsRecords: dnsRecordsSchema,
  createdAt: z.string(),
  sslStatus: sslStatusSchema,
  sslError: z.string().nullable(),
  verification: dnsVerificationSchema,
});

/**
 * Type exports
 */
export type CreateSendingDomainRequest = z.input<
  typeof createSendingDomainSchema
>;
export type UpdateSendingDomainRequest = z.infer<
  typeof updateSendingDomainSchema
>;
export type SendingDomainResponse = z.infer<typeof sendingDomainResponseSchema>;
export type SendingDomainListResponse = z.infer<
  typeof sendingDomainListResponseSchema
>;
export type SendingDomainVerifyResponse = z.infer<
  typeof sendingDomainVerifyResponseSchema
>;
