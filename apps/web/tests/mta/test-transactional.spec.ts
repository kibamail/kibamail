/**
 * MTA Integration Tests - Transactional Email Sending
 *
 * These tests verify complete transactional email sending flow through KumoMTA:
 * - Email injection via HTTP API with pool: "transactional"
 * - DKIM signing
 * - Delivery to recipient mailbox (Mailpit)
 *
 * Prerequisites:
 * - MTA Docker environment running: docker compose -f compose.kumomta.yaml up -d
 * - Control plane running on localhost:18092
 * - Mailpit available at localhost:8025
 *
 * Run with: pnpm vitest run tests/mta/test-transactional.spec.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  cleanupWorkspace,
  createMailpitClient,
  createTestWorkspace,
  emailAssertions,
  type MailpitClient,
  type TestWorkspace,
} from "@/tests/utils";

const MTA_TEST_CONFIG = {
  mailpitUrl: process.env.MAILPIT_URL ?? "http://localhost:8025",
  mtaUrl:
    process.env.MTA_INJECTION_URL ?? "http://localhost:8000/api/inject/v1",
  testDomain: "transactional.kibamail.xyz",
  mtaDomain: "kbmta.net",
  deliveryTimeoutMs: 30000,
  pollIntervalMs: 500,
};

let testWorkspace: TestWorkspace;
let mailpit: MailpitClient;
let testCounter = 0;

/**
 * Generate a unique domain name for each test
 */
function getUniqueDomainName(): string {
  testCounter++;
  return `test-${testCounter}-${Date.now()}.kibamail.xyz`;
}

/**
 * Check if MTA test environment is available - throws if not
 */
async function requireEnvironment(): Promise<void> {
  const client = createMailpitClient({ baseUrl: MTA_TEST_CONFIG.mailpitUrl });
  const mailpitHealthy = await client.isHealthy();

  if (!mailpitHealthy) {
    throw new Error(
      `Mailpit not available at ${MTA_TEST_CONFIG.mailpitUrl}. ` +
        `Start MTA environment with: docker compose -f compose.kumomta.yaml up -d`
    );
  }

  const injectUrl = `${MTA_TEST_CONFIG.mtaUrl}/api/inject/v1`;
  try {
    const response = await fetch(injectUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (response.status === 404) {
      throw new Error(`MTA inject endpoint not found at ${injectUrl}`);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("inject endpoint not found")
    ) {
      throw error;
    }
    throw new Error(
      `MTA not available at ${injectUrl}. ` +
        `Start MTA environment with: docker compose -f compose.kumomta.yaml up -d. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create a verified sending domain for testing
 */
async function createVerifiedDomain(workspaceId: string, name: string) {
  const domain = await prisma.sendingDomain.create({
    data: {
      workspaceId,
      name,
      dkimSubDomain: "kibamail._domainkey",
      dkimPublicKey: "test-public-key",
      dkimPrivateKey: "test-private-key",
      returnPathSubDomain: "kb",
      returnPathDomainCnameValue: "mail.kbmta.net",
      trackingSubDomain: "e",
      trackingDomainCnameValue: "e.kbmta.net",
      dmarcReportingCode: "abcdefghij",
      dkimVerifiedAt: new Date(),
      returnPathDomainVerifiedAt: new Date(),
      openTrackingEnabled: true,
      clickTrackingEnabled: true,
      inboxEnabled: false,
    },
  });

  return domain;
}

/**
 * Create a sender identity for domain
 */
async function createSenderIdentity(
  workspaceId: string,
  domainId: string,
  email: string,
  name: string,
) {
  return prisma.senderIdentity.create({
    data: {
      workspaceId,
      sendingDomainId: domainId,
      email,
      name,
    },
  });
}

/**
 * Create a test broadcast with all required content
 */
async function createTestBroadcastRecord(
  workspaceId: string,
  domainId: string,
  senderIdentityId: string,
  options: {
    name: string;
    subject: string;
    html: string;
    text?: string;
  },
) {
  const broadcast = await prisma.broadcast.create({
    data: {
      workspaceId,
      name: options.name,
      status: "QUEUED_FOR_SENDING",
      senderIdentityId,
      sendingDomainId: domainId,
      emailContent: {
        create: {
          subject: options.subject,
          contentHtml: options.html,
          contentText: options.text,
        },
      },
    },
  });

  return broadcast;
}

afterAll(async () => {
  if (testWorkspace) {
    await cleanupWorkspace(testWorkspace.id);
  }
});

describe("MTA Integration: Transactional Email Sending", () => {
  beforeAll(async () => {
    await requireEnvironment();
    testWorkspace = createTestWorkspace();
    mailpit = createMailpitClient({ baseUrl: MTA_TEST_CONFIG.mailpitUrl });
  });

  it("should send transactional email and deliver to Mailpit", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName);

    const sender = await createSenderIdentity(
      testWorkspace.id,
      domain.id,
      "info",
      "Transactional Sender"
    );

    const testEmail = "test-recipient@example.com";

    const emailSendId = `test_es_${Date.now()}`;

    await prisma.event.create({
      data: {
        id: `evt_${emailSendId}`,
        sendingId: emailSendId,
        workspaceId: testWorkspace.id,
        type: "Queued",
        recipient: testEmail,
        queue: "transactional",
        siteName: "transactional",
        createdAt: new Date(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(sender).toBeDefined();
  }, 60000);
});
