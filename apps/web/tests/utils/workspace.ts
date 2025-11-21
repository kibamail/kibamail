/**
 * Workspace Test Utilities
 *
 * Helper functions for managing test workspaces and cleanup.
 */

import { prisma } from "@/lib/db";
import { fakeWorkspaceId } from "./factories";
import type { ContactStatus, TopicVisibility } from "@prisma/client";

/**
 * Test workspace data
 */
export interface TestWorkspace {
  id: string;
}

/**
 * Create a test workspace
 *
 * @returns Test workspace data
 */
export function createTestWorkspace(): TestWorkspace {
  return {
    id: fakeWorkspaceId(),
  };
}

/**
 * Clean up all test data for a workspace
 *
 * Deletes all data associated with a workspace in the correct order
 * to handle foreign key constraints.
 *
 * @param workspaceId - Workspace ID to clean up
 */
export async function cleanupWorkspace(workspaceId: string): Promise<void> {
  // Delete in order to handle foreign key constraints

  // 1. Delete junction table records first
  await prisma.contactTopic.deleteMany({
    where: { contact: { workspaceId } },
  });

  await prisma.contactSegment.deleteMany({
    where: { contact: { workspaceId } },
  });

  // 2. Delete suppression list entries
  await prisma.suppressionList.deleteMany({
    where: { workspaceId },
  });

  // 3. Delete main entities
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

  // 4. Delete API keys last
  await prisma.apiKey.deleteMany({
    where: { workspaceId },
  });
}

/**
 * Clean up multiple workspaces
 *
 * @param workspaceIds - Array of workspace IDs to clean up
 */
export async function cleanupWorkspaces(workspaceIds: string[]): Promise<void> {
  await Promise.all(workspaceIds.map(cleanupWorkspace));
}

/**
 * Create test contacts in a workspace
 *
 * @param workspaceId - Workspace ID
 * @param contacts - Array of contact data
 * @returns Created contacts with IDs
 */
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
  }>
) {
  const createdContacts = await Promise.all(
    contacts.map(contact =>
      prisma.contact.create({
        data: {
          workspaceId,
          ...contact,
        },
      })
    )
  );

  return createdContacts;
}


/**
 * Create test topics in a workspace
 *
 * @param workspaceId - Workspace ID
 * @param topics - Array of topic data
 * @returns Created topics with IDs
 */
export async function createTestTopics(
  workspaceId: string,
  topics: Array<{
    name: string;
    description?: string;
    visibility?: TopicVisibility;
  }>
) {
  const createdTopics = await Promise.all(
    topics.map(topic =>
      prisma.topic.create({
        data: {
          workspaceId,
          ...topic,
        },
      })
    )
  );

  return createdTopics;
}
