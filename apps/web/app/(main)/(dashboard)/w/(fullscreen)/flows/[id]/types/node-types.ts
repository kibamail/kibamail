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

// TypeScript types derived from the const objects
type TriggerNodeTypeValue =
  (typeof TriggerNodeType)[keyof typeof TriggerNodeType];

// Helper array for iteration (used by isTriggerNodeType)
const TRIGGER_NODE_TYPES: TriggerNodeTypeValue[] =
  Object.values(TriggerNodeType);

// Type guard
export function isTriggerNodeType(type: string): type is TriggerNodeTypeValue {
  return TRIGGER_NODE_TYPES.includes(type as TriggerNodeTypeValue);
}
