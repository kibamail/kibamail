/**
 * Automations Schema Validation (External API)
 *
 * Comprehensive validation for automation workflows with React Flow nodes and edges
 */

import * as z from "zod/v4";
import { conditionSchema } from "@/app/api/v1/segments/schema";
import {
  ALL_NODE_TYPES,
  TRIGGER_TYPES,
  TRIGGER_NODE_IDS,
} from "@/lib/automations/config";

/**
 * Automation Status Enum
 */
export const AutomationStatusEnum = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

/**
 * Automation Trigger Enum
 * Generated from centralized config
 */
export const AutomationTriggerEnum = z.enum(TRIGGER_TYPES as [string, ...string[]]);

/**
 * React Flow Position Schema
 */
const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

/**
 * Percentage Split Configuration
 */
const percentageSplitDataSchema = z.object({
  splits: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        percentage: z.number().min(0).max(100),
      })
    )
    .length(2)
    .refine(
      (splits) => {
        const total = splits.reduce((sum, split) => sum + split.percentage, 0);
        return total === 100;
      },
      { message: "Split percentages must total 100" }
    ),
});

/**
 * Time Delay Configuration
 */
const timeDelayDataSchema = z.object({
  duration: z.number().positive(),
  unit: z.enum(["seconds", "minutes", "hours", "days"]),
});

/**
 * If/Else Configuration
 * Uses the same condition schema as segments for consistency
 */
const ifElseDataSchema = z.object({
  conditions: conditionSchema,
});

/**
 * Send Email Configuration
 */
const sendEmailDataSchema = z.object({
  templateId: z.string().optional(),
  subject: z.string().optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional(),
  replyTo: z.string().email().optional(),
});

/**
 * Send Webhook Configuration
 */
const sendWebhookDataSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
});

/**
 * Update Contact Configuration
 */
const updateContactDataSchema = z.object({
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

/**
 * Add/Remove Topic Configuration
 */
const topicDataSchema = z.object({
  topicId: z.string(),
});

/**
 * Trigger Node Data Schema
 */
const triggerNodeDataSchema = z.object({
  triggerType: z.string().optional(),
  // Additional trigger-specific config can go here
}).passthrough();

/**
 * Node Data Schema - validates based on node type
 */
const nodeDataSchema = z.union([
  percentageSplitDataSchema,
  timeDelayDataSchema,
  ifElseDataSchema,
  sendEmailDataSchema,
  sendWebhookDataSchema,
  updateContactDataSchema,
  topicDataSchema,
  triggerNodeDataSchema, // Move to end since it's very permissive
  z.object({}).passthrough(), // Allow empty data for nodes without config
]);

/**
 * Node Schema - validates React Flow nodes
 * Node types generated from centralized config
 */
const nodeSchema = z.object({
  id: z.string(),
  type: z.enum(ALL_NODE_TYPES as [string, ...string[]]),
  position: positionSchema,
  data: nodeDataSchema,
});

/**
 * Edge Schema - validates React Flow edges
 */
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

/**
 * Trigger Configuration Schema
 */
const triggerConfigSchema = z.object({
  segmentId: z.string().optional(),
  eventName: z.string().optional(),
  propertyName: z.string().optional(),
  formId: z.string().optional(),
  emailEngagementType: z.enum(["open", "click", "bounce", "spam"]).optional(),
  // Add more trigger-specific fields as needed
});

/**
 * Trigger Schema
 */
const triggerSchema = z.object({
  type: AutomationTriggerEnum,
  config: triggerConfigSchema.optional().default({}),
});

/**
 * Create Automation Request Schema
 */
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
    trigger: triggerSchema,
    nodes: z.array(nodeSchema).min(1, "At least one node is required"),
    edges: z.array(edgeSchema).default([]),
  })
  .refine(
    (data) => {
      // Validate that there's at least one trigger node
      const triggerNodes = data.nodes.filter((node) =>
        TRIGGER_NODE_IDS.includes(node.type as any)
      );
      return triggerNodes.length >= 1;
    },
    { message: "At least one trigger node is required" }
  )
  .refine(
    (data) => {
      // Validate edge connections reference existing nodes
      const nodeIds = new Set(data.nodes.map((n) => n.id));
      return data.edges.every(
        (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );
    },
    { message: "All edges must reference existing nodes" }
  )
  .refine(
    (data) => {
      // Validate percentage split nodes
      const percentageSplitNodes = data.nodes.filter(
        (node) => node.type === "percentage-split"
      );
      for (const node of percentageSplitNodes) {
        const nodeData = node.data as any;
        if (!nodeData?.splits || !Array.isArray(nodeData.splits)) {
          return false;
        }
        if (nodeData.splits.length !== 2) {
          return false;
        }
        const total = nodeData.splits.reduce(
          (sum: number, split: { percentage: number }) => sum + (split.percentage || 0),
          0
        );
        if (total !== 100) {
          return false;
        }
      }
      return true;
    },
    { message: "Percentage split nodes must have exactly 2 branches totaling 100%" }
  );

/**
 * Update Automation Request Schema
 */
export const updateAutomationSchema = createAutomationSchema.partial();

/**
 * Automation Response Schema
 */
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

/**
 * Automation List Response Schema
 */
export const automationListResponseSchema = z.object({
  object: z.literal("automation_list"),
  hasMore: z.boolean(),
  data: z.array(automationResponseSchema.omit({ object: true })),
});

/**
 * Type exports
 */
export type CreateAutomationRequest = z.infer<typeof createAutomationSchema>;
export type UpdateAutomationRequest = z.infer<typeof updateAutomationSchema>;
export type AutomationResponse = z.infer<typeof automationResponseSchema>;
export type AutomationListResponse = z.infer<
  typeof automationListResponseSchema
>;
