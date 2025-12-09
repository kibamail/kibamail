import * as z from "zod/v4";
import { ALL_NODE_TYPES, TRIGGER_TYPES } from "@/lib/automations/config";

export const AutomationStatusEnum = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const AutomationTriggerEnum = z.enum(TRIGGER_TYPES as [string, ...string[]]);

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// Node data schema is intentionally lenient for save operations.
// Strict validation happens at publish time via validateAutomationForPublish.
// This allows users to save work-in-progress automations with incomplete data.
const nodeDataSchema = z.record(z.string(), z.any()).optional().default({});

const nodeSchema = z.object({
  id: z.string(),
  type: z.enum(ALL_NODE_TYPES as [string, ...string[]]),
  position: positionSchema,
  data: nodeDataSchema,
});

const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  type: z.string().optional(),
  animated: z.boolean().optional(),
  data: z.record(z.string(), z.any()).optional(),
});

const triggerConfigSchema = z.object({
  segmentId: z.string().optional(),
  eventName: z.string().optional(),
  propertyName: z.string().optional(),
  formId: z.string().optional(),
  emailEngagementType: z.enum(["open", "click", "bounce", "spam"]).optional(),
});

const triggerSchema = z.object({
  type: AutomationTriggerEnum,
  config: triggerConfigSchema.optional().default({}),
});

// Schema is intentionally lenient for create/update operations.
// Strict validation (node data, flow structure) happens at publish time.
export const createAutomationSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be 100 characters or less"),
    description: z
      .string()
      .max(500, "Description must be 500 characters or less")
      .optional()
      .nullable(),
    trigger: triggerSchema.optional(),
    nodes: z.array(nodeSchema).optional().default([]),
    edges: z.array(edgeSchema).default([]),
  })
  .refine(
    (data) => {
      if (data.nodes.length === 0) return true;
      const nodeIds = new Set(data.nodes.map((n) => n.id));
      return data.edges.every(
        (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );
    },
    { message: "All edges must reference existing nodes" }
  );

// Update schema without defaults - allows partial updates without defaults overriding undefined values
export const updateAutomationSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be 100 characters or less")
      .optional(),
    description: z
      .string()
      .max(500, "Description must be 500 characters or less")
      .optional()
      .nullable(),
    trigger: triggerSchema.optional(),
    nodes: z.array(nodeSchema).optional(),
    edges: z.array(edgeSchema).optional(),
  })
  .refine(
    (data) => {
      if (!data.nodes || data.nodes.length === 0) return true;
      if (!data.edges) return true;
      const nodeIds = new Set(data.nodes.map((n) => n.id));
      return data.edges.every(
        (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );
    },
    { message: "All edges must reference existing nodes" }
  );

export const automationResponseSchema = z.object({
  object: z.literal("automation"),
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: AutomationStatusEnum,
  version: z.number(),
  parentId: z.string().nullable(),
  trigger: z.object({
    type: z.string(),
    config: z.record(z.string(), z.any()),
  }),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  stats: z.record(z.string(), z.any()).nullable(),
  publishedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const automationListResponseSchema = z.object({
  object: z.literal("automation_list"),
  hasMore: z.boolean(),
  data: z.array(automationResponseSchema.omit({ object: true })),
});

export type CreateAutomationRequest = z.infer<typeof createAutomationSchema>;
export type UpdateAutomationRequest = z.infer<typeof updateAutomationSchema>;
export type AutomationResponse = z.infer<typeof automationResponseSchema>;
export type AutomationListResponse = z.infer<
  typeof automationListResponseSchema
>;

export type CreateAutomationInput = z.input<typeof createAutomationSchema>;
export type UpdateAutomationInput = z.input<typeof updateAutomationSchema>;
