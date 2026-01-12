/**
 * Sandbox Email Integration Tests
 *
 * Comprehensive tests for the transactional email sandbox feature.
 * This allows developers to test email sending without actually delivering emails.
 *
 * Test Groups:
 * 1. API Endpoint Tests - Verify correct job dispatch based on recipient address
 * 2. Job Executor Tests - Verify sandbox event generation and side effects
 *
 * Run with: pnpm vitest run tests/jobs/emails/process-sandbox.spec.ts
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/(main)/api/v1/emails/send/route";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import { processSandbox } from "@/jobs/emails/process-sandbox";
import {
  cleanupWorkspace,
  createTestWorkspace,
  createFullAccessApiKey,
  post,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let apiKey: CreatedApiKey;
let testCounter = 0;

function getUniqueDomainName(): string {
  testCounter++;
  return `sandbox-test-${testCounter}-${Date.now()}.kibamail.xyz`;
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

async function getJobsByType(workspaceId: string, jobName: string, emailSendId?: string) {
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
    const matchJobName = job.name === jobName;
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
      (job.name === "process-sandbox" || job.name === "send-transactional"),
  );

  // Remove jobs gracefully, ignoring locked jobs
  await Promise.allSettled(testJobs.map((job) => job.remove()));
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  apiKey = await createFullAccessApiKey(testWorkspace.id);
}, 30000);

afterAll(async () => {
  await cleanupTestJobs(testWorkspace.id);
  await cleanupWorkspace(testWorkspace.id);
});

// Helper to create a partially verified domain (DKIM only, no return path)
async function createPartiallyVerifiedDomain(workspaceId: string, name: string) {
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
      returnPathDomainVerifiedAt: null, // NOT verified
      openTrackingEnabled: true,
      clickTrackingEnabled: true,
    },
  });
}

// Helper to create a domain with no verification at all
async function createUnverifiedDomain(workspaceId: string, name: string) {
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
      dkimVerifiedAt: null, // NOT verified
      returnPathDomainVerifiedAt: null, // NOT verified
      openTrackingEnabled: true,
      clickTrackingEnabled: true,
    },
  });
}

// ============================================================================
// GROUP 1: API ENDPOINT TESTS
// Verify that POST /api/v1/emails/send correctly dispatches jobs based on recipient
// ============================================================================

describe("Group 1: API Endpoint - Job Dispatch", () => {
  describe("Domain Verification", () => {
    it("should allow sandbox-only sends with partially verified domain (DKIM only)", async () => {
      const domainName = getUniqueDomainName();
      await createPartiallyVerifiedDomain(testWorkspace.id, domainName);

      const request = post(
        "/emails/send",
        {
          from: `info@${domainName}`,
          to: "delivered@kibamail.dev",
          subject: "Test Sandbox with Partial Domain",
          html: "<p>Test content</p>",
        },
        apiKey.key,
      );

      const response = await POST(request);
      expect(response.status).toBe(201);

      const responseData = await response.json();
      expect(responseData.sandbox).toBe(true);
    });

    it("should reject real recipients when return path is not verified", async () => {
      const domainName = getUniqueDomainName();
      await createPartiallyVerifiedDomain(testWorkspace.id, domainName);

      const request = post(
        "/emails/send",
        {
          from: `info@${domainName}`,
          to: "user@example.com",
          subject: "Test Real Recipient with Partial Domain",
          html: "<p>Test content</p>",
        },
        apiKey.key,
      );

      const response = await POST(request);
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData.error.code).toBe("SENDING_DOMAIN_NOT_VERIFIED");
      expect(responseData.error.message).toContain("return path");
    });

    it("should reject real recipients when DKIM is not verified", async () => {
      const domainName = getUniqueDomainName();
      await createUnverifiedDomain(testWorkspace.id, domainName);

      const request = post(
        "/emails/send",
        {
          from: `info@${domainName}`,
          to: "user@example.com",
          subject: "Test Real Recipient with Unverified Domain",
          html: "<p>Test content</p>",
        },
        apiKey.key,
      );

      const response = await POST(request);
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData.error.code).toBe("SENDING_DOMAIN_NOT_VERIFIED");
      expect(responseData.error.message).toContain("DKIM");
    });

    it("should allow sandbox sends even with completely unverified domain DKIM", async () => {
      const domainName = getUniqueDomainName();
      await createUnverifiedDomain(testWorkspace.id, domainName);

      const request = post(
        "/emails/send",
        {
          from: `info@${domainName}`,
          to: "delivered@kibamail.dev",
          subject: "Test Sandbox with Unverified Domain",
          html: "<p>Test content</p>",
        },
        apiKey.key,
      );

      // Sandbox sends don't require verification
      const response = await POST(request);
      expect(response.status).toBe(201);

      const responseData = await response.json();
      expect(responseData.sandbox).toBe(true);
    });

    it("should allow sandbox sends from any domain without domain setup", async () => {
      // No domain created at all - user can send from any "from" address
      const request = post(
        "/emails/send",
        {
          from: "hello@any-domain-that-does-not-exist.com",
          to: "delivered@kibamail.dev",
          subject: "Test Sandbox without Any Domain",
          html: "<p>Test content</p>",
        },
        apiKey.key,
      );

      const response = await POST(request);
      expect(response.status).toBe(201);

      const responseData = await response.json();
      expect(responseData.sandbox).toBe(true);

      // Verify job was created with the from email
      const jobs = await getJobsByType(testWorkspace.id, "process-sandbox", responseData.id);
      expect(jobs.length).toBe(1);
      expect(jobs[0].data.fromEmail).toBe("hello@any-domain-that-does-not-exist.com");
      expect(jobs[0].data.sendingDomainId).toBeUndefined();
      expect(jobs[0].data.senderIdentityId).toBeUndefined();
    });

    it("should reject mixed recipients (sandbox + real) when domain not fully verified", async () => {
      const domainName = getUniqueDomainName();
      await createPartiallyVerifiedDomain(testWorkspace.id, domainName);

      const request = post(
        "/emails/send",
        {
          from: `info@${domainName}`,
          to: [
            "delivered@kibamail.dev",
            "user@example.com", // This real recipient triggers full verification
          ],
          subject: "Test Mixed Recipients with Partial Domain",
          html: "<p>Test content</p>",
        },
        apiKey.key,
      );

      const response = await POST(request);
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData.error.code).toBe("SENDING_DOMAIN_NOT_VERIFIED");
    });

    it("should allow real recipients when domain is fully verified", async () => {
      const domainName = getUniqueDomainName();
      await createVerifiedDomain(testWorkspace.id, domainName);

      const request = post(
        "/emails/send",
        {
          from: `info@${domainName}`,
          to: "user@example.com",
          subject: "Test Real Recipient with Full Domain",
          html: "<p>Test content</p>",
        },
        apiKey.key,
      );

      const response = await POST(request);
      expect(response.status).toBe(201);

      const responseData = await response.json();
      expect(responseData.sandbox).toBe(false);
    });
  });

  describe("Sandbox Detection", () => {
    it("should dispatch process-sandbox job for delivered@kibamail.dev", async () => {
      const domainName = getUniqueDomainName();
      await createVerifiedDomain(testWorkspace.id, domainName);

      const request = post(
        "/emails/send",
        {
          from: `info@${domainName}`,
          to: "delivered@kibamail.dev",
          subject: "Test Sandbox Detection",
          html: "<p>Test content</p>",
        },
        apiKey.key,
      );

      const response = await POST(request);
      expect(response.status).toBe(201);

      const responseData = await response.json();
      expect(responseData.id).toBeDefined();
      expect(responseData.sandbox).toBe(true);

      const sandboxJobs = await getJobsByType(testWorkspace.id, "process-sandbox", responseData.id);
      expect(sandboxJobs.length).toBe(1);
      expect(sandboxJobs[0].data.sandboxOutcome).toBe("delivered");
      expect(sandboxJobs[0].data.sandboxLabel).toBeNull();

      // Verify no send-transactional job was created
      const transactionalJobs = await getJobsByType(testWorkspace.id, "send-transactional", responseData.id);
      expect(transactionalJobs.length).toBe(0);
    });

    it("should dispatch send-transactional job for regular email addresses", async () => {
      const domainName = getUniqueDomainName();
      await createVerifiedDomain(testWorkspace.id, domainName);

      const request = post(
        "/emails/send",
        {
          from: `info@${domainName}`,
          to: "user@example.com",
          subject: "Test Regular Email",
          html: "<p>Test content</p>",
        },
        apiKey.key,
      );

      const response = await POST(request);
      expect(response.status).toBe(201);

      const responseData = await response.json();
      expect(responseData.id).toBeDefined();
      expect(responseData.sandbox).toBe(false);

      // Verify send-transactional job was created
      const transactionalJobs = await getJobsByType(testWorkspace.id, "send-transactional", responseData.id);
      expect(transactionalJobs.length).toBe(1);

      // Verify no sandbox job was created
      const sandboxJobs = await getJobsByType(testWorkspace.id, "process-sandbox", responseData.id);
      expect(sandboxJobs.length).toBe(0);
    });

    it("should be case-insensitive for @kibamail.dev domain", async () => {
      const domainName = getUniqueDomainName();
      await createVerifiedDomain(testWorkspace.id, domainName);

      const testCases = [
        "delivered@KIBAMAIL.DEV",
        "delivered@Kibamail.Dev",
        "delivered@KibaMail.DEV",
      ];

      for (const recipient of testCases) {
        const request = post(
          "/emails/send",
          {
            from: `info@${domainName}`,
            to: recipient,
            subject: "Test Case Insensitivity",
            html: "<p>Test</p>",
          },
          apiKey.key,
        );

        const response = await POST(request);
        expect(response.status).toBe(201);

        const responseData = await response.json();
        expect(responseData.sandbox).toBe(true);
      }
    });
  });

  describe("Sandbox Outcome Parsing", () => {
    const testCases = [
      { recipient: "delivered@kibamail.dev", expectedOutcome: "delivered" },
      { recipient: "bounced@kibamail.dev", expectedOutcome: "bounced" },
      { recipient: "softbounce@kibamail.dev", expectedOutcome: "softbounce" },
      { recipient: "complained@kibamail.dev", expectedOutcome: "complained" },
      { recipient: "failed@kibamail.dev", expectedOutcome: "failed" },
      { recipient: "delayed@kibamail.dev", expectedOutcome: "delayed" },
      { recipient: "opened@kibamail.dev", expectedOutcome: "opened" },
      { recipient: "clicked@kibamail.dev", expectedOutcome: "clicked" },
    ];

    it.each(testCases)(
      "should parse outcome '$expectedOutcome' from $recipient",
      async ({ recipient, expectedOutcome }) => {
        const domainName = getUniqueDomainName();
        await createVerifiedDomain(testWorkspace.id, domainName);

        const request = post(
          "/emails/send",
          {
            from: `info@${domainName}`,
            to: recipient,
            subject: `Test ${expectedOutcome}`,
            html: "<p>Test</p>",
          },
          apiKey.key,
        );

        const response = await POST(request);
        expect(response.status).toBe(201);

        const responseData = await response.json();
        const jobs = await getJobsByType(testWorkspace.id, "process-sandbox", responseData.id);

        expect(jobs.length).toBe(1);
        expect(jobs[0].data.sandboxOutcome).toBe(expectedOutcome);
      },
    );
  });

  describe("Label Parsing", () => {
    it("should parse label from +label syntax", async () => {
      const domainName = getUniqueDomainName();
      await createVerifiedDomain(testWorkspace.id, domainName);

      const request = post(
        "/emails/send",
        {
          from: `info@${domainName}`,
          to: "delivered+signup-flow@kibamail.dev",
          subject: "Test Label Parsing",
          html: "<p>Test</p>",
        },
        apiKey.key,
      );

      const response = await POST(request);
      expect(response.status).toBe(201);

      const responseData = await response.json();
      const jobs = await getJobsByType(testWorkspace.id, "process-sandbox", responseData.id);

      expect(jobs[0].data.sandboxOutcome).toBe("delivered");
      expect(jobs[0].data.sandboxLabel).toBe("signup-flow");
    });

    it("should handle complex labels with multiple hyphens", async () => {
      const domainName = getUniqueDomainName();
      await createVerifiedDomain(testWorkspace.id, domainName);

      const request = post(
        "/emails/send",
        {
          from: `info@${domainName}`,
          to: "bounced+password-reset-flow-v2@kibamail.dev",
          subject: "Test Complex Label",
          html: "<p>Test</p>",
        },
        apiKey.key,
      );

      const response = await POST(request);
      const responseData = await response.json();
      const jobs = await getJobsByType(testWorkspace.id, "process-sandbox", responseData.id);

      expect(jobs[0].data.sandboxOutcome).toBe("bounced");
      expect(jobs[0].data.sandboxLabel).toBe("password-reset-flow-v2");
    });

    it("should set label to null when no + is present", async () => {
      const domainName = getUniqueDomainName();
      await createVerifiedDomain(testWorkspace.id, domainName);

      const request = post(
        "/emails/send",
        {
          from: `info@${domainName}`,
          to: "delivered@kibamail.dev",
          subject: "Test No Label",
          html: "<p>Test</p>",
        },
        apiKey.key,
      );

      const response = await POST(request);
      const responseData = await response.json();
      const jobs = await getJobsByType(testWorkspace.id, "process-sandbox", responseData.id);

      expect(jobs[0].data.sandboxLabel).toBeNull();
    });
  });

  describe("Multiple Recipients", () => {
    it("should return array response with sandbox flag per recipient", async () => {
      const domainName = getUniqueDomainName();
      await createVerifiedDomain(testWorkspace.id, domainName);

      const request = post(
        "/emails/send",
        {
          from: `info@${domainName}`,
          to: [
            "delivered@kibamail.dev",
            "user@example.com",
            "bounced@kibamail.dev",
          ],
          subject: "Test Multiple Recipients",
          html: "<p>Test</p>",
        },
        apiKey.key,
      );

      const response = await POST(request);
      expect(response.status).toBe(201);

      const responseData = await response.json();
      expect(responseData.emails).toHaveLength(3);

      // First recipient - sandbox
      expect(responseData.emails[0].recipient).toBe("delivered@kibamail.dev");
      expect(responseData.emails[0].sandbox).toBe(true);

      // Second recipient - real
      expect(responseData.emails[1].recipient).toBe("user@example.com");
      expect(responseData.emails[1].sandbox).toBe(false);

      // Third recipient - sandbox
      expect(responseData.emails[2].recipient).toBe("bounced@kibamail.dev");
      expect(responseData.emails[2].sandbox).toBe(true);
    });

    it("should dispatch correct job types for mixed recipients", async () => {
      const domainName = getUniqueDomainName();
      await createVerifiedDomain(testWorkspace.id, domainName);

      const request = post(
        "/emails/send",
        {
          from: `info@${domainName}`,
          to: [
            "delivered@kibamail.dev",
            "real@example.com",
          ],
          subject: "Test Mixed Recipients",
          html: "<p>Test</p>",
        },
        apiKey.key,
      );

      const response = await POST(request);
      const responseData = await response.json();

      // Get all sandbox jobs for this workspace
      const sandboxJobs = await getJobsByType(testWorkspace.id, "process-sandbox");
      const transactionalJobs = await getJobsByType(testWorkspace.id, "send-transactional");

      // Find jobs for these specific emails
      const sandboxJob = sandboxJobs.find((j) => j.data.emailSendId === responseData.emails[0].id);
      const transactionalJob = transactionalJobs.find((j) => j.data.emailSendId === responseData.emails[1].id);

      expect(sandboxJob).toBeDefined();
      expect(transactionalJob).toBeDefined();
    });
  });

  describe("Job Data Integrity", () => {
    it("should include all required fields in sandbox job data", async () => {
      const domainName = getUniqueDomainName();
      const domain = await createVerifiedDomain(testWorkspace.id, domainName);

      const request = post(
        "/emails/send",
        {
          from: `info@${domainName}`,
          to: "delivered@kibamail.dev",
          subject: "Test Data Integrity",
          html: "<h1>Hello</h1><p>World</p>",
          text: "Hello World",
          replyTo: { email: "support@example.com", name: "Support" },
          metadata: { orderId: "12345", campaign: "welcome" },
          previewText: "This is preview text",
        },
        apiKey.key,
      );

      const response = await POST(request);
      const responseData = await response.json();
      const jobs = await getJobsByType(testWorkspace.id, "process-sandbox", responseData.id);

      const jobData = jobs[0].data;

      expect(jobData.emailSendId).toBe(responseData.id);
      expect(jobData.workspaceId).toBe(testWorkspace.id);
      expect(jobData.sendingDomainId).toBe(domain.id);
      expect(jobData.recipient).toBe("delivered@kibamail.dev");
      expect(jobData.sandboxOutcome).toBe("delivered");
      expect(jobData.subject).toBe("Test Data Integrity");
      expect(jobData.htmlBody).toBe("<h1>Hello</h1><p>World</p>");
      expect(jobData.textBody).toBe("Hello World");
      expect(jobData.previewText).toBe("This is preview text");
      expect(jobData.replyTo).toEqual({ email: "support@example.com", name: "Support" });
      expect(jobData.metadata).toEqual({ orderId: "12345", campaign: "welcome" });
    });

    it("should default replyTo to sender details when not provided", async () => {
      const domainName = getUniqueDomainName();
      await createVerifiedDomain(testWorkspace.id, domainName);

      const request = post(
        "/emails/send",
        {
          from: `notifications@${domainName}`,
          to: "delivered@kibamail.dev",
          subject: "Test Default ReplyTo",
          html: "<p>Test</p>",
          // No replyTo provided
        },
        apiKey.key,
      );

      const response = await POST(request);
      const responseData = await response.json();
      const jobs = await getJobsByType(testWorkspace.id, "process-sandbox", responseData.id);

      const jobData = jobs[0].data;

      // replyTo should default to the from email
      expect(jobData.replyTo.email).toBe(`notifications@${domainName}`);
      // Name should be from senderIdentity (auto-created as "Transactional Sender")
      expect(jobData.replyTo.name).toBe("Transactional Sender");
    });

    it("should default replyTo to from email for sandbox without domain", async () => {
      // No domain setup - pure sandbox test
      const request = post(
        "/emails/send",
        {
          from: "hello@any-domain.com",
          to: "delivered@kibamail.dev",
          subject: "Test Default ReplyTo No Domain",
          html: "<p>Test</p>",
          // No replyTo provided
        },
        apiKey.key,
      );

      const response = await POST(request);
      const responseData = await response.json();
      const jobs = await getJobsByType(testWorkspace.id, "process-sandbox", responseData.id);

      const jobData = jobs[0].data;

      // replyTo should default to the from email
      expect(jobData.replyTo.email).toBe("hello@any-domain.com");
      // Name should be the local part of the email (no senderIdentity exists)
      expect(jobData.replyTo.name).toBe("hello");
    });
  });
});

// ============================================================================
// GROUP 2: JOB EXECUTOR TESTS
// Verify that processSandbox job correctly generates events and updates records
// ============================================================================

describe("Group 2: Job Executor - Event Generation", () => {
  let testDomain: Awaited<ReturnType<typeof createVerifiedDomain>>;
  let testSender: Awaited<ReturnType<typeof prisma.senderIdentity.create>>;

  beforeEach(async () => {
    const domainName = getUniqueDomainName();
    testDomain = await createVerifiedDomain(testWorkspace.id, domainName);
    testSender = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        sendingDomainId: testDomain.id,
        email: "test-sender",
        name: "Test Sender",
      },
    });
  });

  describe("delivered@kibamail.dev", () => {
    it("should generate Queued → Reception → Delivery events", async () => {
      const emailSendId = `sandbox_delivered_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "delivered@kibamail.dev",
          sandboxOutcome: "delivered",
          sandboxLabel: null,
          subject: "Test Delivered",
          htmlBody: "<p>Test</p>",
        },
        "test-job-delivered",
      );

      const events = await prisma.event.findMany({
        where: { sendingId: emailSendId },
        orderBy: { createdAt: "asc" },
      });

      expect(events).toHaveLength(3);
      expect(events.map((e) => e.type)).toEqual(["Queued", "Reception", "Delivery"]);

      // Verify event timing (events should be in chronological order)
      for (let i = 1; i < events.length; i++) {
        expect(events[i].createdAt.getTime()).toBeGreaterThan(events[i - 1].createdAt.getTime());
      }
    });

    it("should set TransactionalEmail status to DELIVERED", async () => {
      const emailSendId = `sandbox_delivered_status_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "delivered@kibamail.dev",
          sandboxOutcome: "delivered",
          sandboxLabel: null,
          subject: "Test Status",
          htmlBody: "<p>Test</p>",
        },
        "test-job-delivered-status",
      );

      const email = await prisma.transactionalEmail.findUnique({
        where: { sendingId: emailSendId },
      });

      expect(email).not.toBeNull();
      expect(email!.status).toBe("DELIVERED");
      expect(email!.deliveredAt).not.toBeNull();
    });

    it("should include correct response codes in Delivery event", async () => {
      const emailSendId = `sandbox_delivered_response_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "delivered@kibamail.dev",
          sandboxOutcome: "delivered",
          sandboxLabel: null,
          subject: "Test Response",
          htmlBody: "<p>Test</p>",
        },
        "test-job-delivered-response",
      );

      const deliveryEvent = await prisma.event.findFirst({
        where: { sendingId: emailSendId, type: "Delivery" },
      });

      expect(deliveryEvent!.responseCode).toBe(250);
      expect(deliveryEvent!.responseContent).toBe("OK");
    });
  });

  describe("bounced@kibamail.dev", () => {
    it("should generate Queued → Reception → Bounce events", async () => {
      const emailSendId = `sandbox_bounced_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "bounced@kibamail.dev",
          sandboxOutcome: "bounced",
          sandboxLabel: null,
          subject: "Test Bounced",
          htmlBody: "<p>Test</p>",
        },
        "test-job-bounced",
      );

      const events = await prisma.event.findMany({
        where: { sendingId: emailSendId },
        orderBy: { createdAt: "asc" },
      });

      expect(events).toHaveLength(3);
      expect(events.map((e) => e.type)).toEqual(["Queued", "Reception", "Bounce"]);
    });

    it("should set TransactionalEmail status to BOUNCED", async () => {
      const emailSendId = `sandbox_bounced_status_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "bounced@kibamail.dev",
          sandboxOutcome: "bounced",
          sandboxLabel: null,
          subject: "Test Status",
          htmlBody: "<p>Test</p>",
        },
        "test-job-bounced-status",
      );

      const email = await prisma.transactionalEmail.findUnique({
        where: { sendingId: emailSendId },
      });

      expect(email!.status).toBe("BOUNCED");
      expect(email!.bouncedAt).not.toBeNull();
      expect(email!.bounceClassification).toBe("InvalidRecipient");
    });

    it("should include bounce classification in Bounce event", async () => {
      const emailSendId = `sandbox_bounced_classification_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "bounced@kibamail.dev",
          sandboxOutcome: "bounced",
          sandboxLabel: null,
          subject: "Test Classification",
          htmlBody: "<p>Test</p>",
        },
        "test-job-bounced-classification",
      );

      const bounceEvent = await prisma.event.findFirst({
        where: { sendingId: emailSendId, type: "Bounce" },
      });

      expect(bounceEvent!.bounceClassification).toBe("InvalidRecipient");
      expect(bounceEvent!.responseCode).toBe(550);
      expect(bounceEvent!.responseContent).toBe("User unknown");
    });

    it("should create suppression entry for hard bounce", async () => {
      const emailSendId = `sandbox_bounced_suppression_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "bounced@kibamail.dev",
          sandboxOutcome: "bounced",
          sandboxLabel: null,
          subject: "Test Suppression",
          htmlBody: "<p>Test</p>",
        },
        "test-job-bounced-suppression",
      );

      const suppression = await prisma.suppressionList.findFirst({
        where: {
          workspaceId: testWorkspace.id,
          email: "bounced@kibamail.dev",
          reason: "BOUNCED",
        },
      });

      expect(suppression).not.toBeNull();
    });
  });

  describe("softbounce@kibamail.dev", () => {
    it("should generate Queued → Reception → TransientFailure events", async () => {
      const emailSendId = `sandbox_softbounce_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "softbounce@kibamail.dev",
          sandboxOutcome: "softbounce",
          sandboxLabel: null,
          subject: "Test Soft Bounce",
          htmlBody: "<p>Test</p>",
        },
        "test-job-softbounce",
      );

      const events = await prisma.event.findMany({
        where: { sendingId: emailSendId },
        orderBy: { createdAt: "asc" },
      });

      expect(events).toHaveLength(3);
      expect(events.map((e) => e.type)).toEqual(["Queued", "Reception", "TransientFailure"]);
    });

    it("should NOT update TransactionalEmail status for soft bounce (stays SENDING)", async () => {
      const emailSendId = `sandbox_softbounce_status_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "softbounce@kibamail.dev",
          sandboxOutcome: "softbounce",
          sandboxLabel: null,
          subject: "Test Status",
          htmlBody: "<p>Test</p>",
        },
        "test-job-softbounce-status",
      );

      const email = await prisma.transactionalEmail.findUnique({
        where: { sendingId: emailSendId },
      });

      // Soft bounces don't change status to BOUNCED (only hard bounces do)
      expect(email!.status).toBe("SENDING");
    });
  });

  describe("complained@kibamail.dev", () => {
    it("should generate Queued → Reception → Delivery → Feedback events", async () => {
      const emailSendId = `sandbox_complained_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "complained@kibamail.dev",
          sandboxOutcome: "complained",
          sandboxLabel: null,
          subject: "Test Complained",
          htmlBody: "<p>Test</p>",
        },
        "test-job-complained",
      );

      const events = await prisma.event.findMany({
        where: { sendingId: emailSendId },
        orderBy: { createdAt: "asc" },
      });

      expect(events).toHaveLength(4);
      expect(events.map((e) => e.type)).toEqual(["Queued", "Reception", "Delivery", "Feedback"]);
    });

    it("should set TransactionalEmail status to COMPLAINED", async () => {
      const emailSendId = `sandbox_complained_status_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "complained@kibamail.dev",
          sandboxOutcome: "complained",
          sandboxLabel: null,
          subject: "Test Status",
          htmlBody: "<p>Test</p>",
        },
        "test-job-complained-status",
      );

      const email = await prisma.transactionalEmail.findUnique({
        where: { sendingId: emailSendId },
      });

      expect(email!.status).toBe("COMPLAINED");
      expect(email!.complainedAt).not.toBeNull();
    });

    it("should create suppression entry for complaint", async () => {
      const emailSendId = `sandbox_complained_suppression_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "complained@kibamail.dev",
          sandboxOutcome: "complained",
          sandboxLabel: null,
          subject: "Test Suppression",
          htmlBody: "<p>Test</p>",
        },
        "test-job-complained-suppression",
      );

      const suppression = await prisma.suppressionList.findFirst({
        where: {
          workspaceId: testWorkspace.id,
          email: "complained@kibamail.dev",
          reason: "COMPLAINED",
        },
      });

      expect(suppression).not.toBeNull();
    });
  });

  describe("failed@kibamail.dev", () => {
    it("should generate Queued → Rejection events", async () => {
      const emailSendId = `sandbox_failed_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "failed@kibamail.dev",
          sandboxOutcome: "failed",
          sandboxLabel: null,
          subject: "Test Failed",
          htmlBody: "<p>Test</p>",
        },
        "test-job-failed",
      );

      const events = await prisma.event.findMany({
        where: { sendingId: emailSendId },
        orderBy: { createdAt: "asc" },
      });

      expect(events).toHaveLength(2);
      expect(events.map((e) => e.type)).toEqual(["Queued", "Rejection"]);
    });

    it("should set TransactionalEmail status to FAILED", async () => {
      const emailSendId = `sandbox_failed_status_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "failed@kibamail.dev",
          sandboxOutcome: "failed",
          sandboxLabel: null,
          subject: "Test Status",
          htmlBody: "<p>Test</p>",
        },
        "test-job-failed-status",
      );

      const email = await prisma.transactionalEmail.findUnique({
        where: { sendingId: emailSendId },
      });

      expect(email!.status).toBe("FAILED");
    });
  });

  describe("delayed@kibamail.dev", () => {
    it("should generate Queued → Reception → TransientFailure → TransientFailure → Delivery events", async () => {
      const emailSendId = `sandbox_delayed_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "delayed@kibamail.dev",
          sandboxOutcome: "delayed",
          sandboxLabel: null,
          subject: "Test Delayed",
          htmlBody: "<p>Test</p>",
        },
        "test-job-delayed",
      );

      const events = await prisma.event.findMany({
        where: { sendingId: emailSendId },
        orderBy: { createdAt: "asc" },
      });

      expect(events).toHaveLength(5);
      expect(events.map((e) => e.type)).toEqual([
        "Queued",
        "Reception",
        "TransientFailure",
        "TransientFailure",
        "Delivery",
      ]);
    });

    it("should eventually set TransactionalEmail status to DELIVERED", async () => {
      const emailSendId = `sandbox_delayed_status_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "delayed@kibamail.dev",
          sandboxOutcome: "delayed",
          sandboxLabel: null,
          subject: "Test Status",
          htmlBody: "<p>Test</p>",
        },
        "test-job-delayed-status",
      );

      const email = await prisma.transactionalEmail.findUnique({
        where: { sendingId: emailSendId },
      });

      expect(email!.status).toBe("DELIVERED");
    });
  });

  describe("opened@kibamail.dev", () => {
    it("should generate Queued → Reception → Delivery → Open events", async () => {
      const emailSendId = `sandbox_opened_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "opened@kibamail.dev",
          sandboxOutcome: "opened",
          sandboxLabel: null,
          subject: "Test Opened",
          htmlBody: "<p>Test</p>",
        },
        "test-job-opened",
      );

      const events = await prisma.event.findMany({
        where: { sendingId: emailSendId },
        orderBy: { createdAt: "asc" },
      });

      expect(events).toHaveLength(4);
      expect(events.map((e) => e.type)).toEqual(["Queued", "Reception", "Delivery", "Open"]);
    });

    it("should increment openCount and set firstOpenedAt", async () => {
      const emailSendId = `sandbox_opened_counters_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "opened@kibamail.dev",
          sandboxOutcome: "opened",
          sandboxLabel: null,
          subject: "Test Counters",
          htmlBody: "<p>Test</p>",
        },
        "test-job-opened-counters",
      );

      const email = await prisma.transactionalEmail.findUnique({
        where: { sendingId: emailSendId },
      });

      expect(email!.openCount).toBe(1);
      expect(email!.firstOpenedAt).not.toBeNull();
    });
  });

  describe("clicked@kibamail.dev", () => {
    it("should generate Queued → Reception → Delivery → Open → Click events", async () => {
      const emailSendId = `sandbox_clicked_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "clicked@kibamail.dev",
          sandboxOutcome: "clicked",
          sandboxLabel: null,
          subject: "Test Clicked",
          htmlBody: "<p>Test</p>",
        },
        "test-job-clicked",
      );

      const events = await prisma.event.findMany({
        where: { sendingId: emailSendId },
        orderBy: { createdAt: "asc" },
      });

      expect(events).toHaveLength(5);
      expect(events.map((e) => e.type)).toEqual(["Queued", "Reception", "Delivery", "Open", "Click"]);
    });

    it("should increment both openCount and clickCount", async () => {
      const emailSendId = `sandbox_clicked_counters_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "clicked@kibamail.dev",
          sandboxOutcome: "clicked",
          sandboxLabel: null,
          subject: "Test Counters",
          htmlBody: "<p>Test</p>",
        },
        "test-job-clicked-counters",
      );

      const email = await prisma.transactionalEmail.findUnique({
        where: { sendingId: emailSendId },
      });

      expect(email!.openCount).toBe(1);
      expect(email!.clickCount).toBe(1);
      expect(email!.firstOpenedAt).not.toBeNull();
      expect(email!.firstClickedAt).not.toBeNull();
    });
  });

  describe("Unknown Outcome (Fallback)", () => {
    it("should default to delivered sequence for unknown outcomes", async () => {
      const emailSendId = `sandbox_unknown_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "random-outcome@kibamail.dev",
          sandboxOutcome: "random-outcome",
          sandboxLabel: null,
          subject: "Test Unknown",
          htmlBody: "<p>Test</p>",
        },
        "test-job-unknown",
      );

      const events = await prisma.event.findMany({
        where: { sendingId: emailSendId },
        orderBy: { createdAt: "asc" },
      });

      expect(events).toHaveLength(3);
      expect(events.map((e) => e.type)).toEqual(["Queued", "Reception", "Delivery"]);
    });
  });

  describe("TransactionalEmail Record Creation", () => {
    it("should create TransactionalEmail record with correct fields", async () => {
      const emailSendId = `sandbox_record_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "delivered@kibamail.dev",
          sandboxOutcome: "delivered",
          sandboxLabel: "test-label",
          subject: "Test Subject",
          previewText: "Preview text here",
          htmlBody: "<p>HTML Body</p>",
          textBody: "Text Body",
          replyTo: { email: "reply@example.com", name: "Reply Handler" },
          metadata: { key1: "value1", key2: "value2" },
        },
        "test-job-record",
      );

      const email = await prisma.transactionalEmail.findUnique({
        where: { sendingId: emailSendId },
      });

      expect(email).not.toBeNull();
      expect(email!.workspaceId).toBe(testWorkspace.id);
      expect(email!.sendingDomainId).toBe(testDomain.id);
      expect(email!.senderIdentityId).toBe(testSender.id);
      expect(email!.toEmail).toBe("delivered@kibamail.dev");
      expect(email!.subject).toBe("Test Subject");
      expect(email!.previewText).toBe("Preview text here");
      expect(email!.fromEmail).toBe(`test-sender@${testDomain.name}`);
      expect(email!.fromName).toBe("Test Sender");
      expect(email!.replyToEmail).toBe("reply@example.com");
      expect(email!.replyToName).toBe("Reply Handler");
      expect(email!.metadata).toEqual({ key1: "value1", key2: "value2" });
      expect(email!.htmlContentS3Key).toContain(emailSendId);
      expect(email!.textContentS3Key).toContain(emailSendId);
      expect(email!.sentAt).not.toBeNull();
    });

    it("should set tracking flags to false for sandbox emails", async () => {
      const emailSendId = `sandbox_tracking_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "delivered@kibamail.dev",
          sandboxOutcome: "delivered",
          sandboxLabel: null,
          subject: "Test Tracking",
          htmlBody: "<p>Test</p>",
        },
        "test-job-tracking",
      );

      const email = await prisma.transactionalEmail.findUnique({
        where: { sendingId: emailSendId },
      });

      // Sandbox emails don't need real tracking
      expect(email!.openTrackingEnabled).toBe(false);
      expect(email!.clickTrackingEnabled).toBe(false);
    });
  });

  describe("Event Metadata", () => {
    it("should set nodeId to 'sandbox' for all events", async () => {
      const emailSendId = `sandbox_nodeid_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "delivered@kibamail.dev",
          sandboxOutcome: "delivered",
          sandboxLabel: null,
          subject: "Test NodeId",
          htmlBody: "<p>Test</p>",
        },
        "test-job-nodeid",
      );

      const events = await prisma.event.findMany({
        where: { sendingId: emailSendId },
      });

      for (const event of events) {
        expect(event.nodeId).toBe("sandbox");
      }
    });

    it("should set queue to 'sandbox' for Queued event", async () => {
      const emailSendId = `sandbox_queue_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "delivered@kibamail.dev",
          sandboxOutcome: "delivered",
          sandboxLabel: null,
          subject: "Test Queue",
          htmlBody: "<p>Test</p>",
        },
        "test-job-queue",
      );

      const queuedEvent = await prisma.event.findFirst({
        where: { sendingId: emailSendId, type: "Queued" },
      });

      expect(queuedEvent!.queue).toBe("sandbox");
      expect(queuedEvent!.siteName).toBe("sandbox");
    });

    it("should include correct S3 key in Queued event", async () => {
      const emailSendId = `sandbox_s3key_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          senderIdentityId: testSender.id,
          sendingDomainId: testDomain.id,
          fromEmail: `test-sender@${testDomain.name}`,
          fromName: "Test Sender",
          recipient: "delivered@kibamail.dev",
          sandboxOutcome: "delivered",
          sandboxLabel: null,
          subject: "Test S3 Key",
          htmlBody: "<p>Test</p>",
        },
        "test-job-s3key",
      );

      const queuedEvent = await prisma.event.findFirst({
        where: { sendingId: emailSendId, type: "Queued" },
      });

      expect(queuedEvent!.contentS3Key).toBe(
        `emails/${testWorkspace.id}/transactional/${emailSendId}/html`,
      );
    });
  });

  describe("Sandbox without Domain Configuration", () => {
    it("should work without sendingDomainId or senderIdentityId", async () => {
      const emailSendId = `sandbox_no_domain_${Date.now()}`;

      // Call processSandbox without domain/identity - simulates user with no domain setup
      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          // No senderIdentityId
          // No sendingDomainId
          fromEmail: "hello@any-random-domain.com",
          fromName: "Random Sender",
          recipient: "delivered@kibamail.dev",
          sandboxOutcome: "delivered",
          sandboxLabel: null,
          subject: "Test No Domain",
          htmlBody: "<p>Test without domain</p>",
        },
        "test-job-no-domain",
      );

      // Should create events
      const events = await prisma.event.findMany({
        where: { sendingId: emailSendId },
        orderBy: { createdAt: "asc" },
      });

      expect(events).toHaveLength(3);
      expect(events.map((e) => e.type)).toEqual(["Queued", "Reception", "Delivery"]);

      // Should create TransactionalEmail with fromEmail
      const email = await prisma.transactionalEmail.findUnique({
        where: { sendingId: emailSendId },
      });

      expect(email).not.toBeNull();
      expect(email!.fromEmail).toBe("hello@any-random-domain.com");
      expect(email!.fromName).toBe("Random Sender");
      expect(email!.sendingDomainId).toBeNull();
      expect(email!.senderIdentityId).toBeNull();
      expect(email!.status).toBe("DELIVERED");
    });

    it("should use fromEmail local part as fromName if fromName not provided", async () => {
      const emailSendId = `sandbox_no_fromname_${Date.now()}`;

      await processSandbox(
        {
          emailSendId,
          workspaceId: testWorkspace.id,
          fromEmail: "support@example.com",
          // No fromName
          recipient: "delivered@kibamail.dev",
          sandboxOutcome: "delivered",
          sandboxLabel: null,
          subject: "Test No FromName",
          htmlBody: "<p>Test</p>",
        },
        "test-job-no-fromname",
      );

      const email = await prisma.transactionalEmail.findUnique({
        where: { sendingId: emailSendId },
      });

      expect(email!.fromEmail).toBe("support@example.com");
      // fromName should be undefined/null when not provided
      expect(email!.fromName).toBeNull();
    });
  });
});
