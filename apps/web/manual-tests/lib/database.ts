/**
 * Database Utilities for Manual Tests
 *
 * Provides functions to create test data directly in the development database.
 * Uses Prisma client for all database operations.
 */

import { createHash, randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreatedDomain {
  id: string;
  name: string;
  workspaceId: string;
  senderIdentityId: string;
  fullFromAddress: string;
}

export interface CreatedApiKey {
  id: string;
  key: string;
  workspaceId: string;
}

export interface CreatedContact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

/**
 * Generate a unique domain name for testing.
 */
function generateDomainName(): string {
  const random = randomBytes(4).toString("hex");
  return `manual-test-${random}.example.com`;
}

/**
 * Generate an API key with proper format.
 */
function generateApiKey(): { key: string; hash: string; preview: string } {
  const random = randomBytes(24).toString("hex");
  const key = `kb_${random}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const preview = `kb_${random.substring(0, 8)}...`;
  return { key, hash, preview };
}

/**
 * Create a fully verified sending domain with sender identity.
 *
 * The domain is marked as verified so it can be used immediately for sending.
 */
export async function createVerifiedDomain(
  workspaceId: string
): Promise<CreatedDomain> {
  const domainName = generateDomainName();
  const now = new Date();

  const domain = await prisma.sendingDomain.create({
    data: {
      workspaceId,
      name: domainName,
      dkimSubDomain: "kiba",
      dkimPublicKey: `manual-test-public-key-${randomBytes(16).toString("hex")}`,
      dkimPrivateKey: `manual-test-private-key-${randomBytes(16).toString("hex")}`,
      dkimVerifiedAt: now,
      returnPathSubDomain: "bounce",
      returnPathDomainCnameValue: "bounce.kbmta.net",
      returnPathDomainVerifiedAt: now,
      trackingSubDomain: "e",
      trackingDomainCnameValue: "e.kbmta.net",
      trackingDomainVerifiedAt: now,
      trackingDomainSslVerifiedAt: now,
      dmarcReportingCode: randomBytes(5).toString("hex").toLowerCase(),
      dmarcVerifiedAt: now,
      openTrackingEnabled: true,
      clickTrackingEnabled: true,
      maxSendPerDay: -1,
      maxSendPerHour: -1,
    },
  });

  const senderIdentity = await prisma.senderIdentity.create({
    data: {
      workspaceId,
      name: "Manual Test Sender",
      email: "newsletter",
      sendingDomainId: domain.id,
      emailVerifiedAt: now,
    },
  });

  return {
    id: domain.id,
    name: domainName,
    workspaceId,
    senderIdentityId: senderIdentity.id,
    fullFromAddress: `newsletter@${domainName}`,
  };
}

/**
 * Create a full-access API key for testing.
 */
export async function createApiKey(workspaceId: string): Promise<CreatedApiKey> {
  const { key, hash, preview } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      workspaceId,
      name: "Manual Test API Key",
      keyHash: hash,
      keyPreview: preview,
      scopes: [
        "read:api-keys",
        "write:api-keys",
        "delete:api-keys",
        "read:contacts",
        "write:contacts",
        "update:contacts",
        "delete:contacts",
        "read:topics",
        "write:topics",
        "update:topics",
        "delete:topics",
        "read:segments",
        "write:segments",
        "update:segments",
        "delete:segments",
        "read:broadcasts",
        "write:broadcasts",
        "update:broadcasts",
        "delete:broadcasts",
        "smtp:send",
      ],
    },
  });

  return {
    id: apiKey.id,
    key,
    workspaceId,
  };
}

/**
 * Create test contacts with faker-generated data.
 */
export async function createContacts(
  workspaceId: string,
  count: number,
  faker: typeof import("@faker-js/faker").faker
): Promise<CreatedContact[]> {
  const contacts: CreatedContact[] = [];

  for (let i = 0; i < count; i++) {
    const contact = await prisma.contact.create({
      data: {
        workspaceId,
        email: faker.internet.email().toLowerCase(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        status: "SUBSCRIBED",
      },
    });

    contacts.push({
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
    });
  }

  return contacts;
}

/**
 * Hardcoded workspace ID for manual tests.
 * This ensures all test data goes to a consistent workspace.
 */
const MANUAL_TEST_WORKSPACE_ID = "fio5lvmnqcwc";

/**
 * Get the workspace ID for manual tests.
 */
export function generateWorkspaceId(): string {
  return MANUAL_TEST_WORKSPACE_ID;
}

/**
 * Clean up all test data for a workspace.
 */
export async function cleanupWorkspace(workspaceId: string): Promise<void> {
  await prisma.event.deleteMany({ where: { workspaceId } });
  await prisma.broadcastSend.deleteMany({
    where: { broadcast: { workspaceId } },
  });
  await prisma.broadcast.deleteMany({ where: { workspaceId } });
  await prisma.senderIdentity.deleteMany({ where: { workspaceId } });
  await prisma.sendingDomain.deleteMany({ where: { workspaceId } });
  await prisma.contact.deleteMany({ where: { workspaceId } });
  await prisma.apiKey.deleteMany({ where: { workspaceId } });
}

/**
 * Disconnect from database.
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
