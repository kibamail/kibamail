/**
 * Automation Event Dispatch
 *
 * Queues automation trigger evaluation as a BullMQ job. Called alongside
 * (not instead of) dispatchWebhook() at each event source.
 */

import { queue } from "@/lib/queue";
import type { AutomationEventPayloads, AutomationEventType, AutomationEvent } from "./events";

/**
 * Dispatch an automation event for trigger evaluation.
 *
 * This queues an evaluate-triggers job that will find matching published
 * automations and create runs for qualifying contacts.
 */
export async function dispatchAutomationEvent<T extends AutomationEventType>(
  workspaceId: string,
  type: T,
  payload: AutomationEventPayloads[T],
): Promise<void> {
  await queue("automations").push("evaluate-triggers", {
    workspaceId,
    event: { type, payload } as AutomationEvent,
  });
}
