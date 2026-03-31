import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import type { ActionExecutor } from "./types";

export const executeSendEmail: ActionExecutor = async (ctx, nodeData) => {
  const { contact, automation, run, workspaceId } = ctx;

  const templateId = nodeData.templateId as string;

  const email = await prisma.email.findUnique({
    where: { id: templateId },
  });

  if (!email) {
    throw new Error(`Email template ${templateId} not found`);
  }

  // Resolve sender identity: prefer email's own, fall back to workspace default
  let senderIdentityId = email.senderIdentityId;
  let sendingDomainId: string | undefined;

  if (senderIdentityId) {
    const identity = await prisma.senderIdentity.findUnique({
      where: { id: senderIdentityId },
      include: { sendingDomain: true },
    });
    if (identity?.sendingDomain) {
      sendingDomainId = identity.sendingDomain.id;
    }
  }

  if (!senderIdentityId || !sendingDomainId) {
    const fallback = await prisma.senderIdentity.findFirst({
      where: { workspaceId },
      include: { sendingDomain: true },
    });
    if (!fallback || !fallback.sendingDomain) {
      throw new Error(
        "No sender identity or sending domain configured for workspace",
      );
    }
    senderIdentityId = fallback.id;
    sendingDomainId = fallback.sendingDomain.id;
  }

  // Resolve reply-to from email's identity
  let replyToEmail: string | undefined;
  if (email.replyToIdentityId) {
    const replyToIdentity = await prisma.senderIdentity.findUnique({
      where: { id: email.replyToIdentityId },
    });
    if (replyToIdentity) {
      replyToEmail = replyToIdentity.email;
    }
  }

  const emailSendId = createId();

  await queue("emails").push("send-transactional", {
    emailSendId,
    workspaceId,
    senderIdentityId,
    sendingDomainId,
    to: contact.email,
    subject: email.subject as string,
    htmlBody: email.htmlContent as string,
    textBody: email.textContent || undefined,
    previewText: email.previewText || undefined,
    replyTo: replyToEmail ? { email: replyToEmail } : undefined,
    metadata: {
      automationId: automation.id,
      automationRunId: run.id,
    },
  });
};
