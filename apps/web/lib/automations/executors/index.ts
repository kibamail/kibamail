import { AUTOMATION_ACTIONS } from "@/lib/automations/config";
import type { ActionExecutor } from "./types";
import { executeSendEmail } from "./send-email";
import { executeSendWebhook } from "./send-webhook";
import { executeUpdateContact } from "./update-contact";
import { executeUnsubscribeContact } from "./unsubscribe-contact";
import { executeAddToTopic } from "./add-to-topic";
import { executeRemoveFromTopic } from "./remove-from-topic";

export type { ExecutionContext, ActionExecutor } from "./types";

/**
 * Registry mapping React Flow node type IDs to their executor functions.
 */
const executors: Record<string, ActionExecutor> = {
  [AUTOMATION_ACTIONS.SEND_EMAIL.id]: executeSendEmail,
  [AUTOMATION_ACTIONS.SEND_WEBHOOK.id]: executeSendWebhook,
  [AUTOMATION_ACTIONS.UPDATE_CONTACT.id]: executeUpdateContact,
  [AUTOMATION_ACTIONS.UNSUBSCRIBE_CONTACT.id]: executeUnsubscribeContact,
  [AUTOMATION_ACTIONS.ADD_TO_TOPIC.id]: executeAddToTopic,
  [AUTOMATION_ACTIONS.REMOVE_FROM_TOPIC.id]: executeRemoveFromTopic,
};

/**
 * Get the executor for a given node type.
 * Returns undefined for rule/trigger nodes (handled inline in execute-step).
 */
export function getExecutor(nodeType: string): ActionExecutor | undefined {
  return executors[nodeType];
}
