import { conditionSchema } from "@/app/(main)/api/v1/segments/schema";
import {
  AUTOMATION_ACTIONS,
  AUTOMATION_RULES,
  AUTOMATION_TRIGGERS,
  getNodeConfig,
  isTriggerNode,
} from "./config";

export interface ValidationError {
  nodeId: string;
  nodeType?: string;
  nodeName?: string;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

function validateTriggerConditions(node: FlowNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const data = node.data;

  if (data.conditions) {
    const result = conditionSchema.safeParse(data.conditions);
    if (!result.success) {
      errors.push({
        nodeId: node.id,
        field: "conditions",
        message: "Invalid trigger condition configuration",
      });
    }
  }

  return errors;
}

function validateTriggerNode(node: FlowNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const data = node.data;
  const _triggerType = data.triggerType as string | undefined;

  switch (node.type) {
    case AUTOMATION_TRIGGERS.PROPERTY_UPDATED.id:
      if (!data.propertyName || typeof data.propertyName !== "string") {
        errors.push({
          nodeId: node.id,
          field: "propertyName",
          message: "Property name is required for property updated trigger",
        });
      }
      break;

    case AUTOMATION_TRIGGERS.FORM_SUBMITTED.id:
      if (!data.formId || typeof data.formId !== "string") {
        errors.push({
          nodeId: node.id,
          field: "formId",
          message: "Form selection is required for form submitted trigger",
        });
      }
      break;

    case AUTOMATION_TRIGGERS.EVENT.id:
      if (!data.eventName || typeof data.eventName !== "string") {
        errors.push({
          nodeId: node.id,
          field: "eventName",
          message: "Event name is required for custom event trigger",
        });
      }
      break;

    case AUTOMATION_TRIGGERS.SEGMENT_ENTRY.id:
    case AUTOMATION_TRIGGERS.SEGMENT_EXIT.id:
      if (!data.segmentId || typeof data.segmentId !== "string") {
        errors.push({
          nodeId: node.id,
          field: "segmentId",
          message: "Segment selection is required",
        });
      }
      break;

    case AUTOMATION_TRIGGERS.EMAIL_ENGAGEMENT.id:
      if (
        !data.emailEngagementType ||
        typeof data.emailEngagementType !== "string"
      ) {
        errors.push({
          nodeId: node.id,
          field: "emailEngagementType",
          message: "Engagement type (open, click, bounce, spam) is required",
        });
      } else if (
        !["open", "click", "bounce", "spam"].includes(
          data.emailEngagementType as string,
        )
      ) {
        errors.push({
          nodeId: node.id,
          field: "emailEngagementType",
          message: "Engagement type must be one of: open, click, bounce, spam",
        });
      }
      break;

    case AUTOMATION_TRIGGERS.CONTACT_SUBSCRIBED.id:
    case AUTOMATION_TRIGGERS.API.id:
      break;
  }

  errors.push(...validateTriggerConditions(node));

  return errors;
}

function validateActionNode(node: FlowNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const data = node.data;

  switch (node.type) {
    case AUTOMATION_ACTIONS.SEND_EMAIL.id:
      if (!data.templateId && !data.subject) {
        errors.push({
          nodeId: node.id,
          field: "templateId",
          message: "Email template or subject line is required",
        });
      }
      if (data.fromEmail && typeof data.fromEmail === "string") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.fromEmail)) {
          errors.push({
            nodeId: node.id,
            field: "fromEmail",
            message: "Invalid from email address format",
          });
        }
      }
      if (data.replyTo && typeof data.replyTo === "string") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.replyTo)) {
          errors.push({
            nodeId: node.id,
            field: "replyTo",
            message: "Invalid reply-to email address format",
          });
        }
      }
      break;

    case AUTOMATION_ACTIONS.SEND_WEBHOOK.id:
      if (!data.url || typeof data.url !== "string") {
        errors.push({
          nodeId: node.id,
          field: "url",
          message: "Webhook URL is required",
        });
      } else {
        try {
          new URL(data.url as string);
        } catch {
          errors.push({
            nodeId: node.id,
            field: "url",
            message: "Invalid webhook URL format",
          });
        }
      }
      if (data.method && typeof data.method === "string") {
        const validMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
        if (!validMethods.includes(data.method)) {
          errors.push({
            nodeId: node.id,
            field: "method",
            message: `HTTP method must be one of: ${validMethods.join(", ")}`,
          });
        }
      }
      break;

    case AUTOMATION_ACTIONS.UPDATE_CONTACT.id:
      if (!data.fieldId || typeof data.fieldId !== "string") {
        errors.push({
          nodeId: node.id,
          field: "fieldId",
          message: "Field selection is required",
        });
      }
      if (!data.fieldValue || typeof data.fieldValue !== "string") {
        errors.push({
          nodeId: node.id,
          field: "fieldValue",
          message: "Field value is required",
        });
      }
      break;

    case AUTOMATION_ACTIONS.ADD_TO_TOPIC.id:
    case AUTOMATION_ACTIONS.REMOVE_FROM_TOPIC.id:
      if (
        !data.topicIds ||
        !Array.isArray(data.topicIds) ||
        data.topicIds.length === 0
      ) {
        errors.push({
          nodeId: node.id,
          field: "topicIds",
          message: "At least one topic selection is required",
        });
      }
      break;

    case AUTOMATION_ACTIONS.UNSUBSCRIBE_CONTACT.id:
      break;
  }

  return errors;
}

function validateRuleNode(node: FlowNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const data = node.data;

  switch (node.type) {
    case AUTOMATION_RULES.IF_ELSE.id:
      if (!data.conditions) {
        errors.push({
          nodeId: node.id,
          field: "conditions",
          message: "Conditions are required for if/else branching",
        });
      } else {
        const result = conditionSchema.safeParse(data.conditions);
        if (!result.success) {
          errors.push({
            nodeId: node.id,
            field: "conditions",
            message: "Invalid condition configuration",
          });
        }
      }
      break;

    case AUTOMATION_RULES.PERCENTAGE_SPLIT.id:
      if (!data.splits || !Array.isArray(data.splits)) {
        errors.push({
          nodeId: node.id,
          field: "splits",
          message: "Split configuration is required",
        });
      } else {
        const splits = data.splits as Array<{
          id?: string;
          name?: string;
          percentage?: number;
        }>;

        if (splits.length !== 2) {
          errors.push({
            nodeId: node.id,
            field: "splits",
            message: "Percentage split must have exactly 2 branches",
          });
        }

        for (let i = 0; i < splits.length; i++) {
          const split = splits[i];
          if (!split.id) {
            errors.push({
              nodeId: node.id,
              field: `splits[${i}].id`,
              message: `Split branch ${i + 1} is missing an ID`,
            });
          }
          if (!split.name) {
            errors.push({
              nodeId: node.id,
              field: `splits[${i}].name`,
              message: `Split branch ${i + 1} is missing a name`,
            });
          }
          if (typeof split.percentage !== "number") {
            errors.push({
              nodeId: node.id,
              field: `splits[${i}].percentage`,
              message: `Split branch ${i + 1} is missing a percentage`,
            });
          } else if (split.percentage < 0 || split.percentage > 100) {
            errors.push({
              nodeId: node.id,
              field: `splits[${i}].percentage`,
              message: `Split branch ${i + 1} percentage must be between 0 and 100`,
            });
          }
        }

        const total = splits.reduce(
          (sum, split) => sum + (split.percentage || 0),
          0,
        );
        if (total !== 100) {
          errors.push({
            nodeId: node.id,
            field: "splits",
            message: `Split percentages must total 100% (currently ${total}%)`,
          });
        }
      }
      break;

    case AUTOMATION_RULES.TIME_DELAY.id:
      if (typeof data.duration !== "number") {
        errors.push({
          nodeId: node.id,
          field: "duration",
          message: "Delay duration is required",
        });
      } else if (data.duration <= 0) {
        errors.push({
          nodeId: node.id,
          field: "duration",
          message: "Delay duration must be a positive number",
        });
      }

      if (!data.unit || typeof data.unit !== "string") {
        errors.push({
          nodeId: node.id,
          field: "unit",
          message: "Delay time unit is required",
        });
      } else {
        const validUnits = ["seconds", "minutes", "hours", "days"];
        if (!validUnits.includes(data.unit as string)) {
          errors.push({
            nodeId: node.id,
            field: "unit",
            message: `Time unit must be one of: ${validUnits.join(", ")}`,
          });
        }
      }
      break;
  }

  return errors;
}

function validateFlowStructure(
  nodes: FlowNode[],
  edges: FlowEdge[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (nodes.length === 0) {
    errors.push({
      nodeId: "",
      field: "nodes",
      message: "Automation must have at least one node",
    });
    return errors;
  }

  const triggerNodes = nodes.filter((node) => isTriggerNode(node.type));

  if (triggerNodes.length === 0) {
    errors.push({
      nodeId: "",
      field: "trigger",
      message: "Automation must have a trigger node",
    });
  } else if (triggerNodes.length > 1) {
    errors.push({
      nodeId: "",
      field: "trigger",
      message: "Automation can only have one trigger node",
    });
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const nodesWithIncoming = new Set(edges.map((e) => e.target));
  const triggerNodeIds = new Set(triggerNodes.map((t) => t.id));

  for (const node of nodes) {
    if (triggerNodeIds.has(node.id)) continue;

    if (!nodesWithIncoming.has(node.id)) {
      errors.push({
        nodeId: node.id,
        field: "edges",
        message: "Node is not connected to the flow (no incoming connection)",
      });
    }
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push({
        nodeId: edge.id,
        field: "source",
        message: `Edge references non-existent source node: ${edge.source}`,
      });
    }
    if (!nodeIds.has(edge.target)) {
      errors.push({
        nodeId: edge.id,
        field: "target",
        message: `Edge references non-existent target node: ${edge.target}`,
      });
    }
  }

  return errors;
}

export function validateAutomationForPublish(
  nodes: unknown[],
  edges: unknown[],
): ValidationResult {
  const errors: ValidationError[] = [];

  const flowNodes = nodes as FlowNode[];
  const flowEdges = edges as FlowEdge[];

  const nodeMap = new Map(flowNodes.map((n) => [n.id, n]));

  errors.push(...validateFlowStructure(flowNodes, flowEdges));

  for (const node of flowNodes) {
    if (isTriggerNode(node.type)) {
      errors.push(...validateTriggerNode(node));
    } else if (
      Object.values(AUTOMATION_ACTIONS).some((a) => a.id === node.type)
    ) {
      errors.push(...validateActionNode(node));
    } else if (
      Object.values(AUTOMATION_RULES).some((r) => r.id === node.type)
    ) {
      errors.push(...validateRuleNode(node));
    } else {
      errors.push({
        nodeId: node.id,
        field: "type",
        message: `Unknown node type: ${node.type}`,
      });
    }
  }

  const enrichedErrors = errors.map((error) => {
    const node = nodeMap.get(error.nodeId);
    if (node) {
      const config = getNodeConfig(node.type);
      return {
        ...error,
        nodeType: node.type,
        nodeName: config?.name || node.type,
      };
    }
    return error;
  });

  return {
    valid: enrichedErrors.length === 0,
    errors: enrichedErrors,
  };
}
