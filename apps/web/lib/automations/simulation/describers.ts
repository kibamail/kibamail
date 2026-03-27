import type { Automation, Contact } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AUTOMATION_ACTIONS } from "../config";
import type { FlowNode } from "../graph";

export function describeTrigger(automation: Automation, node: FlowNode): string {
  const config = automation.triggerConfig as Record<string, unknown> | null;

  switch (automation.triggerType) {
    case 'CONTACT_SUBSCRIBED':
      return "Triggered when contact subscribes";
    case "PROPERTY_UPDATED":
      return `Triggered when property '${config?.propertyName ?? "unknown"}' changes`;
    case "FORM_SUBMITTED":
      return `Triggered when form '${config?.formId ?? "unknown"}' is submitted`;
    case "API":
      return "Triggered via API call";
    case "EVENT":
      return `Triggered by event '${config?.eventName ?? node.data.eventName ?? "unknown"}'`;
    case "SEGMENT_ENTRY":
      return `Triggered when contact enters segment '${config?.segmentId ?? "unknown"}'`;
    case "SEGMENT_EXIT":
      return `Triggered when contact exits segment '${config?.segmentId ?? "unknown"}'`;
    case "EMAIL_ENGAGEMENT":
      return `Triggered on email ${config?.emailEngagementType ?? "engagement"}`;
    default:
      return "Triggered";
  }
}

export function describeCondition(node: FlowNode, branch: string): string {
  const conditions = node.data.conditions as Record<string, unknown> | undefined;
  if (!conditions) return `No conditions defined → ${branch}`;

  if ("field" in conditions && "operator" in conditions && "value" in conditions) {
    return `Condition: ${conditions.field} ${conditions.operator} ${JSON.stringify(conditions.value)} → ${branch}`;
  }

  return `Condition evaluated → ${branch}`;
}

export function describeActionType(nodeType: string): string {
  const map: Record<string, string> = {
    [AUTOMATION_ACTIONS.SEND_EMAIL.id]: "would_send_email",
    [AUTOMATION_ACTIONS.SEND_WEBHOOK.id]: "would_send_webhook",
    [AUTOMATION_ACTIONS.UPDATE_CONTACT.id]: "would_update_contact",
    [AUTOMATION_ACTIONS.UNSUBSCRIBE_CONTACT.id]: "would_unsubscribe",
    [AUTOMATION_ACTIONS.ADD_TO_TOPIC.id]: "would_add_to_topic",
    [AUTOMATION_ACTIONS.REMOVE_FROM_TOPIC.id]: "would_remove_from_topic",
  };
  return map[nodeType] ?? "would_execute";
}

export async function describeAction(
  node: FlowNode,
  contact: Contact,
  workspaceId: string,
): Promise<string> {
  const data = node.data;

  switch (node.type) {
    case AUTOMATION_ACTIONS.SEND_EMAIL.id: {
      const subject = (data.subject as string) || (data.templateId ? `template '${data.templateId}'` : "no subject");
      return `Would send email with subject '${subject}' to ${contact.email}`;
    }
    case AUTOMATION_ACTIONS.SEND_WEBHOOK.id:
      return `Would ${(data.method as string) || "POST"} to ${data.url as string}`;
    case AUTOMATION_ACTIONS.UPDATE_CONTACT.id:
      return `Would set '${data.fieldId as string}' to '${data.fieldValue as string}'`;
    case AUTOMATION_ACTIONS.UNSUBSCRIBE_CONTACT.id:
      return `Would unsubscribe ${contact.email}`;
    case AUTOMATION_ACTIONS.ADD_TO_TOPIC.id:
      return resolveTopicDescription("subscribe", data.topicIds as string[], workspaceId);
    case AUTOMATION_ACTIONS.REMOVE_FROM_TOPIC.id:
      return resolveTopicDescription("unsubscribe", data.topicIds as string[], workspaceId);
    default:
      return `Would execute '${node.type}'`;
  }
}

async function resolveTopicDescription(
  verb: "subscribe" | "unsubscribe",
  topicIds: string[],
  workspaceId: string,
): Promise<string> {
  const topics = await prisma.topic.findMany({
    where: { id: { in: topicIds }, workspaceId },
    select: { name: true },
  });
  const names = topics.map((t: { name: string }) => t.name).join(", ");
  const label = names || topicIds.join(", ");
  const plural = topics.length > 1 ? "s" : "";

  return verb === "subscribe"
    ? `Would subscribe contact to topic${plural} '${label}'`
    : `Would unsubscribe contact from topic${plural} '${label}'`;
}
