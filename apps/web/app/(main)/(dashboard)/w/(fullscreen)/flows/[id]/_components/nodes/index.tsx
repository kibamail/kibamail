import type { NodeTypes } from "@xyflow/react";
import {
  ActionNodeType,
  RuleNodeType,
  SpecialNodeType,
  TriggerNodeType,
} from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/types/node-types";
import {
  AddToTopicNode,
  RemoveFromTopicNode,
  SendEmailNode,
  SendWebhookNode,
  UnsubscribeContactNode,
  UpdateContactNode,
} from "./action-nodes";
import { EmptyNode } from "./empty-node";
import { IfElseNode, PercentageSplitNode, TimeDelayNode } from "./rule-nodes";
import {
  ContactPropertyUpdatedNode,
  ContactSubscribedNode,
  EventTriggeredNode,
  FormFilledNode,
} from "./trigger-nodes";

export const nodeTypes: NodeTypes = {
  // Trigger nodes
  [TriggerNodeType.FORM_FILLED]: FormFilledNode,
  [TriggerNodeType.CONTACT_SUBSCRIBED]: ContactSubscribedNode,
  [TriggerNodeType.CONTACT_PROPERTY_UPDATED]: ContactPropertyUpdatedNode,
  [TriggerNodeType.EVENT_TRIGGERED]: EventTriggeredNode,

  // Action nodes
  [ActionNodeType.SEND_EMAIL]: SendEmailNode,
  [ActionNodeType.SEND_WEBHOOK]: SendWebhookNode,
  [ActionNodeType.UPDATE_CONTACT]: UpdateContactNode,
  [ActionNodeType.UNSUBSCRIBE_CONTACT]: UnsubscribeContactNode,
  [ActionNodeType.ADD_TO_TOPIC]: AddToTopicNode,
  [ActionNodeType.REMOVE_FROM_TOPIC]: RemoveFromTopicNode,

  // Rule nodes
  [RuleNodeType.IF_ELSE]: IfElseNode,
  [RuleNodeType.PERCENTAGE_SPLIT]: PercentageSplitNode,
  [RuleNodeType.TIME_DELAY]: TimeDelayNode,

  // Special nodes
  [SpecialNodeType.EMPTY]: EmptyNode,
};
