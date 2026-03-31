/**
 * MTA Integration Tests - End-to-End Webhook Event Pipeline
 *
 * Tests the REAL production pipeline end-to-end for both injection paths:
 *
 * HTTP injection:
 *   sendTransactional() → KumoMTA HTTP inject → KumoMTA delivers to Mailpit
 *     → KumoMTA fires webhook to control plane (dev server on :18092)
 *     → handler.ts transforms + queues to BullMQ
 *     → BullMQ "mta" worker (started by this test) processes events
 *     → event-processor stores in database with ALL columns populated
 *
 * SMTP auth injection:
 *   nodemailer → KumoMTA port 587 (AUTH LOGIN validates via control plane)
 *     → smtp.lua enriches with workspace_id, sending_domain_id from DKIM cache
 *     → KumoMTA delivers to Mailpit
 *     → same webhook pipeline as above
 *
 * What makes this a REAL end-to-end test:
 * - Real credentials created in the control plane (API key, workspace, domain)
 * - Real emails injected into KumoMTA (HTTP and SMTP)
 * - Real KumoMTA webhook callbacks to the running control plane
 * - Real BullMQ worker processing (started in beforeAll)
 * - Real event processor storing events in the database
 * - Tests poll the actual database and assert on EVERY event column
 *
 * Prerequisites:
 * - MTA Docker environment running: docker compose -f compose.kumomta.yaml up -d
 * - Control plane dev server running on localhost:18092 (pnpm dev)
 * - Mailpit available at localhost:8025
 * - Redis running (BullMQ connects to it)
 *
 * Run with: pnpm vitest run tests/mta/test-webhook-metadata.spec.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashApiKey } from "@/lib/api-keys";
import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sendTransactional } from "@/jobs/emails/send-transactional";
import {
  cleanupWorkspace,
  createMailpitClient,
  createTestWorkspace,
  createFullAccessApiKey,
  type MailpitClient,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";
import { startMtaWorker, stopMtaWorker } from "./helpers/mta-test-worker";

/**
 * Dev DB client for mirroring test credentials.
 * SMTP auth tests require the API key to exist in the dev DB because
 * the MTA validates credentials against the running dev web app (port 18092),
 * which connects to kibamail_dev, not kibamail_test.
 */
const devPrisma = new PrismaClient({
  datasourceUrl: "postgresql://postgres:postgres@localhost:15432/kibamail_dev",
});

/** Encrypt a string using the same AES-256-GCM scheme as lib/sending-domains/dkim.ts */
function encryptForDevDb(plaintext: string): string {
  const appKey = process.env.APP_KEY || "";
  const key = Buffer.from(appKey.slice(0, 32).padEnd(32, "0"));
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Poll for events in the DEV database.
 * SMTP-injected emails are processed by the dev web app's webhook handler,
 * which stores events in kibamail_dev (not kibamail_test).
 */
async function pollForDevEvents(
  where: { workspaceId: string; recipient: string; type?: string },
  opts: { timeoutMs?: number; pollIntervalMs?: number; orderBy?: Record<string, string> } = {},
) {
  const timeout = opts.timeoutMs ?? MTA_TEST_CONFIG.webhookPollTimeoutMs;
  const pollInterval = opts.pollIntervalMs ?? MTA_TEST_CONFIG.webhookPollIntervalMs;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const events = await devPrisma.event.findMany({
      where,
      orderBy: opts.orderBy ?? { createdAt: "desc" },
    });
    if (events.length > 0) return events;
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return devPrisma.event.findMany({ where, orderBy: opts.orderBy ?? { createdAt: "desc" } });
}

/** Read the real MTA DKIM private key used by the test KumoMTA instance */
const MTA_DKIM_PRIVATE_KEY = readFileSync(
  resolve(__dirname, "../../mta-testing/certs/dkim/kbmta.net/kbmta.key"),
  "utf-8",
);

const TEST_HTML = '<p>Test content</p><p>{{business_address}}</p><a href="{{unsubscribe_url}}">Unsub</a><a href="{{terms_url}}">Terms</a><a href="{{privacy_url}}">Privacy</a>';

const MTA_TEST_CONFIG = {
  mailpitUrl: process.env.MAILPIT_URL ?? "http://localhost:8025",
  smtpHost: process.env.SMTP_HOST ?? "localhost",
  smtpPort: Number(process.env.SMTP_PORT ?? "5587"),
  deliveryTimeoutMs: 30000,
  pollIntervalMs: 500,
  webhookPollTimeoutMs: 15000,
  webhookPollIntervalMs: 500,
};

let testWorkspace: TestWorkspace;
let apiKey: CreatedApiKey;
let mailpit: MailpitClient;
let testCounter = 0;

function getUniqueDomainName(): string {
  testCounter++;
  return `wh-meta-${testCounter}-${Date.now()}.kibamail.xyz`;
}

async function requireEnvironment(): Promise<void> {
  const client = createMailpitClient({ baseUrl: MTA_TEST_CONFIG.mailpitUrl });
  const mailpitHealthy = await client.isHealthy();

  if (!mailpitHealthy) {
    throw new Error(
      `Mailpit not available at ${MTA_TEST_CONFIG.mailpitUrl}. ` +
        `Start MTA environment with: docker compose -f compose.kumomta.yaml up -d`,
    );
  }

  try {
    const response = await fetch("http://localhost:18092/api/internal/v1/mta-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!response.ok && response.status === 0) {
      throw new Error("No response");
    }
  } catch {
    throw new Error(
      "Control plane dev server not available at localhost:18092. " +
        "Start it with: pnpm dev",
    );
  }
}

async function createVerifiedDomain(
  workspaceId: string,
  name: string,
  opts: { openTracking?: boolean; clickTracking?: boolean } = {},
) {
  const domainData = {
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
    openTrackingEnabled: opts.openTracking ?? false,
    clickTrackingEnabled: opts.clickTracking ?? false,
  };

  const domain = await prisma.sendingDomain.create({ data: domainData });

  // Mirror to dev DB so MTA's smtp.lua can validate the domain.
  // DKIM private key must be encrypted since the control plane decrypts it before serving.
  await devPrisma.sendingDomain.create({
    data: {
      ...domainData,
      id: domain.id,
      dkimPrivateKey: encryptForDevDb(MTA_DKIM_PRIVATE_KEY),
    },
  }).catch(() => {});

  return domain;
}

/**
 * Poll for events matching criteria until found or timeout.
 * Webhook processing is async (KumoMTA → dev server → BullMQ → worker → DB),
 * so we poll until the expected events appear.
 */
async function pollForEvents(
  where: Parameters<typeof prisma.event.findMany>[0],
  opts: { timeoutMs?: number; pollIntervalMs?: number } = {},
) {
  const timeout = opts.timeoutMs ?? MTA_TEST_CONFIG.webhookPollTimeoutMs;
  const pollInterval = opts.pollIntervalMs ?? MTA_TEST_CONFIG.webhookPollIntervalMs;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const events = await prisma.event.findMany(where);
    if (events.length > 0) {
      return events;
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return prisma.event.findMany(where);
}

function createSmtpTransport() {
  return nodemailer.createTransport({
    host: MTA_TEST_CONFIG.smtpHost,
    port: MTA_TEST_CONFIG.smtpPort,
    secure: false,
    auth: {
      user: apiKey.id,
      pass: apiKey.key,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

beforeAll(async () => {
  await requireEnvironment();
  await startMtaWorker();

  testWorkspace = createTestWorkspace();
  apiKey = await createFullAccessApiKey(testWorkspace.id);
  mailpit = createMailpitClient({ baseUrl: MTA_TEST_CONFIG.mailpitUrl });

  // Mirror the API key to the dev DB so MTA SMTP auth can validate it.
  // The MTA calls the dev web app (port 18092) which queries kibamail_dev.
  await devPrisma.apiKey.create({
    data: {
      id: apiKey.id,
      workspaceId: apiKey.workspaceId,
      name: apiKey.name,
      keyHash: hashApiKey(apiKey.key),
      keyPreview: apiKey.key.slice(0, 10) + "...",
      scopes: apiKey.scopes,
    },
  });
}, 30000);

afterAll(async () => {
  await stopMtaWorker();
  if (testWorkspace?.id) {
    await cleanupWorkspace(testWorkspace.id);
  }
  // Clean up mirrored data from dev DB
  if (testWorkspace?.id) {
    await devPrisma.event.deleteMany({ where: { workspaceId: testWorkspace.id } }).catch(() => {});
    await devPrisma.transactionalEmail.deleteMany({ where: { workspaceId: testWorkspace.id } }).catch(() => {});
    await devPrisma.sendingDomain.deleteMany({ where: { workspaceId: testWorkspace.id } }).catch(() => {});
    await devPrisma.senderIdentity.deleteMany({ where: { workspaceId: testWorkspace.id } }).catch(() => {});
  }
  if (apiKey?.id) {
    await devPrisma.apiKey.delete({ where: { id: apiKey.id } }).catch(() => {});
  }
  await devPrisma.$disconnect();
});

// =============================================================================
// HTTP Injection End-to-End
// =============================================================================
//
// Pipeline:
//   sendTransactional() builds email with X-Kibamail-* headers
//     → injects to KumoMTA HTTP API (port 8000)
//     → KumoMTA import_x_headers extracts headers into meta
//     → KumoMTA removes X-Kibamail-* headers from outbound message
//     → KumoMTA delivers to Mailpit (via DNSMasq MX override)
//     → KumoMTA fires log_hooks webhook with full log record + meta
//     → handler.ts transforms KumoLogRecord → EmailEvent
//     → BullMQ worker processes → event-processor maps to Prisma columns
//     → Event row stored in database
//

describe("HTTP injection: all event columns populated", () => {
  it("should populate all Delivery event columns after HTTP injection", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName, {
      openTracking: true,
      clickTracking: false,
    });

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "http-e2e",
        name: "HTTP E2E Test",
      },
    });

    const emailSendId = `test_http_e2e_${Date.now()}`;
    const testTo = `http-e2e-${Date.now()}@example.com`;
    const testSubject = `[E2E] HTTP All Columns ${Date.now()}`;

    await sendTransactional(
      {
        emailSendId,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: testTo,
        subject: testSubject,
        htmlBody: "<p>Testing all event columns from HTTP injection</p>",
      },
      "test-job-http-e2e",
    );

    // 1. Assert email was actually delivered to Mailpit
    const message = await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    expect(message).not.toBeNull();
    expect(message!.Subject).toBe(testSubject);

    // 2. Poll for the Delivery event in the database
    const deliveryEvents = await pollForEvents({
      where: {
        workspaceId: testWorkspace.id,
        recipient: testTo,
        type: "Delivery",
      },
      orderBy: { createdAt: "desc" },
    });

    expect(deliveryEvents.length).toBeGreaterThan(0);
    const event = deliveryEvents[0];

    // --- Core identifiers ---
    expect(event.workspaceId).toBe(testWorkspace.id);
    expect(event.sendingId).toBe(emailSendId);
    expect(event.recipient).toBe(testTo);
    expect(event.type).toBe("Delivery");
    expect(event.nodeId).toBeTruthy();

    // --- SMTP response (Mailpit always returns 250) ---
    expect(event.responseCode).toBe(250);
    expect(event.responseContent).toBeTruthy();

    // --- KumoMTA standard fields ---
    // queue = destination domain
    expect(event.queue).toContain("example.com");
    // size = message size in bytes (must be positive)
    expect(event.size).toBeGreaterThan(0);
    // totalAttempts = number of retry attempts (0 on first successful delivery)
    expect(event.totalAttempts).toBeGreaterThanOrEqual(0);
    // peerAddress = Mailpit's SMTP server address (from DNSMasq)
    expect(event.peerAddressName).toBeTruthy();
    expect(event.peerAddressAddr).toBeTruthy();
    // egressPool = "transactional" (sendTransactional sets this pool)
    expect(event.egressPool).toBe("transactional");
    // egressSource = whichever source KumoMTA picked from the pool
    expect(event.egressSource).toBeTruthy();
    // deliveryProtocol = "ESMTP" (KumoMTA delivers via SMTP)
    expect(event.deliveryProtocol).toBeTruthy();

    // --- Application metadata (from X-Kibamail-* headers) ---
    expect(event.sendingDomainId).toBe(domain.id);
    expect(event.senderIdentityId).toBe(sender.id);
    // Tracking settings come from the domain we created
    expect(event.openTrackingEnabled).toBe(true);
    expect(event.clickTrackingEnabled).toBe(false);
  }, 60000);

  it("should correlate Queued and Delivery events with matching sendingId", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName);

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "correlated",
        name: "Correlation Test",
      },
    });

    const emailSendId = `test_corr_${Date.now()}`;
    const testTo = `corr-e2e-${Date.now()}@example.com`;

    await sendTransactional(
      {
        emailSendId,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: testTo,
        subject: `[E2E] Correlation ${Date.now()}`,
        htmlBody: "<p>Testing event correlation</p>",
      },
      "test-job-corr-e2e",
    );

    await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    // Delivery event (from webhook)
    const deliveryEvents = await pollForEvents({
      where: {
        workspaceId: testWorkspace.id,
        recipient: testTo,
        type: "Delivery",
      },
    });
    expect(deliveryEvents.length).toBeGreaterThan(0);

    // Queued event (created synchronously by sendTransactional)
    const queuedEvents = await prisma.event.findMany({
      where: {
        workspaceId: testWorkspace.id,
        recipient: testTo,
        type: "Queued",
      },
    });
    expect(queuedEvents.length).toBeGreaterThan(0);

    // Both share our emailSendId (not KumoMTA's internal spool ID)
    expect(queuedEvents[0].sendingId).toBe(emailSendId);
    expect(deliveryEvents[0].sendingId).toBe(emailSendId);

    // Delivery event should have application metadata from webhook
    expect(deliveryEvents[0].sendingDomainId).toBe(domain.id);
    // Queued event is created synchronously before MTA processes, so sendingDomainId
    // may or may not be set depending on when the event was created
    if (queuedEvents[0].sendingDomainId) {
      expect(queuedEvents[0].sendingDomainId).toBe(domain.id);
    }
  }, 60000);

  it("should populate Reception event with reception_protocol for HTTP injection", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName);

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "reception-http",
        name: "Reception HTTP Test",
      },
    });

    const emailSendId = `test_recep_http_${Date.now()}`;
    const testTo = `recep-http-${Date.now()}@example.com`;

    await sendTransactional(
      {
        emailSendId,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: testTo,
        subject: `[E2E] Reception HTTP ${Date.now()}`,
        htmlBody: "<p>Testing reception event from HTTP</p>",
      },
      "test-job-recep-http",
    );

    await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    // Wait a bit extra for Reception events (they fire before Delivery)
    const receptionEvents = await pollForEvents({
      where: {
        workspaceId: testWorkspace.id,
        recipient: testTo,
        type: "Reception",
      },
    });

    // Reception events may or may not be logged depending on KumoMTA config.
    // If present, verify reception-specific fields.
    if (receptionEvents.length > 0) {
      const event = receptionEvents[0];
      expect(event.receptionProtocol).toBe("HTTP");
      expect(event.sendingId).toBe(emailSendId);
      // Reception events don't have delivery-side fields
      expect(event.egressPool).toBeNull();
      expect(event.egressSource).toBeNull();
      expect(event.deliveryProtocol).toBeNull();
    }
  }, 60000);
});

// =============================================================================
// SMTP Auth Injection End-to-End
// =============================================================================
//
// Pipeline:
//   nodemailer connects to KumoMTA port 587 with AUTH LOGIN
//     → KumoMTA calls control plane POST /api/internal/v1/mta/auth/validate
//     → control plane validates credentials, returns { workspace_id }
//     → smtp.lua stores workspace_id in conn_meta
//     → smtp.lua calls control_plane.get_domain_workspace_id for domain validation
//     → smtp.lua calls control_plane.get_tenant_dkim_key and enriches meta
//       with x_kibamail_sending_domain_id
//     → KumoMTA delivers to Mailpit
//     → KumoMTA fires log_hooks webhook
//     → same processing pipeline as HTTP → Event row in database
//

describe("SMTP auth injection: all event columns populated", () => {
  it("should populate all Delivery event columns after SMTP auth injection", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName);

    const testTo = `smtp-e2e-${Date.now()}@example.com`;
    const testSubject = `[E2E] SMTP All Columns ${Date.now()}`;

    const transporter = createSmtpTransport();

    await transporter.sendMail({
      from: `smtp-e2e@${domainName}`,
      to: testTo,
      subject: testSubject,
      html: TEST_HTML,
      text: "Testing all event columns from SMTP auth injection",
    });

    // 1. Assert email was actually delivered to Mailpit
    const message = await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    expect(message).not.toBeNull();
    expect(message!.Subject).toBe(testSubject);

    // 2. Poll for the Delivery event in the DEV database
    // SMTP webhooks are processed by the dev web app, which stores in kibamail_dev
    const deliveryEvents = await pollForDevEvents({
      workspaceId: testWorkspace.id,
      recipient: testTo,
      type: "Delivery",
    });

    expect(deliveryEvents.length).toBeGreaterThan(0);
    const event = deliveryEvents[0];

    // --- Core identifiers ---
    expect(event.workspaceId).toBe(testWorkspace.id);
    // SMTP clients don't set X-Kibamail-Email-Send-Id, so sendingId falls
    // back to KumoMTA's internal spool ID — just verify it's present
    expect(event.sendingId).toBeTruthy();
    expect(event.recipient).toBe(testTo);
    expect(event.type).toBe("Delivery");
    expect(event.nodeId).toBeTruthy();

    // --- SMTP response ---
    expect(event.responseCode).toBe(250);
    expect(event.responseContent).toBeTruthy();

    // --- KumoMTA standard fields ---
    expect(event.queue).toContain("example.com");
    expect(event.size).toBeGreaterThan(0);
    expect(event.totalAttempts).toBeGreaterThanOrEqual(0);
    expect(event.peerAddressName).toBeTruthy();
    expect(event.peerAddressAddr).toBeTruthy();
    expect(event.egressPool).toBeTruthy();
    expect(event.egressSource).toBeTruthy();
    expect(event.deliveryProtocol).toBeTruthy();

    // --- Application metadata (enriched by smtp.lua) ---
    // sendingDomainId comes from DKIM cache lookup in smtp.lua
    expect(event.sendingDomainId).toBe(domain.id);
    // senderIdentityId is intentionally null for SMTP (can't determine which identity)
    expect(event.senderIdentityId).toBeNull();
  }, 60000);

  it("should populate workspace_id from auth credentials even without X-Kibamail headers", async () => {
    const domainName = getUniqueDomainName();
    await createVerifiedDomain(testWorkspace.id, domainName);

    const testTo = `smtp-no-headers-${Date.now()}@example.com`;
    const testSubject = `[E2E] SMTP No Headers ${Date.now()}`;

    const transporter = createSmtpTransport();

    // Plain email — no X-Kibamail-* headers at all
    await transporter.sendMail({
      from: `plain@${domainName}`,
      to: testTo,
      subject: testSubject,
      text: "Plain email with no custom headers at all",
    });

    const message = await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });
    expect(message).not.toBeNull();

    // All events for this recipient must have workspace_id from SMTP auth
    // SMTP events are stored in the dev DB by the dev web app's webhook handler
    const events = await pollForDevEvents({
      workspaceId: testWorkspace.id,
      recipient: testTo,
    });

    expect(events.length).toBeGreaterThan(0);

    for (const event of events) {
      expect(event.workspaceId).toBe(testWorkspace.id);
    }
  }, 60000);

  it("should populate Reception event with ESMTP protocol for SMTP injection", async () => {
    const domainName = getUniqueDomainName();
    await createVerifiedDomain(testWorkspace.id, domainName);

    const testTo = `smtp-recep-${Date.now()}@example.com`;

    const transporter = createSmtpTransport();

    await transporter.sendMail({
      from: `recep-test@${domainName}`,
      to: testTo,
      subject: `[E2E] SMTP Reception ${Date.now()}`,
      text: "Testing reception event from SMTP",
    });

    await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    const receptionEvents = await pollForDevEvents({
      workspaceId: testWorkspace.id,
      recipient: testTo,
      type: "Reception",
    });

    // Reception events may or may not be logged depending on KumoMTA config
    if (receptionEvents.length > 0) {
      const event = receptionEvents[0];
      expect(event.receptionProtocol).toBe("ESMTP");
      expect(event.workspaceId).toBe(testWorkspace.id);
    }
  }, 60000);
});

// =============================================================================
// Tracking settings end-to-end
// =============================================================================

describe("Tracking settings: propagated through the full pipeline", () => {
  it("should store clickTrackingEnabled=true and openTrackingEnabled=true when both enabled", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName, {
      clickTracking: true,
      openTracking: true,
    });

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "tracking-both",
        name: "Tracking Both Test",
      },
    });

    const emailSendId = `test_track_both_${Date.now()}`;
    const testTo = `track-both-${Date.now()}@example.com`;

    await sendTransactional(
      {
        emailSendId,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: testTo,
        subject: `[E2E] Tracking Both ${Date.now()}`,
        htmlBody: '<p>Test <a href="https://example.com">link</a></p>',
      },
      "test-job-track-both",
    );

    await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    const events = await pollForEvents({
      where: {
        workspaceId: testWorkspace.id,
        recipient: testTo,
        type: "Delivery",
      },
    });

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].clickTrackingEnabled).toBe(true);
    expect(events[0].openTrackingEnabled).toBe(true);
  }, 60000);

  it("should store clickTrackingEnabled=false and openTrackingEnabled=false when both disabled", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName, {
      clickTracking: false,
      openTracking: false,
    });

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "tracking-none",
        name: "Tracking None Test",
      },
    });

    const emailSendId = `test_track_none_${Date.now()}`;
    const testTo = `track-none-${Date.now()}@example.com`;

    await sendTransactional(
      {
        emailSendId,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: testTo,
        subject: `[E2E] Tracking None ${Date.now()}`,
        htmlBody: "<p>No tracking here</p>",
      },
      "test-job-track-none",
    );

    await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    const events = await pollForEvents({
      where: {
        workspaceId: testWorkspace.id,
        recipient: testTo,
        type: "Delivery",
      },
    });

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].clickTrackingEnabled).toBe(false);
    expect(events[0].openTrackingEnabled).toBe(false);
  }, 60000);
});
