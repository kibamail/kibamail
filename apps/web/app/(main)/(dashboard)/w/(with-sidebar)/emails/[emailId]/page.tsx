import { Heading, LetterAvatar, Text } from "@kibamail/owly";
import { EditPencil, Notes, AtSignCircle, WarningCircle } from "iconoir-react";
import { html as beautifyHtml } from "js-beautify";
import Link from "next/link";
import { notFound } from "next/navigation";
import { codeToHtml } from "shiki";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { downloadPrivateFile } from "@/lib/storage";
import { EmailContentViewer } from "../_components/email-content-viewer";
import { EmailEventTimeline } from "../_components/email-event-timeline";
import { EmailStatusBadge } from "../_components/email-status-badge";

async function getEmailWithEvents(workspaceId: string, emailId: string) {
  const email = await prisma.transactionalEmail.findFirst({
    where: {
      id: emailId,
      workspaceId,
    },
  });

  if (!email) {
    return null;
  }

  const events = await prisma.event.findMany({
    where: {
      sendingId: email.sendingId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      type: true,
      createdAt: true,
    },
  });

  return { email, events };
}

interface EmailContent {
  html: string | null;
  text: string | null;
  highlightedHtml: string | null;
  highlightedText: string | null;
}

async function downloadS3Content(s3Key: string | null): Promise<string | null> {
  if (!s3Key) return null;

  try {
    const file = await downloadPrivateFile(s3Key);
    const contentString = await file.body?.transformToString();
    return contentString || null;
  } catch {
    return null;
  }
}

async function formatAndHighlight(
  content: string | null,
  lang: "html" | "text"
): Promise<string | null> {
  if (!content) return null;

  const formatted =
    lang === "html"
      ? beautifyHtml(content, {
          indent_size: 2,
          wrap_line_length: 80,
          preserve_newlines: true,
          max_preserve_newlines: 2,
        })
      : content;

  const highlighted = await codeToHtml(formatted, {
    lang,
    theme: "github-dark",
  });

  return highlighted;
}

async function getEmailContent(
  htmlS3Key: string | null,
  textS3Key: string | null
): Promise<EmailContent> {
  const [html, text] = await Promise.all([
    downloadS3Content(htmlS3Key),
    downloadS3Content(textS3Key),
  ]);

  const [highlightedHtml, highlightedText] = await Promise.all([
    formatAndHighlight(html, "html"),
    formatAndHighlight(text, "text"),
  ]);

  return { html, text, highlightedHtml, highlightedText };
}

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ emailId: string }>;
}) {
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const { emailId } = await params;

  const result = await getEmailWithEvents(
    session.currentOrganization.id,
    emailId
  );

  if (!result) {
    notFound();
  }

  const { email, events } = result;
  const emailContent = await getEmailContent(
    email.htmlContentS3Key,
    email.textContentS3Key
  );

  // Get the latest event type for status display (matches table view)
  const latestEventType = events.length > 0 ? events[events.length - 1].type : null;

  return (
    <div className="flex flex-col">
      <div className="pb-5 border-b border-kb-border-tertiary">
        <div className="mb-2 flex gap-2 items-center">
          <Link href="/w/emails">
            <Text variant="tertiary" className="underline">
              Emails
            </Text>
          </Link>
          <span className="text-sm text-kb-content-tertiary">/</span>
          <Text variant="tertiary">{email?.toEmail}</Text>
        </div>
        <Heading variant="display" size="xs">
          {email?.toEmail}
        </Heading>
      </div>

      <div className="flex flex-col gap-4 pt-4">
        <div className="grid grid-cols-12 py-1">
          <div className="col-span-2 flex items-center gap-2">
            <EditPencil className="w-4 h-4 text-kb-content-tertiary" />
            <Text variant="tertiary">Subject</Text>
          </div>

          <div className="col-span-10">
            <Text>{email.subject || "-"}</Text>
          </div>
        </div>

        <div className="grid grid-cols-12 py-1">
          <div className="col-span-2 flex items-center gap-2">
            <Notes className="w-4 h-4 text-kb-content-tertiary" />
            <Text variant="tertiary">Preview text</Text>
          </div>

          <div className="col-span-10">
            <Text>{email.previewText || "-"}</Text>
          </div>
        </div>

        <div className="grid grid-cols-12 py-1">
          <div className="col-span-2 flex items-center gap-2">
            <AtSignCircle className="w-4 h-4 text-kb-content-tertiary" />
            <Text variant="tertiary">Sender</Text>
          </div>

          <div className="col-span-10 flex items-center gap-2">
            <LetterAvatar size="xs">
              {email?.fromName || email?.fromEmail}
            </LetterAvatar>
            <Text>{email?.fromName}</Text>
            <Text>{email?.fromEmail}</Text>
          </div>
        </div>

        <div className="grid grid-cols-12 py-1">
          <div className="col-span-2 flex items-center gap-2">
            <AtSignCircle className="w-4 h-4 text-kb-content-tertiary" />
            <Text variant="tertiary">Reply to</Text>
          </div>

          <div className="col-span-10 flex items-center gap-2">
            <LetterAvatar size="xs">
              {email?.replyToName || email?.replyToEmail}
            </LetterAvatar>
            <Text>{email?.replyToName}</Text>
            <Text>{email?.replyToEmail}</Text>
          </div>
        </div>

        <div className="grid grid-cols-12 py-1">
          <div className="col-span-2 flex items-center gap-2">
            <WarningCircle className="w-5 h-5 text-kb-content-tertiary" />
            <Text variant="tertiary">Status</Text>
          </div>

          <div className="col-span-10"><EmailStatusBadge eventType={latestEventType} /></div>
        </div>
      </div>

      <EmailEventTimeline events={events} />

      <div className="mt-10">
        <EmailContentViewer
          htmlContent={emailContent.html}
          textContent={emailContent.text}
          highlightedHtml={emailContent.highlightedHtml}
          highlightedText={emailContent.highlightedText}
        />
      </div>
    </div>
  );
}
