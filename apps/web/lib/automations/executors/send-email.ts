import { createId } from "@paralleldrive/cuid2";
import { queue } from "@/lib/queue";
import { prisma } from "@/lib/db";
import type { ActionExecutor } from "./types";

export const executeSendEmail: ActionExecutor = async (ctx, nodeData) => {
  const { contact, automation, run, workspaceId } = ctx;

  // Resolve sender identity and sending domain from workspace
  const senderIdentity = await prisma.senderIdentity.findFirst({
    where: { workspaceId },
    include: { sendingDomain: true },
  });

  if (!senderIdentity || !senderIdentity.sendingDomain) {
    throw new Error("No sender identity or sending domain configured for workspace");
  }

  const templateId = nodeData.templateId as string | undefined;
  let subject = nodeData.subject as string | undefined;
  let htmlBody = "";
  let textBody: string | undefined;
  let previewText: string | undefined;

  if (templateId) {
    const emailContent = await prisma.emailContent.findUnique({
      where: { id: templateId },
    });
    if (emailContent) {
      subject = subject || emailContent.subject || undefined;
      htmlBody = emailContent.contentHtml || "";
      textBody = emailContent.contentText || undefined;
      previewText = emailContent.previewText || undefined;
    }
  }

  if (!subject) {
    throw new Error("Email subject is required (either via template or node config)");
  }

  if (!htmlBody) {
    htmlBody = `<p>${subject}</p>`;
  }

  const emailSendId = createId();

  const replyToEmail = nodeData.replyTo as string | undefined;

  await queue("emails").push("send-transactional", {
    emailSendId,
    workspaceId,
    senderIdentityId: senderIdentity.id,
    sendingDomainId: senderIdentity.sendingDomain.id,
    to: contact.email,
    subject,
    htmlBody,
    textBody,
    previewText,
    replyTo: replyToEmail ? { email: replyToEmail } : undefined,
    metadata: {
      automationId: automation.id,
      automationRunId: run.id,
    },
  });
};
