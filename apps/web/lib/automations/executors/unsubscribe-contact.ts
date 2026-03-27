import { prisma } from "@/lib/db";
import { dispatchWebhook } from "@/webhooks/dispatch";
import type { ActionExecutor } from "./types";

export const executeUnsubscribeContact: ActionExecutor = async (ctx) => {
  if (ctx.contact.status === "UNSUBSCRIBED") return;

  await prisma.contact.update({
    where: { id: ctx.contact.id },
    data: {
      status: "UNSUBSCRIBED",
      unsubscribedAt: new Date(),
    },
  });

  await dispatchWebhook(ctx.workspaceId, "contact.unsubscribed", {
    contactId: ctx.contact.id,
    method: "api",
    reason: `Automation: ${ctx.automation.name}`,
  });
};
