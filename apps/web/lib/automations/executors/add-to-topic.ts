import { prisma } from "@/lib/db";
import { dispatchWebhook } from "@/webhooks/dispatch";
import type { ActionExecutor } from "./types";

export const executeAddToTopic: ActionExecutor = async (ctx, nodeData) => {
  const topicIds = nodeData.topicIds as string[];

  await prisma.contactTopic.createMany({
    data: topicIds.map((topicId) => ({
      contactId: ctx.contact.id,
      topicId,
      status: "SUBSCRIBED" as const,
    })),
    skipDuplicates: true,
  });

  for (const topicId of topicIds) {
    await dispatchWebhook(ctx.workspaceId, "contact.topic_subscribed", {
      contactId: ctx.contact.id,
      topicId,
    });
  }
};
