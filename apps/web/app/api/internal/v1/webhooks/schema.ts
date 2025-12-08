/**
 * Webhooks Endpoint - Validation Schemas
 *
 * Schemas for /api/internal/v1/webhooks endpoints
 */

import { z } from "zod";
import type { paths } from "@/webhooks/client/schema";

/**
 * POST /api/internal/v1/webhooks - Create Webhook Destination
 *
 * Request Body Schema
 */
export const createWebhookDestinationSchema = z.object({
  type: z.string().min(1, "Destination type is required"),
  credentials: z.record(z.string(), z.union([z.string(), z.boolean()])),
  config: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
  topics: z.array(z.string()).optional(),
  delivery_metadata: z.record(z.string(), z.string()).optional().nullable(),
  metadata: z.record(z.string(), z.string()).optional().nullable(),
});

/**
 * PATCH /api/internal/v1/webhooks/[id] - Update Webhook Destination
 *
 * Request Body Schema
 */
export const updateWebhookDestinationSchema = z.object({
  credentials: z
    .record(z.string(), z.union([z.string(), z.boolean()]))
    .optional(),
  config: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
  topics: z.array(z.string()).optional(),
  delivery_metadata: z.record(z.string(), z.string()).optional().nullable(),
  metadata: z.record(z.string(), z.string()).optional().nullable(),
});

// Type exports
export type CreateWebhookDestinationInput = z.infer<
  typeof createWebhookDestinationSchema
>;
export type UpdateWebhookDestinationInput = z.infer<
  typeof updateWebhookDestinationSchema
>;

// Type helper for Outpost API destination creation
export type OutpostDestinationCreate =
  paths["/{tenant_id}/destinations"]["post"]["requestBody"]["content"]["application/json"];

export type OutpostDestinationUpdate =
  paths["/{tenant_id}/destinations/{destination_id}"]["patch"]["requestBody"]["content"]["application/json"];

/**
 * GET /api/internal/v1/webhooks/[id]/events - List Events for Webhook
 *
 * Query Parameters Schema
 */
export const listEventsQuerySchema = z.object({
  next: z.string().optional(),
  prev: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  start: z.string().optional(),
  status: z.enum(["success", "failed"]).optional(),
});

/**
 * Response Schema for List Events
 */
export const listEventsResponseSchema = z.object({
  events: z.array(z.any()), // Using z.any() since the event shape comes from Outpost
  count: z.number(),
  next: z.string().nullable(),
  prev: z.string().nullable(),
});

/**
 * Webhook Destination Response Schema
 * Based on Outpost API response structure
 */
export const webhookDestinationResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  topics: z.array(z.string()).optional(),
  config: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
  credentials: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
  enabled: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

/**
 * Webhook Event Deliveries Response Schema
 */
export const webhookEventDeliveriesResponseSchema = z.object({
  deliveries: z.array(z.object({
    id: z.string(),
    status: z.string(),
    response_data: z.object({
      body: z.union([z.object({}).passthrough(), z.string()]),
      status: z.number(),
    }).optional(),
  })),
});

/**
 * Empty Response Schema (for DELETE operations)
 */
export const emptyResponseSchema = z.object({});

// Type exports
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export type ListEventsResponse = z.infer<typeof listEventsResponseSchema>;
export type WebhookDestinationResponse = z.infer<typeof webhookDestinationResponseSchema>;
export type WebhookEventDeliveriesResponse = z.infer<typeof webhookEventDeliveriesResponseSchema>;
