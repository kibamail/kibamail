import type { ContactStatus, TopicVisibility } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fakeWorkspaceId } from "./factories";

export interface TestWorkspace {
  id: string;
}

export function createTestWorkspace(): TestWorkspace {
  return {
    id: fakeWorkspaceId(),
  };
}

export async function cleanupWorkspace(workspaceId: string): Promise<void> {
  await prisma.contactTopic.deleteMany({
    where: { contact: { workspaceId } },
  });

  await prisma.contactSegment.deleteMany({
    where: { contact: { workspaceId } },
  });

  await prisma.formSubmission.deleteMany({
    where: { workspaceId },
  });

  await prisma.broadcast.deleteMany({
    where: { workspaceId },
  });

  await prisma.senderIdentity.deleteMany({
    where: { workspaceId },
  });

  await prisma.sendingDomain.deleteMany({
    where: { workspaceId },
  });

  await prisma.form.deleteMany({
    where: { workspaceId, parentId: { not: null } },
  });
  await prisma.form.deleteMany({
    where: { workspaceId },
  });

  await prisma.automationRun.deleteMany({
    where: { automation: { workspaceId } },
  });
  await prisma.automation.deleteMany({
    where: { workspaceId },
  });

  await prisma.suppressionList.deleteMany({
    where: { workspaceId },
  });

  await prisma.contact.deleteMany({
    where: { workspaceId },
  });

  await prisma.contactProperty.deleteMany({
    where: { workspaceId },
  });

  await prisma.topic.deleteMany({
    where: { workspaceId },
  });

  await prisma.segment.deleteMany({
    where: { workspaceId },
  });

  await prisma.contactImport.deleteMany({
    where: { workspaceId },
  });

  await prisma.apiKey.deleteMany({
    where: { workspaceId },
  });
}

async function _cleanupWorkspaces(workspaceIds: string[]): Promise<void> {
  await Promise.all(workspaceIds.map(cleanupWorkspace));
}

export async function createTestContacts(
  workspaceId: string,
  contacts: Array<{
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    country?: string;
    timezone?: string;
    city?: string;
    status?: ContactStatus;
  }>,
) {
  const createdContacts = await Promise.all(
    contacts.map((contact) =>
      prisma.contact.create({
        data: {
          workspaceId,
          ...contact,
        },
      }),
    ),
  );

  return createdContacts;
}

export async function createTestTopics(
  workspaceId: string,
  topics: Array<{
    name: string;
    description?: string;
    visibility?: TopicVisibility;
  }>,
) {
  const createdTopics = await Promise.all(
    topics.map((topic) =>
      prisma.topic.create({
        data: {
          workspaceId,
          ...topic,
        },
      }),
    ),
  );

  return createdTopics;
}
