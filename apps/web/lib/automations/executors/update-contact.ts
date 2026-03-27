import { prisma } from "@/lib/db";
import { dispatchWebhook } from "@/webhooks/dispatch";
import type { ActionExecutor } from "./types";

const BUILT_IN_FIELDS = new Set([
  "email",
  "firstName",
  "lastName",
  "phone",
  "country",
  "timezone",
  "city",
]);

export const executeUpdateContact: ActionExecutor = async (ctx, nodeData) => {
  const fieldId = nodeData.fieldId as string;
  const fieldValue = nodeData.fieldValue as string;

  let updateField = fieldId;

  // If not a built-in field, resolve via contact property slot
  if (!BUILT_IN_FIELDS.has(fieldId)) {
    const property = await prisma.contactProperty.findFirst({
      where: { workspaceId: ctx.workspaceId, name: fieldId },
      select: { slot: true },
    });
    if (property) {
      updateField = property.slot;
    }
  }

  const previousValue = (ctx.contact as Record<string, unknown>)[updateField];

  await prisma.contact.update({
    where: { id: ctx.contact.id },
    data: { [updateField]: fieldValue },
  });

  await dispatchWebhook(ctx.workspaceId, "contact.updated", {
    contactId: ctx.contact.id,
    previousValues: { [fieldId]: previousValue ?? null },
    changedFields: [fieldId],
  });
};
