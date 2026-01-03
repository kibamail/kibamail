/**
 * Integration tests for Double Opt-In Form Submission Flow
 *
 * Tests the handleSignUpSubmission function with double opt-in configuration.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import type { FormFieldMapping } from "@/lib/forms/field-mapping";
import {
  type DoubleOptInConfig,
  handleSignUpSubmission,
} from "@/lib/forms/submission-handlers";
import { DEFAULT_FORM_SETTINGS } from "@/tests/utils/form-fixtures";
import {
  cleanupWorkspace,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils/workspace";

let testWorkspace: TestWorkspace;

// Field mapping with email and firstName mapped to contact properties
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

// Helper to create a test email template
async function createTestEmail(workspaceId: string) {
  return prisma.email.create({
    data: {
      workspaceId,
      name: "Test Double Opt-In Email",
      subject: "Confirm your subscription",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Please confirm your email" }],
          },
        ],
      },
      type: "TRANSACTIONAL",
    },
  });
}

// Helper to create a test form with double opt-in settings
async function createTestForm(
  workspaceId: string,
  doubleOptInEmailId?: string | null,
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

beforeAll(() => {
  testWorkspace = createTestWorkspace();
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

beforeEach(async () => {
  // Clean up contacts and emails before each test
  await prisma.contact.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
  await prisma.email.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
  await prisma.formSubmission.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
  await prisma.form.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
});

describe("handleSignUpSubmission with double opt-in", () => {
  it("should create a SUBSCRIBED contact when double opt-in is disabled", async () => {
    const form = await createTestForm(testWorkspace.id, null);

    const rawData = {
      field_email: "test@example.com",
      field_firstName: "John",
    };

    const doubleOptIn: DoubleOptInConfig = {
      enabled: false,
      emailId: null,
    };

    await handleSignUpSubmission(
      testWorkspace.id,
      form.id,
      rawData,
      fieldMapping,
      {
        ipAddress: "127.0.0.1",
        userAgent: "Test Agent",
        referrerUrl: null,
      },
      doubleOptIn,
    );

    // Verify contact was created with SUBSCRIBED status (default)
    const contact = await prisma.contact.findFirst({
      where: {
        workspaceId: testWorkspace.id,
        email: "test@example.com",
      },
    });

    expect(contact).not.toBeNull();
    expect(contact?.status).toBe("SUBSCRIBED");
    expect(contact?.confirmationToken).toBeNull();
  });

  it("should create an UNCONFIRMED contact with token when double opt-in is enabled", async () => {
    const email = await createTestEmail(testWorkspace.id);
    const form = await createTestForm(testWorkspace.id, email.id);

    const rawData = {
      field_email: "newuser@example.com",
      field_firstName: "Jane",
    };

    const doubleOptIn: DoubleOptInConfig = {
      enabled: true,
      emailId: email.id,
    };

    await handleSignUpSubmission(
      testWorkspace.id,
      form.id,
      rawData,
      fieldMapping,
      {
        ipAddress: "127.0.0.1",
        userAgent: "Test Agent",
        referrerUrl: null,
      },
      doubleOptIn,
    );

    // Verify contact was created with UNCONFIRMED status
    const contact = await prisma.contact.findFirst({
      where: {
        workspaceId: testWorkspace.id,
        email: "newuser@example.com",
      },
    });

    expect(contact).not.toBeNull();
    expect(contact?.status).toBe("UNCONFIRMED");
    expect(contact?.firstName).toBe("Jane");
    // Verify confirmation token was generated
    expect(contact?.confirmationToken).not.toBeNull();
    expect(contact?.confirmationToken?.length).toBe(64);
  });

  it("should not send confirmation email for already confirmed contact", async () => {
    // Create an existing SUBSCRIBED contact
    await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: "confirmed@example.com",
        firstName: "Confirmed",
        status: "SUBSCRIBED",
      },
    });

    const email = await createTestEmail(testWorkspace.id);
    const form = await createTestForm(testWorkspace.id, email.id);

    const rawData = {
      field_email: "confirmed@example.com",
      field_firstName: "UpdatedName",
    };

    const doubleOptIn: DoubleOptInConfig = {
      enabled: true,
      emailId: email.id,
    };

    await handleSignUpSubmission(
      testWorkspace.id,
      form.id,
      rawData,
      fieldMapping,
      {
        ipAddress: "127.0.0.1",
        userAgent: "Test Agent",
        referrerUrl: null,
      },
      doubleOptIn,
    );

    // Verify contact was updated but status remains SUBSCRIBED
    const contact = await prisma.contact.findFirst({
      where: {
        workspaceId: testWorkspace.id,
        email: "confirmed@example.com",
      },
    });

    expect(contact).not.toBeNull();
    expect(contact?.status).toBe("SUBSCRIBED");
    expect(contact?.firstName).toBe("UpdatedName");
    // No new token should be generated for already confirmed contact
    expect(contact?.confirmationToken).toBeNull();
  });

  it("should regenerate token for existing UNCONFIRMED contact", async () => {
    // Create an existing UNCONFIRMED contact with an old token
    const oldToken = "a".repeat(64);

    await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: "unconfirmed@example.com",
        firstName: "Unconfirmed",
        status: "UNCONFIRMED",
        confirmationToken: oldToken,
      },
    });

    const email = await createTestEmail(testWorkspace.id);
    const form = await createTestForm(testWorkspace.id, email.id);

    const rawData = {
      field_email: "unconfirmed@example.com",
      field_firstName: "Unconfirmed",
    };

    const doubleOptIn: DoubleOptInConfig = {
      enabled: true,
      emailId: email.id,
    };

    await handleSignUpSubmission(
      testWorkspace.id,
      form.id,
      rawData,
      fieldMapping,
      {
        ipAddress: "127.0.0.1",
        userAgent: "Test Agent",
        referrerUrl: null,
      },
      doubleOptIn,
    );

    // Verify token was regenerated
    const contact = await prisma.contact.findFirst({
      where: {
        workspaceId: testWorkspace.id,
        email: "unconfirmed@example.com",
      },
    });

    expect(contact).not.toBeNull();
    expect(contact?.status).toBe("UNCONFIRMED");
    // Token should be different from old token
    expect(contact?.confirmationToken).not.toBe(oldToken);
    expect(contact?.confirmationToken?.length).toBe(64);
  });

  it("should create form submission record with contact linked", async () => {
    const email = await createTestEmail(testWorkspace.id);
    const form = await createTestForm(testWorkspace.id, email.id);

    const rawData = {
      field_email: "submission@example.com",
      field_firstName: "Submitter",
    };

    const doubleOptIn: DoubleOptInConfig = {
      enabled: true,
      emailId: email.id,
    };

    const response = await handleSignUpSubmission(
      testWorkspace.id,
      form.id,
      rawData,
      fieldMapping,
      {
        ipAddress: "192.168.1.1",
        userAgent: "Test Browser",
        referrerUrl: "https://example.com",
      },
      doubleOptIn,
    );

    // Verify response
    const responseData = await response.json();
    expect(responseData.object).toBe("form_submission");
    expect(responseData.id).toBeDefined();

    // Verify submission was created
    const submission = await prisma.formSubmission.findFirst({
      where: { id: responseData.id },
      include: { contact: true },
    });

    expect(submission).not.toBeNull();
    expect(submission?.status).toBe("PROCESSED");
    expect(submission?.ipAddress).toBe("192.168.1.1");
    expect(submission?.userAgent).toBe("Test Browser");
    expect(submission?.referrerUrl).toBe("https://example.com");
    expect(submission?.contact).not.toBeNull();
    expect(submission?.contact?.email).toBe("submission@example.com");
  });

  it("should handle double opt-in with missing emailId gracefully", async () => {
    const form = await createTestForm(testWorkspace.id, null);

    const rawData = {
      field_email: "graceful@example.com",
      field_firstName: "Grace",
    };

    // Double opt-in enabled but emailId is null
    const doubleOptIn: DoubleOptInConfig = {
      enabled: true,
      emailId: null,
    };

    await handleSignUpSubmission(
      testWorkspace.id,
      form.id,
      rawData,
      fieldMapping,
      {
        ipAddress: "127.0.0.1",
        userAgent: "Test Agent",
        referrerUrl: null,
      },
      doubleOptIn,
    );

    // Should create contact without double opt-in since emailId is null
    const contact = await prisma.contact.findFirst({
      where: {
        workspaceId: testWorkspace.id,
        email: "graceful@example.com",
      },
    });

    // The implementation treats enabled:true but emailId:null as not-double-opt-in
    expect(contact).not.toBeNull();
    // Contact should be SUBSCRIBED since double opt-in is effectively disabled
    expect(contact?.status).toBe("SUBSCRIBED");
  });
});

describe("handleSignUpSubmission without double opt-in parameter", () => {
  it("should create SUBSCRIBED contact when doubleOptIn is undefined", async () => {
    const form = await createTestForm(testWorkspace.id, null);

    const rawData = {
      field_email: "noconfig@example.com",
      field_firstName: "NoConfig",
    };

    // Call without passing doubleOptIn parameter
    await handleSignUpSubmission(
      testWorkspace.id,
      form.id,
      rawData,
      fieldMapping,
      {
        ipAddress: "127.0.0.1",
        userAgent: "Test Agent",
        referrerUrl: null,
      },
    );

    const contact = await prisma.contact.findFirst({
      where: {
        workspaceId: testWorkspace.id,
        email: "noconfig@example.com",
      },
    });

    expect(contact).not.toBeNull();
    expect(contact?.status).toBe("SUBSCRIBED");
    expect(contact?.confirmationToken).toBeNull();
  });
});
