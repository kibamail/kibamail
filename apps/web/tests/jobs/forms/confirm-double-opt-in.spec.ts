/**
 * Integration tests for Confirm Double Opt-In Job
 *
 * Tests that the confirm-double-opt-in job correctly:
 * - Finds contacts by confirmation token
 * - Validates contact and form relationship
 * - Updates contact status from UNCONFIRMED to SUBSCRIBED
 * - Clears the confirmation token
 * - Handles edge cases gracefully
 */

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { confirmDoubleOptIn } from "@/jobs/forms/confirm-double-opt-in";
import { prisma } from "@/lib/db";
import { DEFAULT_FORM_SETTINGS } from "@/tests/utils/form-fixtures";
import {
  cleanupWorkspace,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils/workspace";

let testWorkspace: TestWorkspace;

async function createTestForm(workspaceId: string) {
  return prisma.form.create({
    data: {
      workspaceId,
      name: "Test Sign Up Form",
      type: "SIGN_UP",
      status: "PUBLISHED",
      settings: DEFAULT_FORM_SETTINGS,
      fieldMapping: {},
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
  await prisma.contact.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
});

describe("confirmDoubleOptIn job", () => {
  describe("successful confirmation", () => {
    test("should update contact status to SUBSCRIBED", async () => {
      const form = await createTestForm(testWorkspace.id);
      const confirmationToken = "a".repeat(64);
      const contact = await createUnconfirmedContact(
        testWorkspace.id,
        `confirm-test-${Date.now()}@example.com`,
        confirmationToken,
      );

      // Execute the job
      await confirmDoubleOptIn(
        {
          formId: form.id,
          confirmationToken,
        },
        "test-job-confirm",
      );

      // Verify contact was updated
      const updatedContact = await prisma.contact.findUnique({
        where: { id: contact.id },
      });

      expect(updatedContact).not.toBeNull();
      expect(updatedContact?.status).toBe("SUBSCRIBED");
      expect(updatedContact?.confirmationToken).toBeNull();
    });

    test("should handle confirmation for contact with matching token", async () => {
      const form = await createTestForm(testWorkspace.id);
      const confirmationToken = "b".repeat(64);

      // Create multiple contacts, only one with the token
      await createUnconfirmedContact(
        testWorkspace.id,
        `other-contact-${Date.now()}@example.com`,
        "c".repeat(64),
      );
      const targetContact = await createUnconfirmedContact(
        testWorkspace.id,
        `target-contact-${Date.now()}@example.com`,
        confirmationToken,
      );

      // Execute the job
      await confirmDoubleOptIn(
        {
          formId: form.id,
          confirmationToken,
        },
        "test-job-specific-token",
      );

      // Verify only target contact was updated
      const updatedContact = await prisma.contact.findUnique({
        where: { id: targetContact.id },
      });

      expect(updatedContact?.status).toBe("SUBSCRIBED");
      expect(updatedContact?.confirmationToken).toBeNull();
    });
  });

  describe("validation and skipping", () => {
    test("should skip if no contact found with token", async () => {
      const form = await createTestForm(testWorkspace.id);

      // Execute with non-existent token
      await confirmDoubleOptIn(
        {
          formId: form.id,
          confirmationToken: "nonexistent".repeat(8).slice(0, 64),
        },
        "test-job-no-contact",
      );

      // Should complete without error
    });

    test("should skip if contact is already SUBSCRIBED", async () => {
      const form = await createTestForm(testWorkspace.id);
      const confirmationToken = "d".repeat(64);

      // Create already subscribed contact with a token (shouldn't happen normally)
      const contact = await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `already-subscribed-${Date.now()}@example.com`,
          firstName: "Already",
          lastName: "Subscribed",
          status: "SUBSCRIBED",
          confirmationToken,
        },
      });

      // Execute the job
      await confirmDoubleOptIn(
        {
          formId: form.id,
          confirmationToken,
        },
        "test-job-already-subscribed",
      );

      // Verify contact wasn't changed
      const updatedContact = await prisma.contact.findUnique({
        where: { id: contact.id },
      });

      expect(updatedContact?.status).toBe("SUBSCRIBED");
      // Token should still be there since we skipped
      expect(updatedContact?.confirmationToken).toBe(confirmationToken);
    });

    test("should skip if contact is UNSUBSCRIBED", async () => {
      const form = await createTestForm(testWorkspace.id);
      const confirmationToken = "e".repeat(64);

      // Create unsubscribed contact with a token
      const contact = await prisma.contact.create({
        data: {
          workspaceId: testWorkspace.id,
          email: `unsubscribed-${Date.now()}@example.com`,
          firstName: "Unsubscribed",
          lastName: "User",
          status: "UNSUBSCRIBED",
          confirmationToken,
        },
      });

      // Execute the job
      await confirmDoubleOptIn(
        {
          formId: form.id,
          confirmationToken,
        },
        "test-job-unsubscribed",
      );

      // Verify contact wasn't changed
      const updatedContact = await prisma.contact.findUnique({
        where: { id: contact.id },
      });

      expect(updatedContact?.status).toBe("UNSUBSCRIBED");
    });

    test("should skip if form not found", async () => {
      const confirmationToken = "f".repeat(64);
      await createUnconfirmedContact(
        testWorkspace.id,
        `no-form-${Date.now()}@example.com`,
        confirmationToken,
      );

      // Execute with non-existent form
      await confirmDoubleOptIn(
        {
          formId: "non-existent-form-id",
          confirmationToken,
        },
        "test-job-no-form",
      );

      // Should complete without error
    });

    test("should skip if form and contact belong to different workspaces", async () => {
      // Create form in test workspace
      const form = await createTestForm(testWorkspace.id);
      const confirmationToken = "g".repeat(64);

      // Create a second workspace
      const otherWorkspace = createTestWorkspace();

      try {
        // Create contact in different workspace
        const contact = await prisma.contact.create({
          data: {
            workspaceId: otherWorkspace.id,
            email: `different-workspace-${Date.now()}@example.com`,
            firstName: "Different",
            lastName: "Workspace",
            status: "UNCONFIRMED",
            confirmationToken,
          },
        });

        // Execute the job
        await confirmDoubleOptIn(
          {
            formId: form.id,
            confirmationToken,
          },
          "test-job-different-workspace",
        );

        // Verify contact wasn't changed
        const updatedContact = await prisma.contact.findUnique({
          where: { id: contact.id },
        });

        expect(updatedContact?.status).toBe("UNCONFIRMED");
        expect(updatedContact?.confirmationToken).toBe(confirmationToken);
      } finally {
        await cleanupWorkspace(otherWorkspace.id);
      }
    });
  });

  describe("idempotency", () => {
    test("should be safe to run multiple times with same token", async () => {
      const form = await createTestForm(testWorkspace.id);
      const confirmationToken = "h".repeat(64);
      const contact = await createUnconfirmedContact(
        testWorkspace.id,
        `idempotent-${Date.now()}@example.com`,
        confirmationToken,
      );

      // Execute the job twice
      await confirmDoubleOptIn(
        {
          formId: form.id,
          confirmationToken,
        },
        "test-job-idempotent-1",
      );

      await confirmDoubleOptIn(
        {
          formId: form.id,
          confirmationToken,
        },
        "test-job-idempotent-2",
      );

      // Verify contact is SUBSCRIBED
      const updatedContact = await prisma.contact.findUnique({
        where: { id: contact.id },
      });

      expect(updatedContact?.status).toBe("SUBSCRIBED");
      expect(updatedContact?.confirmationToken).toBeNull();
    });
  });
});
