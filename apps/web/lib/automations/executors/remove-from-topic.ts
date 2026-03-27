import { prisma } from "@/lib/db";
import { dispatchWebhook } from "@/webhooks/dispatch";
import type { ActionExecutor } from "./types";

export const executeRemoveFromTopic: ActionExecutor = async (ctx, nodeData) => {
  const topicIds = nodeData.topicIds as string[];

  await prisma.contactTopic.updateMany({
    where: {
      contactId: ctx.contact.id,
      topicId: { in: topicIds },
    },
    data: { status: "UNSUBSCRIBED" },
  });

  for (const topicId of topicIds) {
    await dispatchWebhook(ctx.workspaceId, "contact.topic_unsubscribed", {
      contactId: ctx.contact.id,
      topicId,
      method: "api",
    });
  }
};
