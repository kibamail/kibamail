/**
 * Automation Configuration
 *
 * Central source of truth for all automation types, triggers, actions, and rules.
 * Used across frontend (React Flow), backend (API handlers), and validation (Zod schemas).
 */

/**
 * Trigger Types
 * Events that initiate an automation workflow
 */
export const AUTOMATION_TRIGGERS = {
  CONTACT_SUBSCRIBED: {
    id: "contact-subscribed",
    type: "CONTACT_SUBSCRIBED",
    name: "Contact Subscribed",
    description: "Triggered when a contact subscribes to a topic",
    icon: "user-plus",
    category: "contact",
  },
  PROPERTY_UPDATED: {
    id: "contact-property-updated",
    type: "PROPERTY_UPDATED",
    name: "Contact Property Updated",
    description: "Triggered when a contact's property changes",
    icon: "edit",
    category: "contact",
  },
  FORM_SUBMITTED: {
    id: "form-filled",
    type: "FORM_SUBMITTED",
    name: "Form Submitted",
    description: "Triggered when a form is submitted",
    icon: "file-text",
    category: "engagement",
  },
  API: {
    id: "webhook-trigger",
    type: "API",
    name: "API/Webhook",
    description: "Triggered via API call or webhook",
    icon: "webhook",
    category: "integration",
  },
  EVENT: {
    id: "event",
    type: "EVENT",
    name: "Custom Event",
    description: "Triggered when a custom event occurs",
    icon: "zap",
    category: "engagement",
  },
  SEGMENT_ENTRY: {
    id: "segment-entry",
    type: "SEGMENT_ENTRY",
    name: "Segment Entry",
    description: "Triggered when a contact enters a segment",
    icon: "users",
    category: "segment",
  },
  SEGMENT_EXIT: {
    id: "segment-exit",
    type: "SEGMENT_EXIT",
    name: "Segment Exit",
    description: "Triggered when a contact exits a segment",
    icon: "user-minus",
    category: "segment",
  },
  EMAIL_ENGAGEMENT: {
    id: "email-engagement",
    type: "EMAIL_ENGAGEMENT",
    name: "Email Engagement",
    description: "Triggered by email opens, clicks, or other engagement",
    icon: "mail",
    category: "email",
  },
} as const;

/**
 * Action Types
 * Operations that can be performed on contacts or systems
 */
export const AUTOMATION_ACTIONS = {
  SEND_EMAIL: {
    id: "send-email",
    name: "Send Email",
    description: "Send an email to the contact",
    icon: "mail",
    category: "communication",
    config: {
      templateId: { type: "string", optional: true },
      subject: { type: "string", optional: true },
      fromName: { type: "string", optional: true },
      fromEmail: { type: "email", optional: true },
      replyTo: { type: "email", optional: true },
    },
  },
  SEND_WEBHOOK: {
    id: "send-webhook",
    name: "Send Webhook",
    description: "Send data to an external webhook URL",
    icon: "send",
    category: "integration",
    config: {
      url: { type: "url", required: true },
      method: {
        type: "enum",
        options: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        default: "POST",
      },
      headers: { type: "record", optional: true },
      body: { type: "string", optional: true },
    },
  },
  UPDATE_CONTACT: {
    id: "update-contact",
    name: "Update Contact",
    description: "Update contact properties",
    icon: "edit",
    category: "contact",
    config: {
      properties: { type: "record", required: true },
    },
  },
  UNSUBSCRIBE_CONTACT: {
    id: "unsubscribe-contact",
    name: "Unsubscribe Contact",
    description: "Unsubscribe the contact",
    icon: "user-x",
    category: "contact",
    config: {},
  },
  ADD_TO_TOPIC: {
    id: "add-to-topic",
    name: "Add to Topic",
    description: "Subscribe contact to a topic",
    icon: "folder-plus",
    category: "topic",
    config: {
      topicId: { type: "string", required: true },
    },
  },
  REMOVE_FROM_TOPIC: {
    id: "remove-from-topic",
    name: "Remove from Topic",
    description: "Unsubscribe contact from a topic",
    icon: "folder-minus",
    category: "topic",
    config: {
      topicId: { type: "string", required: true },
    },
  },
} as const;

/**
 * Rule Types
 * Control flow and decision-making nodes
 */
export const AUTOMATION_RULES = {
  IF_ELSE: {
    id: "if-else",
    name: "If/Else Condition",
    description: "Branch based on contact properties or segment membership",
    icon: "git-branch",
    category: "logic",
    config: {
      conditions: { type: "condition", required: true },
    },
  },
  PERCENTAGE_SPLIT: {
    id: "percentage-split",
    name: "A/B Split",
    description: "Randomly split contacts into multiple paths",
    icon: "split",
    category: "logic",
    config: {
      splits: {
        type: "array",
        required: true,
        items: {
          id: { type: "string", required: true },
          name: { type: "string", required: true },
          percentage: { type: "number", min: 0, max: 100, required: true },
        },
        validation: {
          length: 2,
          totalPercentage: 100,
        },
      },
    },
  },
  TIME_DELAY: {
    id: "time-delay",
    name: "Time Delay",
    description: "Wait for a specified amount of time",
    icon: "clock",
    category: "timing",
    config: {
      duration: { type: "number", min: 1, required: true },
      unit: {
        type: "enum",
        options: ["seconds", "minutes", "hours", "days"],
        required: true,
      },
    },
  },
} as const;

/**
 * Helper to get all trigger IDs for React Flow node types
 */
const TRIGGER_NODE_IDS = Object.values(AUTOMATION_TRIGGERS).map((t) => t.id);

/**
 * Helper to get all action IDs for React Flow node types
 */
const ACTION_NODE_IDS = Object.values(AUTOMATION_ACTIONS).map((a) => a.id);

/**
 * Helper to get all rule IDs for React Flow node types
 */
const RULE_NODE_IDS = Object.values(AUTOMATION_RULES).map((r) => r.id);

/**
 * All valid node types for React Flow
 */
export const ALL_NODE_TYPES = [
  ...TRIGGER_NODE_IDS,
  ...ACTION_NODE_IDS,
  ...RULE_NODE_IDS,
] as const;

/**
 * Trigger types for Prisma enum
 */
export const TRIGGER_TYPES = Object.values(AUTOMATION_TRIGGERS).map(
  (t) => t.type,
);

/**
 * Type exports
 */
export type TriggerNodeId = (typeof TRIGGER_NODE_IDS)[number];
export type ActionNodeId = (typeof ACTION_NODE_IDS)[number];
export type RuleNodeId = (typeof RULE_NODE_IDS)[number];
type NodeType = (typeof ALL_NODE_TYPES)[number];
type TriggerType = (typeof TRIGGER_TYPES)[number];

/**
 * Helper to get trigger config by type
 */
function getTriggerByType(type: string) {
  return Object.values(AUTOMATION_TRIGGERS).find((t) => t.type === type);
}

/**
 * Helper to get trigger config by node ID
 */
function getTriggerByNodeId(id: string) {
  return Object.values(AUTOMATION_TRIGGERS).find((t) => t.id === id);
}

/**
 * Helper to get action config by node ID
 */
function getActionByNodeId(id: string) {
  return Object.values(AUTOMATION_ACTIONS).find((a) => a.id === id);
}

/**
 * Helper to get rule config by node ID
 */
function getRuleByNodeId(id: string) {
  return Object.values(AUTOMATION_RULES).find((r) => r.id === id);
}

/**
 * Helper to get any node config by ID
 */
export function getNodeConfig(id: string) {
  return getTriggerByNodeId(id) || getActionByNodeId(id) || getRuleByNodeId(id);
}

/**
 * Helper to check if a node ID is a trigger
 */
export function isTriggerNode(id: string): boolean {
  return TRIGGER_NODE_IDS.includes(id as TriggerNodeId);
}

/**
 * Helper to check if a node ID is an action
 */
function isActionNode(id: string): boolean {
  return ACTION_NODE_IDS.includes(id as ActionNodeId);
}

/**
 * Helper to check if a node ID is a rule
 */
function isRuleNode(id: string): boolean {
  return RULE_NODE_IDS.includes(id as RuleNodeId);
}
