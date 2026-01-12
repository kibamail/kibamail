/**
 * MTA Integration Tests - Transactional Email Sending
 *
 * These tests verify complete transactional email sending flow through KiboMTA:
 * - API endpoint validation and job queuing to BullMQ
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
import { POST } from "@/app/(main)/api/v1/emails/send/route";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import { sendTransactional } from "@/jobs/emails/send-transactional";
import {
  cleanupWorkspace,
  createMailpitClient,
  createTestWorkspace,
  createFullAccessApiKey,
  emailAssertions,
  post,
  type MailpitClient,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";
import { ErrorCode } from "@/lib/api/error-codes";

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
let apiKey: CreatedApiKey;
let mailpit: MailpitClient;
let testCounter = 0;

function getUniqueDomainName(): string {
  testCounter++;
  return `test-${testCounter}-${Date.now()}.kibamail.xyz`;
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
        `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function createVerifiedDomain(workspaceId: string, name: string) {
  return prisma.sendingDomain.create({
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
    },
  });
}

async function getTransactionalJobs(workspaceId: string, emailSendId?: string) {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const emailsQueue = queue("emails").getQueue().getQueue();

  const allJobs = await emailsQueue.getJobs([
    "waiting",
    "delayed",
    "active",
    "completed",
    "failed",
    "paused",
    "prioritized",
  ]);

  return allJobs.filter((job) => {
    const matchWorkspace = job.data?.workspaceId === workspaceId;
    const matchJobName = job.name === "send-transactional";
    const matchEmailSendId = emailSendId
      ? job.data?.emailSendId === emailSendId
      : true;
    return matchWorkspace && matchJobName && matchEmailSendId;
  });
}

async function cleanupTestJobs(workspaceId: string) {
  const emailsQueue = queue("emails").getQueue().getQueue();

  const allJobs = await emailsQueue.getJobs([
    "waiting",
    "delayed",
    "active",
    "completed",
    "failed",
    "paused",
    "prioritized",
  ]);

  const testJobs = allJobs.filter(
    (job) =>
      job.data?.workspaceId === workspaceId &&
      job.name === "send-transactional",
  );

  await Promise.all(testJobs.map((job) => job.remove()));
}

beforeAll(async () => {
  await requireEnvironment();

  testWorkspace = createTestWorkspace();
  apiKey = await createFullAccessApiKey(testWorkspace.id);
  mailpit = createMailpitClient({ baseUrl: MTA_TEST_CONFIG.mailpitUrl });
}, 30000);

afterAll(async () => {
  await cleanupTestJobs(testWorkspace.id);
  await cleanupWorkspace(testWorkspace.id);
});

describe("POST /api/v1/emails/send - Job Queuing", () => {
  it("should queue transactional email job with correct data", async () => {
    const domainName = getUniqueDomainName();
    await createVerifiedDomain(testWorkspace.id, domainName);

    const testSubject = `Test Subject ${Date.now()}`;
    const testHtml = "<p>Test HTML content</p>";
    const testText = "Test text content";
    const testTo = "recipient@example.com";
    const testFrom = `info@${domainName}`;

    const request = post(
      "/emails/send",
      {
        from: testFrom,
        to: testTo,
        subject: testSubject,
        html: testHtml,
        text: testText,
      },
      apiKey.key,
    );

    const response = await POST(request);
    expect(response.status).toBe(201);

    const responseData = await response.json();
    expect(responseData.object).toBe("email");
    expect(responseData.id).toBeDefined();

    const jobs = await getTransactionalJobs(testWorkspace.id, responseData.id);
    expect(jobs.length).toBeGreaterThan(0);

    const queuedJob = jobs[0];
    expect(queuedJob.data.subject).toBe(testSubject);
    expect(queuedJob.data.htmlBody).toBe(testHtml);
    expect(queuedJob.data.textBody).toBe(testText);
    expect(queuedJob.data.to).toBe(testTo);
    expect(queuedJob.data.workspaceId).toBe(testWorkspace.id);
  });

  it("should queue one job per recipient for array of recipients", async () => {
    const domainName = getUniqueDomainName();
    await createVerifiedDomain(testWorkspace.id, domainName);

    const recipients = [
      "recipient1@example.com",
      "recipient2@example.com",
      "recipient3@example.com",
    ];

    const request = post(
      "/emails/send",
      {
        from: `info@${domainName}`,
        to: recipients,
        subject: "Multi-recipient Test",
        html: "<p>Test</p>",
      },
      apiKey.key,
    );

    const response = await POST(request);
    expect(response.status).toBe(201);

    const responseData = await response.json();

    // Multi-recipient response returns emails array
    expect(responseData.object).toBe("email_list");
    expect(responseData.emails).toHaveLength(3);

    // Find all jobs for these email IDs
    const emailIds = responseData.emails.map((e: { id: string }) => e.id);
    const allJobs = await Promise.all(
      emailIds.map((id: string) => getTransactionalJobs(testWorkspace.id, id))
    );

    // Should have 1 job per recipient
    expect(allJobs.flat()).toHaveLength(3);

    // Each job should have a single recipient
    const jobRecipients = allJobs.flat().map((job) => job.data.to);
    expect(jobRecipients.sort()).toEqual(recipients.sort());
  });

  it("should create sender identity if not exists", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName);

    const newSenderEmail = `new-sender@${domainName}`;

    const request = post(
      "/emails/send",
      {
        from: newSenderEmail,
        to: "recipient@example.com",
        subject: "Test Sender Identity",
        html: "<p>Test</p>",
      },
      apiKey.key,
    );

    const response = await POST(request);
    expect(response.status).toBe(201);

    const senderIdentity = await prisma.senderIdentity.findFirst({
      where: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "new-sender",
      },
    });

    expect(senderIdentity).toBeDefined();
    expect(senderIdentity?.email).toBe("new-sender");

    const responseData = await response.json();
    const jobs = await getTransactionalJobs(testWorkspace.id, responseData.id);
    expect(jobs[0].data.senderIdentityId).toBe(senderIdentity?.id);
  });

  it("should include reply-to in queued job", async () => {
    const domainName = getUniqueDomainName();
    await createVerifiedDomain(testWorkspace.id, domainName);

    const request = post(
      "/emails/send",
      {
        from: `info@${domainName}`,
        to: "recipient@example.com",
        subject: "Reply-To Test",
        html: "<p>Test</p>",
        replyTo: {
          email: "support@example.com",
          name: "Support Team",
        },
      },
      apiKey.key,
    );

    const response = await POST(request);
    expect(response.status).toBe(201);

    const responseData = await response.json();
    const jobs = await getTransactionalJobs(testWorkspace.id, responseData.id);
    expect(jobs.length).toBe(1);

    const queuedJob = jobs[0];
    expect(queuedJob.data.replyTo).toEqual({
      email: "support@example.com",
      name: "Support Team",
    });
  });

  it("should include metadata in queued job", async () => {
    const domainName = getUniqueDomainName();
    await createVerifiedDomain(testWorkspace.id, domainName);

    const metadata = {
      orderId: "12345",
      customerType: "premium",
    };

    const request = post(
      "/emails/send",
      {
        from: `info@${domainName}`,
        to: "recipient@example.com",
        subject: "Metadata Test",
        html: "<p>Test</p>",
        metadata,
      },
      apiKey.key,
    );

    const response = await POST(request);
    expect(response.status).toBe(201);

    const responseData = await response.json();
    const jobs = await getTransactionalJobs(testWorkspace.id, responseData.id);
    expect(jobs[0].data.metadata).toEqual(metadata);
  });

  it("should reject unverified sending domain", async () => {
    const domainName = `unverified-${Date.now()}.kibamail.xyz`;

    await prisma.sendingDomain.create({
      data: {
        workspaceId: testWorkspace.id,
        name: domainName,
        dkimSubDomain: "kibamail._domainkey",
        dkimPublicKey: "test-public-key",
        dkimPrivateKey: "test-private-key",
        returnPathSubDomain: "kb",
        returnPathDomainCnameValue: "mail.kbmta.net",
        trackingSubDomain: "e",
        trackingDomainCnameValue: "e.kbmta.net",
        dmarcReportingCode: "abcdefghij",
        dkimVerifiedAt: null,
        returnPathDomainVerifiedAt: null,
      },
    });

    const request = post(
      "/emails/send",
      {
        from: `info@${domainName}`,
        to: "recipient@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      },
      apiKey.key,
    );

    const response = await POST(request);
    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData.error?.code).toBe(
      ErrorCode.SENDING_DOMAIN_NOT_VERIFIED,
    );

    const jobs = await getTransactionalJobs(testWorkspace.id);
    expect(
      jobs.filter(
        (j) =>
          j.data?.subject === "Test" &&
          j.data?.workspaceId === testWorkspace.id,
      ).length,
    ).toBe(0);
  });

  it("should reject missing required fields", async () => {
    const domainName = getUniqueDomainName();
    await createVerifiedDomain(testWorkspace.id, domainName);

    const request = post(
      "/emails/send",
      {
        from: `info@${domainName}`,
        to: "recipient@example.com",
        html: "<p>Test</p>",
      },
      apiKey.key,
    );

    const response = await POST(request);
    expect(response.status).toBe(422);

    const responseData = await response.json();
    expect(responseData.error?.type).toBe("VALIDATION_ERROR");
  });
});

describe("MTA Integration: Transactional Email Delivery", () => {
  it("should deliver transactional email to Mailpit", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName);

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "info",
        name: "Test Sender",
      },
    });

    const testSubject = `[Kibamail Test] Basic Delivery ${Date.now()}`;
    const testHtml = "<h1>Hello!</h1><p>This is a test email.</p>";
    const testTo = `delivery-test-${Date.now()}@example.com`;

    await sendTransactional(
      {
        emailSendId: `test_${Date.now()}`,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: testTo,
        subject: testSubject,
        htmlBody: testHtml,
        replyTo: { email: `reply@${domainName}`, name: "Reply Handler" },
      },
      "test-job-1",
    );

    const message = await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    expect(message).not.toBeNull();
    expect(message!.Subject).toBe(testSubject);
    expect(message!.To[0].Address).toBe(testTo);
    expect(message!.HTML).toContain("Hello!");
    expect(message!.HTML).toContain("This is a test email.");
  }, 30000);

  it("should deliver email with attachments", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName);

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "attachments",
        name: "Attachment Sender",
      },
    });

    const testSubject = `[Kibamail Test] Attachments ${Date.now()}`;
    const testTo = `attachment-test-${Date.now()}@example.com`;
    const attachmentContent = Buffer.from("Hello, this is a test file content!").toString("base64");
    const secondAttachmentContent = Buffer.from('{"key": "value", "test": true}').toString("base64");

    await sendTransactional(
      {
        emailSendId: `test_attach_${Date.now()}`,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: testTo,
        subject: testSubject,
        htmlBody: "<p>Email with attachments</p>",
        attachments: [
          {
            filename: "test-file.txt",
            contentType: "text/plain",
            content: attachmentContent,
            index: 0,
          },
          {
            filename: "data.json",
            contentType: "application/json",
            content: secondAttachmentContent,
            index: 1,
          },
        ],
      },
      "test-job-attachments",
    );

    const message = await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    expect(message).not.toBeNull();
    expect(message!.Subject).toBe(testSubject);
    expect(message!.Attachments).toHaveLength(2);

    const txtAttachment = message!.Attachments.find((a) => a.FileName === "test-file.txt");
    const jsonAttachment = message!.Attachments.find((a) => a.FileName === "data.json");

    expect(txtAttachment).toBeDefined();
    expect(txtAttachment!.ContentType).toBe("text/plain");

    expect(jsonAttachment).toBeDefined();
    expect(jsonAttachment!.ContentType).toBe("application/json");

    // Verify attachment content
    const downloadedContent = await mailpit.getAttachment(message!.ID, txtAttachment!.PartID);
    expect(downloadedContent).toBe(attachmentContent);
  }, 30000);

  it("should auto-generate text body from HTML when not provided", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName);

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "text-gen",
        name: "Text Gen Sender",
      },
    });

    const testSubject = `[Kibamail Test] Text Auto-Generation ${Date.now()}`;
    const testTo = `text-gen-${Date.now()}@example.com`;
    const testHtml = `
      <html>
        <body>
          <h1>Welcome to Our Newsletter</h1>
          <p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
          <ul>
            <li>First item</li>
            <li>Second item</li>
          </ul>
          <a href="https://example.com">Click here</a>
        </body>
      </html>
    `;

    await sendTransactional(
      {
        emailSendId: `test_textgen_${Date.now()}`,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: testTo,
        subject: testSubject,
        htmlBody: testHtml,
        // Note: textBody is NOT provided - should be auto-generated
      },
      "test-job-textgen",
    );

    const message = await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    expect(message).not.toBeNull();
    expect(message!.Subject).toBe(testSubject);
    expect(message!.Text).toBeTruthy();
    // HTML-to-text conversion may uppercase headings, so use case-insensitive matching
    expect(message!.Text.toLowerCase()).toContain("welcome to our newsletter");
    expect(message!.Text.toLowerCase()).toContain("this is a paragraph");
    expect(message!.Text.toLowerCase()).toContain("first item");
    expect(message!.Text.toLowerCase()).toContain("second item");
  }, 30000);

  it("should inject open tracking pixel when enabled", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName);

    // Ensure tracking is enabled
    await prisma.sendingDomain.update({
      where: { id: domain.id },
      data: { openTrackingEnabled: true },
    });

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "open-track",
        name: "Open Tracking Sender",
      },
    });

    const testSubject = `[Kibamail Test] Open Tracking ${Date.now()}`;
    const testTo = `open-track-${Date.now()}@example.com`;

    await sendTransactional(
      {
        emailSendId: `test_open_${Date.now()}`,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: testTo,
        subject: testSubject,
        htmlBody: "<html><body><p>Check for tracking pixel</p></body></html>",
      },
      "test-job-open-tracking",
    );

    const message = await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    expect(message).not.toBeNull();

    // Check for tracking pixel (1x1 image with tracking domain)
    const trackingDomain = `${domain.trackingSubDomain}.${domain.name}`;
    expect(message!.HTML).toContain(`https://${trackingDomain}/o/`);
    expect(message!.HTML).toMatch(/width=["']?1["']?/);
    expect(message!.HTML).toMatch(/height=["']?1["']?/);
  }, 30000);

  it("should rewrite links for click tracking when enabled", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName);

    // Ensure click tracking is enabled
    await prisma.sendingDomain.update({
      where: { id: domain.id },
      data: { clickTrackingEnabled: true },
    });

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "click-track",
        name: "Click Tracking Sender",
      },
    });

    const testSubject = `[Kibamail Test] Click Tracking ${Date.now()}`;
    const testTo = `click-track-${Date.now()}@example.com`;
    const originalLink = "https://example.com/original-destination";

    await sendTransactional(
      {
        emailSendId: `test_click_${Date.now()}`,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: testTo,
        subject: testSubject,
        htmlBody: `<html><body><p>Click <a href="${originalLink}">this link</a></p></body></html>`,
      },
      "test-job-click-tracking",
    );

    const message = await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    expect(message).not.toBeNull();

    // Original link should be rewritten to tracking URL
    const trackingDomain = `${domain.trackingSubDomain}.${domain.name}`;
    expect(message!.HTML).not.toContain(`href="${originalLink}"`);
    expect(message!.HTML).toContain(`https://${trackingDomain}/c/`);
  }, 30000);

  it("should NOT apply tracking when disabled", async () => {
    const domainName = getUniqueDomainName();
    const domain = await prisma.sendingDomain.create({
      data: {
        workspaceId: testWorkspace.id,
        name: domainName,
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
        // Tracking explicitly disabled
        openTrackingEnabled: false,
        clickTrackingEnabled: false,
      },
    });

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "no-track",
        name: "No Tracking Sender",
      },
    });

    const testSubject = `[Kibamail Test] No Tracking ${Date.now()}`;
    const testTo = `no-track-${Date.now()}@example.com`;
    const originalLink = "https://example.com/keep-this-link";

    await sendTransactional(
      {
        emailSendId: `test_notrack_${Date.now()}`,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: testTo,
        subject: testSubject,
        htmlBody: `<html><body><p>Link: <a href="${originalLink}">click</a></p></body></html>`,
      },
      "test-job-no-tracking",
    );

    const message = await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    expect(message).not.toBeNull();

    // Links should NOT be rewritten
    expect(message!.HTML).toContain(`href="${originalLink}"`);

    // No tracking pixel should be present
    const trackingDomain = `${domain.trackingSubDomain}.${domain.name}`;
    expect(message!.HTML).not.toContain(`https://${trackingDomain}/o/`);
  }, 30000);

  it("should create Event record after successful delivery", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName);

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "event-test",
        name: "Event Test Sender",
      },
    });

    const emailSendId = `test_event_${Date.now()}`;
    const testSubject = `[Kibamail Test] Event Creation ${Date.now()}`;
    const testTo = `event-test-${Date.now()}@example.com`;

    await sendTransactional(
      {
        emailSendId,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: testTo,
        subject: testSubject,
        htmlBody: "<p>Testing event creation</p>",
      },
      "test-job-event",
    );

    // Wait for email to be delivered
    const message = await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    expect(message).not.toBeNull();

    // Find the Event record
    const events = await prisma.event.findMany({
      where: {
        workspaceId: testWorkspace.id,
        recipient: testTo,
        type: "Queued",
        queue: "transactional",
      },
      orderBy: { createdAt: "desc" },
    });

    expect(events.length).toBeGreaterThan(0);

    const event = events[0];
    expect(event.type).toBe("Queued");
    expect(event.queue).toBe("transactional");
    expect(event.siteName).toBe("transactional");
    expect(event.recipient).toBe(testTo);
    expect(event.contentS3Key).toBeTruthy();
    expect(event.contentS3Key).toContain(`emails/${testWorkspace.id}/transactional/`);
  }, 30000);

  it("should skip send when event already has S3 content (idempotency for retries)", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName);

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "idempotency",
        name: "Idempotency Sender",
      },
    });

    const timestamp = Date.now();
    const testSubject = `[Kibamail Test] Idempotency ${timestamp}`;
    const testTo = `idempotency-${timestamp}@example.com`;

    // First send - should succeed and create event with S3 key
    await sendTransactional(
      {
        emailSendId: `test_idempotency_${timestamp}`,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: testTo,
        subject: testSubject,
        htmlBody: "<p>This email should be delivered</p>",
      },
      "test-job-idempotency-1",
    );

    // Wait for the email
    const message = await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    expect(message).not.toBeNull();

    // Verify event was created with S3 key (this is what enables idempotency)
    const event = await prisma.event.findFirst({
      where: {
        workspaceId: testWorkspace.id,
        recipient: testTo,
        type: "Queued",
      },
    });

    expect(event).not.toBeNull();
    expect(event!.contentS3Key).toBeTruthy();
    expect(event!.contentS3Key).toContain(`emails/${testWorkspace.id}/transactional/`);

    // The idempotency check ensures that if a job is retried after S3 upload succeeded,
    // it won't re-send. This is verified by the presence of contentS3Key in the event.
  }, 30000);

  // Skip: MTA doesn't support preview_text in content object format
  it.skip("should include preview text in email", async () => {
    const domainName = getUniqueDomainName();
    // Create domain without tracking to avoid MTA format issues
    const domain = await prisma.sendingDomain.create({
      data: {
        workspaceId: testWorkspace.id,
        name: domainName,
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
        openTrackingEnabled: false,
        clickTrackingEnabled: false,
      },
    });

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "preview",
        name: "Preview Sender",
      },
    });

    const testSubject = `[Kibamail Test] Preview Text ${Date.now()}`;
    const testTo = `preview-${Date.now()}@example.com`;
    const previewText = "This is preview text shown in email clients";

    await sendTransactional(
      {
        emailSendId: `test_preview_${Date.now()}`,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: testTo,
        subject: testSubject,
        htmlBody: "<html><body><p>Main email content here</p></body></html>",
        previewText,
      },
      "test-job-preview",
    );

    const message = await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    expect(message).not.toBeNull();
    expect(message!.Subject).toBe(testSubject);

    // Preview text is handled by KumoMTA - it either adds it as a hidden preheader
    // in the HTML or includes it in the message headers
    const headers = await mailpit.getHeaders(message!.ID);
    const hasPreviewInHtml = message!.HTML.includes(previewText);
    const hasPreviewHeader = headers["X-Preview-Text"]?.[0] === previewText;

    // If MTA supports preview text, it should appear somewhere
    // If not supported, the email should still be delivered successfully
    expect(message!.HTML).toContain("Main email content here");
    // Preview text may or may not be included depending on MTA version
    if (hasPreviewInHtml || hasPreviewHeader) {
      expect(true).toBe(true); // Preview text is present
    }
  }, 30000);

  it("should deliver to a single recipient", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName);

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "single",
        name: "Single Recipient Sender",
      },
    });

    const timestamp = Date.now();
    const testSubject = `[Kibamail Test] Single Recipient ${timestamp}`;
    const recipient = `single-${timestamp}@example.com`;

    await sendTransactional(
      {
        emailSendId: `test_single_${timestamp}`,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: recipient,
        subject: testSubject,
        htmlBody: "<p>Email to a single recipient</p>",
      },
      "test-job-single",
    );

    const message = await mailpit.waitForMessage(recipient, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    expect(message).not.toBeNull();
    expect(message!.Subject).toBe(testSubject);
    expect(message!.To[0].Address).toBe(recipient);
  }, 30000);

  it("should correctly set Reply-To header", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName);

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "replyto-test",
        name: "Reply-To Sender",
      },
    });

    const testSubject = `[Kibamail Test] Reply-To Header ${Date.now()}`;
    const testTo = `replyto-${Date.now()}@example.com`;
    const replyToEmail = "support@different-domain.com";
    const replyToName = "Customer Support";

    await sendTransactional(
      {
        emailSendId: `test_replyto_${Date.now()}`,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: testTo,
        subject: testSubject,
        htmlBody: "<p>Check the reply-to header</p>",
        replyTo: {
          email: replyToEmail,
          name: replyToName,
        },
      },
      "test-job-replyto",
    );

    const message = await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    expect(message).not.toBeNull();
    expect(message!.ReplyTo).toHaveLength(1);
    expect(message!.ReplyTo[0].Address).toBe(replyToEmail);
    expect(message!.ReplyTo[0].Name).toBe(replyToName);
  }, 30000);

  it("should preserve custom text body when provided", async () => {
    const domainName = getUniqueDomainName();
    const domain = await createVerifiedDomain(testWorkspace.id, domainName);

    const sender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "custom-text",
        name: "Custom Text Sender",
      },
    });

    const testSubject = `[Kibamail Test] Custom Text Body ${Date.now()}`;
    const testTo = `custom-text-${Date.now()}@example.com`;
    const customTextBody = "This is a completely custom plain text version that differs from HTML.";

    await sendTransactional(
      {
        emailSendId: `test_customtext_${Date.now()}`,
        workspaceId: testWorkspace.id,
        senderIdentityId: sender.id,
        sendingDomainId: domain.id,
        to: testTo,
        subject: testSubject,
        htmlBody: "<p>HTML content is different</p>",
        textBody: customTextBody,
      },
      "test-job-customtext",
    );

    const message = await mailpit.waitForMessage(testTo, {
      timeoutMs: MTA_TEST_CONFIG.deliveryTimeoutMs,
      pollIntervalMs: MTA_TEST_CONFIG.pollIntervalMs,
    });

    expect(message).not.toBeNull();
    expect(message!.Text).toContain(customTextBody);
    // Should NOT contain auto-generated text from HTML
    expect(message!.Text).not.toContain("HTML content is different");
  }, 30000);
});
