import type { EmailTemplateStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { TemplateEditorAdapter } from "@/components/email-editor";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";

export interface TemplateVersion {
  id: string;
  version: number;
  status: EmailTemplateStatus;
  publishedAt: Date | null;
  createdAt: Date;
}

interface TemplateWithVersions {
  id: string;
  name: string;
  description: string | null;
  status: EmailTemplateStatus;
  version: number;
  parentId: string | null;
  publishedVersionId: string | null;
  rootTemplateId: string;
  versions: TemplateVersion[];
  isLiveVersion: boolean;
  emailContent: {
    contentJson: Record<string, unknown> | null;
    styles: Record<string, unknown> | null;
    subject: string | null;
    previewText: string | null;
  } | null;
  senderIdentityId: string | null;
  replyToIdentityId: string | null;
  trackClicks: boolean | null;
  trackOpens: boolean | null;
}

async function getTemplateWithVersions(
  workspaceId: string,
  templateId: string,
): Promise<TemplateWithVersions | null> {
  const template = await prisma.emailTemplate.findFirst({
    where: { id: templateId, workspaceId },
    include: { emailContent: true },
  });

  if (!template) {
    return null;
  }

  const rootTemplateId = template.parentId ?? template.id;

  const rootTemplate = template.parentId
    ? await prisma.emailTemplate.findFirst({
        where: { id: template.parentId, workspaceId },
        select: { publishedVersionId: true },
      })
    : template;

  const allVersions = await prisma.emailTemplate.findMany({
    where: {
      workspaceId,
      OR: [{ id: rootTemplateId }, { parentId: rootTemplateId }],
    },
    select: {
      id: true,
      version: true,
      status: true,
      publishedAt: true,
      createdAt: true,
    },
    orderBy: { version: "desc" },
  });

  const isLiveVersion = rootTemplate?.publishedVersionId === template.id;

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    status: template.status,
    version: template.version,
    parentId: template.parentId,
    publishedVersionId: template.publishedVersionId,
    rootTemplateId,
    versions: allVersions,
    isLiveVersion,
    emailContent: template.emailContent
      ? {
          contentJson: template.emailContent.contentJson as Record<
            string,
            unknown
          > | null,
          styles: template.emailContent.styles as Record<
            string,
            unknown
          > | null,
          subject: template.emailContent.subject,
          previewText: template.emailContent.previewText,
        }
      : null,
    senderIdentityId: template.senderIdentityId,
    replyToIdentityId: template.replyToIdentityId,
    trackClicks: template.trackClicks,
    trackOpens: template.trackOpens,
  };
}

async function getSenderIdentities(workspaceId: string) {
  const identities = await prisma.senderIdentity.findMany({
    where: { workspaceId },
    include: {
      sendingDomain: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return identities.map((identity) => ({
    id: identity.id,
    name: identity.name,
    email: `${identity.email}@${identity.sendingDomain.name}`,
    localPart: identity.email,
    domain: identity.sendingDomain.name,
    domainId: identity.sendingDomain.id,
    verified: identity.emailVerifiedAt !== null,
  }));
}

async function getDomains(workspaceId: string) {
  return prisma.sendingDomain.findMany({
    where: { workspaceId },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });
}

export default async function TemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const workspaceId = session.currentOrganization.id;

  const [template, senderIdentities, domains] = await Promise.all([
    getTemplateWithVersions(workspaceId, id),
    getSenderIdentities(workspaceId),
    getDomains(workspaceId),
  ]);

  if (!template) {
    notFound();
  }

  return (
    <TemplateEditorAdapter
      templateId={template.id}
      templateName={template.name}
      templateDescription={template.description}
      status={template.status}
      version={template.version}
      rootTemplateId={template.rootTemplateId}
      versions={template.versions}
      isLiveVersion={template.isLiveVersion}
      initialContent={template.emailContent?.contentJson ?? undefined}
      initialStyles={template.emailContent?.styles ?? undefined}
      initialSubject={template.emailContent?.subject ?? ""}
      initialPreviewText={template.emailContent?.previewText ?? ""}
      initialSenderIdentityId={template.senderIdentityId ?? undefined}
      initialReplyToIdentityId={template.replyToIdentityId ?? undefined}
      initialTrackClicks={template.trackClicks ?? undefined}
      initialTrackOpens={template.trackOpens ?? undefined}
      senderIdentities={senderIdentities}
      domains={domains}
    />
  );
}
