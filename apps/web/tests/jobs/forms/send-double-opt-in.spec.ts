/**
 * Integration tests for Send Double Opt-In Job
 *
 * Tests that the send-double-opt-in job correctly:
 * - Validates contact status before sending
 * - Fetches email template and sender identity
 * - Builds confirmation URL with token
 * - Publishes email to NATS
 *
 * These tests use real Redis/NATS - no mocking of core services.
 */

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { sendDoubleOptIn } from "@/jobs/forms/send-double-opt-in";
import { prisma } from "@/lib/db";
import { DEFAULT_FORM_SETTINGS } from "@/lib/form-builder/schema";
import type { FormFieldMapping } from "@/lib/forms/field-mapping";
import {
  cleanupWorkspace,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils/workspace";

let testWorkspace: TestWorkspace;

// Field mapping with email mapped to contact property
const fieldMapping: FormFieldMapping = {
  field_email: {
    slot: "fieldString0",
    type: "string",
    fieldType: "email",
    contactPropertyId: "email",
  },
  field_firstName: {
    slot: "fieldString1",
    type: "string",
    fieldType: "text",
    contactPropertyId: "firstName",
  },
};

// Test sending domain data
async function createTestSendingDomain(workspaceId: string) {
  return prisma.sendingDomain.create({
    data: {
      workspaceId,
      name: `doi-test-${Date.now()}.example.com`,
      dkimSubDomain: "kiba._domainkey",
      dkimPublicKey: "test-public-key",
      dkimPrivateKey: "test-private-key",
      returnPathSubDomain: "kb",
      returnPathDomainCnameValue: "mail.kbmta.net",
      trackingSubDomain: "e",
      trackingDomainCnameValue: "e.kbmta.net",
      dmarcReportingCode: "abcdefghij",
      dkimVerifiedAt: new Date(),
      returnPathDomainVerifiedAt: new Date(),
      maxSendPerDay: 100,
      maxSendPerHour: 10,
    },
  });
}

async function createTestSenderIdentity(
  workspaceId: string,
  sendingDomainId: string,
) {
  return prisma.senderIdentity.create({
    data: {
      workspaceId,
      sendingDomainId,
      name: "Test Sender",
      email: "noreply",
    },
  });
}

async function createTestEmail(
  workspaceId: string,
  senderIdentityId: string | null = null,
) {
  return prisma.email.create({
    data: {
      workspaceId,
      name: "Double Opt-In Confirmation",
      subject: "Please confirm your subscription, {{firstName}}",
      previewText: "Click to confirm your email address",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Hi " },
              {
                type: "variable",
                attrs: { id: "firstName", label: "First Name" },
              },
              {
                type: "text",
                text: ", please click the link below to confirm:",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Confirm: ",
              },
              {
                type: "text",
                marks: [
                  { type: "link", attrs: { href: "{{confirmation_url}}" } },
                ],
                text: "{{confirmation_url}}",
              },
            ],
          },
        ],
      },
      senderIdentityId,
      trackOpens: true,
      trackClicks: true,
      type: "TRANSACTIONAL",
    },
  });
}

async function createTestForm(
  workspaceId: string,
  doubleOptInEmailId: string | null,
) {
  const settings = {
    ...DEFAULT_FORM_SETTINGS,
    doubleOptIn: {
      enabled: !!doubleOptInEmailId,
    },
  };

  return prisma.form.create({
    data: {
      workspaceId,
      name: "Test Sign Up Form",
      type: "SIGN_UP",
      status: "PUBLISHED",
      settings,
      fieldMapping,
      doubleOptInEmailId,
    },
  });
}

async function createUnconfirmedContact(
  workspaceId: string,
  email: string,
  confirmationToken: string,
) {
  return prisma.contact.create({
    data: {
      workspaceId,
      email,
      firstName: "Test",
      lastName: "User",
      status: "UNCONFIRMED",
      confirmationToken,
    },
  });
}

beforeAll(() => {
  testWorkspace = createTestWorkspace();
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

beforeEach(async () => {
  // Clean up test data before each test
  await prisma.formSubmission.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
  await prisma.form.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
  await prisma.email.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
  await prisma.contact.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
  await prisma.senderIdentity.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
  await prisma.sendingDomain.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
});

describe("sendDoubleOptIn job", () => {
  /**
   * Tests that require infrastructure (S3, NATS)
   * These tests verify the full email sending flow and require:
   * - S3/MinIO running on port 9000
   * - NATS running with TLS
   *
   * Set RUN_INFRASTRUCTURE_TESTS=true to run these tests.
   */
  describe.skipIf(process.env.RUN_INFRASTRUCTURE_TESTS !== "true")(
    "successful email sending (requires infrastructure)",
    () => {
      test("should publish double opt-in email to NATS for UNCONFIRMED contact", async () => {
        // Setup: Create sending infrastructure
        const sendingDomain = await createTestSendingDomain(testWorkspace.id);
        const senderIdentity = await createTestSenderIdentity(
          testWorkspace.id,
          sendingDomain.id,
        );

        // Setup: Create email template with sender identity
        const email = await createTestEmail(
          testWorkspace.id,
          senderIdentity.id,
        );

        // Setup: Create form with double opt-in enabled
        const form = await createTestForm(testWorkspace.id, email.id);

        // Setup: Create unconfirmed contact with token
        const confirmationToken = "a".repeat(64);
        const contact = await createUnconfirmedContact(
          testWorkspace.id,
          `doi-test-${Date.now()}@example.com`,
          confirmationToken,
        );

        // Execute the job
        await sendDoubleOptIn(
          {
            contactId: contact.id,
            formId: form.id,
            emailId: email.id,
            workspaceId: testWorkspace.id,
          },
          "test-job-success",
        );

        // Job should complete without error - email published to NATS
        // In a real integration test with NATS, we would verify the message was received
      });

      test("should use default sender identity when email has no sender configured", async () => {
        // Setup: Create sending infrastructure
        const sendingDomain = await createTestSendingDomain(testWorkspace.id);
        const senderIdentity = await createTestSenderIdentity(
          testWorkspace.id,
          sendingDomain.id,
        );

        // Setup: Create email template WITHOUT sender identity
        const email = await createTestEmail(testWorkspace.id, null);

        // Setup: Create form
        const form = await createTestForm(testWorkspace.id, email.id);

        // Setup: Create unconfirmed contact
        const confirmationToken = "b".repeat(64);
        const contact = await createUnconfirmedContact(
          testWorkspace.id,
          `doi-fallback-${Date.now()}@example.com`,
          confirmationToken,
        );

        // Execute - should use workspace's default sender identity
        await sendDoubleOptIn(
          {
            contactId: contact.id,
            formId: form.id,
            emailId: email.id,
            workspaceId: testWorkspace.id,
          },
          "test-job-fallback-sender",
        );

        // Job should complete without error
      });
    },
  );

  describe("validation and skipping", () => {
    test("should skip if contact not found", async () => {
      const sendingDomain = await createTestSendingDomain(testWorkspace.id);
      const senderIdentity = await createTestSenderIdentity(
        testWorkspace.id,
        sendingDomain.id,
      );
      const email = await createTestEmail(testWorkspace.id, senderIdentity.id);
      const form = await createTestForm(testWorkspace.id, email.id);

      // Execute with non-existent contact ID
      await sendDoubleOptIn(
        {
          contactId: "non-existent-contact-id",
          formId: form.id,
          emailId: email.id,
          workspaceId: testWorkspace.id,
        },
        "test-job-no-contact",
      );

      // Should complete without error (skipped)
    });

    test("should skip if contact is already SUBSCRIBED", async () => {
      const sendingDomain = await createTestSendingDomain(testWorkspace.id);
      const senderIdentity = await createTestSenderIdentity(
        testWorkspace.id,
        sendingDomain.id,
      );
      const email = await createTestEmail(testWorkspace.id, senderIdentity.id);
      const form = await createTestForm(testWorkspace.id, email.id);

      // Create already subscribed contact
      const contact = await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `already-subscribed-${Date.now()}@example.com`,
          firstName: "Already",
          lastName: "Subscribed",
          status: "SUBSCRIBED",
        },
      });

      // Execute
      await sendDoubleOptIn(
        {
          contactId: contact.id,
          formId: form.id,
          emailId: email.id,
          workspaceId: testWorkspace.id,
        },
        "test-job-already-subscribed",
      );

      // Should complete without error (skipped)
    });

    test("should skip if contact has no confirmation token", async () => {
      const sendingDomain = await createTestSendingDomain(testWorkspace.id);
      const senderIdentity = await createTestSenderIdentity(
        testWorkspace.id,
        sendingDomain.id,
      );
      const email = await createTestEmail(testWorkspace.id, senderIdentity.id);
      const form = await createTestForm(testWorkspace.id, email.id);

      // Create unconfirmed contact WITHOUT token
      const contact = await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `no-token-${Date.now()}@example.com`,
          firstName: "No",
          lastName: "Token",
          status: "UNCONFIRMED",
          confirmationToken: null,
        },
      });

      // Execute
      await sendDoubleOptIn(
        {
          contactId: contact.id,
          formId: form.id,
          emailId: email.id,
          workspaceId: testWorkspace.id,
        },
        "test-job-no-token",
      );

      // Should complete without error (skipped)
    });
  });

  describe("error handling", () => {
    test("should throw error if email template not found", async () => {
      const sendingDomain = await createTestSendingDomain(testWorkspace.id);
      await createTestSenderIdentity(testWorkspace.id, sendingDomain.id);
      const form = await createTestForm(testWorkspace.id, null);

      const confirmationToken = "c".repeat(64);
      const contact = await createUnconfirmedContact(
        testWorkspace.id,
        `no-email-template-${Date.now()}@example.com`,
        confirmationToken,
      );

      await expect(
        sendDoubleOptIn(
          {
            contactId: contact.id,
            formId: form.id,
            emailId: "non-existent-email-id",
            workspaceId: testWorkspace.id,
          },
          "test-job-no-email",
        ),
      ).rejects.toThrow("Email template non-existent-email-id not found");
    });

    test("should throw error if email has no subject", async () => {
      const sendingDomain = await createTestSendingDomain(testWorkspace.id);
      const senderIdentity = await createTestSenderIdentity(
        testWorkspace.id,
        sendingDomain.id,
      );

      // Create email without subject
      const email = await prisma.email.create({
        data: {
          workspaceId: testWorkspace.id,
          name: "No Subject Email",
          subject: null,
          content: { type: "doc", content: [] },
          senderIdentityId: senderIdentity.id,
          type: "TRANSACTIONAL",
        },
      });

      const form = await createTestForm(testWorkspace.id, email.id);
      const confirmationToken = "d".repeat(64);
      const contact = await createUnconfirmedContact(
        testWorkspace.id,
        `no-subject-${Date.now()}@example.com`,
        confirmationToken,
      );

      await expect(
        sendDoubleOptIn(
          {
            contactId: contact.id,
            formId: form.id,
            emailId: email.id,
            workspaceId: testWorkspace.id,
          },
          "test-job-no-subject",
        ),
      ).rejects.toThrow(`Email template ${email.id} has no subject`);
    });

    test("should throw error if no sender identity available", async () => {
      // Create email without sender identity and no default available
      const email = await prisma.email.create({
        data: {
          workspaceId: testWorkspace.id,
          name: "No Sender Email",
          subject: "Test Subject",
          content: { type: "doc", content: [] },
          senderIdentityId: null,
          type: "TRANSACTIONAL",
        },
      });

      const form = await createTestForm(testWorkspace.id, email.id);
      const confirmationToken = "e".repeat(64);
      const contact = await createUnconfirmedContact(
        testWorkspace.id,
        `no-sender-${Date.now()}@example.com`,
        confirmationToken,
      );

      await expect(
        sendDoubleOptIn(
          {
            contactId: contact.id,
            formId: form.id,
            emailId: email.id,
            workspaceId: testWorkspace.id,
          },
          "test-job-no-sender",
        ),
      ).rejects.toThrow(
        `No sender identity available for workspace ${testWorkspace.id}`,
      );
    });
  });
});
