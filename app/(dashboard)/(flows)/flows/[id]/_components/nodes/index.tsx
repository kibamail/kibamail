import type { NodeTypes } from "@xyflow/react";
import {
  AddToTopicNode,
  RemoveFromTopicNode,
  SendEmailNode,
  SendWebhookNode,
  UnsubscribeContactNode,
  UpdateContactNode,
} from "./action-nodes";
import { IfElseNode, PercentageSplitNode, TimeDelayNode } from "./rule-nodes";
import {
  ContactPropertyUpdatedNode,
  ContactSubscribedNode,
  FormFilledNode,
  WebhookTriggerNode,
} from "./trigger-nodes";

export const nodeTypes: NodeTypes = {
  // Trigger nodes
  "form-filled": FormFilledNode,
  "contact-subscribed": ContactSubscribedNode,
  "contact-property-updated": ContactPropertyUpdatedNode,
  "webhook-trigger": WebhookTriggerNode,

  // Action nodes
  "send-email": SendEmailNode,
  "send-webhook": SendWebhookNode,
  "update-contact": UpdateContactNode,
  "unsubscribe-contact": UnsubscribeContactNode,
  "add-to-topic": AddToTopicNode,
  "remove-from-topic": RemoveFromTopicNode,

  // Rule nodes
  "if-else": IfElseNode,
  "percentage-split": PercentageSplitNode,
  "time-delay": TimeDelayNode,
};

// Export individual components for direct use if needed
export {
  AddToTopicNode,
  ContactPropertyUpdatedNode,
  ContactSubscribedNode,
  FormFilledNode,
  IfElseNode,
  PercentageSplitNode,
  RemoveFromTopicNode,
  SendEmailNode,
  SendWebhookNode,
  TimeDelayNode,
  UnsubscribeContactNode,
  UpdateContactNode,
  WebhookTriggerNode,
};
