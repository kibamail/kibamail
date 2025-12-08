/**
 * Enum definitions for all flow node types.
 * Use these constants instead of hardcoded strings throughout the codebase.
 */

// Trigger node types - entry points for flows
export const TriggerNodeType = {
  FORM_FILLED: "form-filled",
  CONTACT_SUBSCRIBED: "contact-subscribed",
  CONTACT_PROPERTY_UPDATED: "contact-property-updated",
  EVENT_TRIGGERED: "event-triggered",
} as const;

// Action node types - actions that can be performed on contacts
export const ActionNodeType = {
  SEND_EMAIL: "send-email",
  SEND_WEBHOOK: "send-webhook",
  UPDATE_CONTACT: "update-contact",
  UNSUBSCRIBE_CONTACT: "unsubscribe-contact",
  ADD_TO_TOPIC: "add-to-topic",
  REMOVE_FROM_TOPIC: "remove-from-topic",
} as const;

// Rule node types - control flow and branching
export const RuleNodeType = {
  IF_ELSE: "if-else",
  PERCENTAGE_SPLIT: "percentage-split",
  TIME_DELAY: "time-delay",
} as const;

// Special node types - utility nodes
export const SpecialNodeType = {
  EMPTY: "empty",
} as const;

// Combined type for all node types
export const NodeType = {
  ...TriggerNodeType,
  ...ActionNodeType,
  ...RuleNodeType,
  ...SpecialNodeType,
} as const;

// TypeScript types derived from the const objects
export type TriggerNodeTypeValue =
  (typeof TriggerNodeType)[keyof typeof TriggerNodeType];
export type ActionNodeTypeValue =
  (typeof ActionNodeType)[keyof typeof ActionNodeType];
export type RuleNodeTypeValue = (typeof RuleNodeType)[keyof typeof RuleNodeType];
export type SpecialNodeTypeValue =
  (typeof SpecialNodeType)[keyof typeof SpecialNodeType];
export type NodeTypeValue = (typeof NodeType)[keyof typeof NodeType];

// Helper arrays for iteration and grouping
export const TRIGGER_NODE_TYPES: TriggerNodeTypeValue[] = Object.values(
  TriggerNodeType
);
export const ACTION_NODE_TYPES: ActionNodeTypeValue[] =
  Object.values(ActionNodeType);
export const RULE_NODE_TYPES: RuleNodeTypeValue[] = Object.values(RuleNodeType);
export const SPECIAL_NODE_TYPES: SpecialNodeTypeValue[] =
  Object.values(SpecialNodeType);
export const ALL_NODE_TYPES: NodeTypeValue[] = Object.values(NodeType);

// Type guards
export function isTriggerNodeType(type: string): type is TriggerNodeTypeValue {
  return TRIGGER_NODE_TYPES.includes(type as TriggerNodeTypeValue);
}

export function isActionNodeType(type: string): type is ActionNodeTypeValue {
  return ACTION_NODE_TYPES.includes(type as ActionNodeTypeValue);
}

export function isRuleNodeType(type: string): type is RuleNodeTypeValue {
  return RULE_NODE_TYPES.includes(type as RuleNodeTypeValue);
}

export function isSpecialNodeType(type: string): type is SpecialNodeTypeValue {
  return SPECIAL_NODE_TYPES.includes(type as SpecialNodeTypeValue);
}
