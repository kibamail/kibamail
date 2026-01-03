/**
 * Integration tests for Public Form Submissions (Internal API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/internal/v1/forms/[formId]/submissions - Submit data to a public form
 *
 * This endpoint is designed for public form pages where end-users submit forms
 * without authentication. The workspace is derived from the form record.
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST } from "@/app/(main)/api/internal/v1/forms/[formId]/submissions/route";
import { ErrorCode } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  cleanupWorkspace,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils";
import {
  signUpFormFields,
  surveyFormFields,
} from "@/tests/utils/form-fixtures";

let testWorkspace: TestWorkspace;

// Test form IDs
let signUpFormId: string;
let surveyFormId: string;
let unpublishedFormId: string;

/**
 * Helper to create a public form submission request (no auth)
 */
function publicPost(path: string, body: Record<string, unknown>): Request {
  return new Request(`http://localhost:3000/api/internal/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Test Browser)",
      "X-Forwarded-For": "203.0.113.42",
      Referer: "https://example.com/landing-page",
    },
    body: JSON.stringify(body),
  });
}

/**
 * Setup: Create test workspace and test forms
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();

  // Create a SIGN_UP form and publish it
  const signUpForm = await prisma.form.create({
    data: {
      workspaceId: testWorkspace.id,
      name: "Public Newsletter Sign Up",
      type: "SIGN_UP",
      display: "INLINE_EMBED",
      status: "PUBLISHED",
      version: 1,
      fields: signUpFormFields as never,
      publishedAt: new Date(),
      fieldMapping: {
        email: {
          slot: "fieldString0",
          type: "string",
          fieldType: "email",
          contactPropertyId: "email",
          contactPropertyType: "standard",
        },
        firstName: {
          slot: "fieldString1",
          type: "string",
          fieldType: "text",
          contactPropertyId: "firstName",
          contactPropertyType: "standard",
        },
        lastName: {
          slot: "fieldString2",
          type: "string",
          fieldType: "text",
          contactPropertyId: "lastName",
          contactPropertyType: "standard",
        },
      } as never,
    },
  });
  // Update to self-reference as published version
  await prisma.form.update({
    where: { id: signUpForm.id },
    data: { publishedVersionId: signUpForm.id },
  });
  signUpFormId = signUpForm.id;

  // Create a SURVEY form and publish it
  const surveyForm = await prisma.form.create({
    data: {
      workspaceId: testWorkspace.id,
      name: "Public Feedback Survey",
      type: "SURVEY",
      display: "POPUP",
      status: "PUBLISHED",
      version: 1,
      fields: surveyFormFields as never,
      publishedAt: new Date(),
      fieldMapping: {
        email: {
          slot: "fieldString0",
          type: "string",
          fieldType: "email",
          contactPropertyId: "email",
          contactPropertyType: "standard",
        },
        feedback: {
          slot: "fieldString1",
          type: "string",
          fieldType: "textarea",
        },
        satisfaction: {
          slot: "fieldNum0",
          type: "number",
          fieldType: "rating",
        },
      } as never,
    },
  });
  // Update to self-reference as published version
  await prisma.form.update({
    where: { id: surveyForm.id },
    data: { publishedVersionId: surveyForm.id },
  });
  surveyFormId = surveyForm.id;

  // Create an unpublished form
  const unpublishedForm = await prisma.form.create({
    data: {
      workspaceId: testWorkspace.id,
      name: "Draft Form",
      type: "SIGN_UP",
      display: "INLINE_EMBED",
      status: "DRAFT",
      version: 1,
      fields: signUpFormFields as never,
    },
  });
  unpublishedFormId = unpublishedForm.id;
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("POST /api/internal/v1/forms/[formId]/submissions - Public Access", () => {
  test("should accept submission without authentication", async () => {
    const email = `public-submit-${Date.now()}@example.com`;
    const request = publicPost(`/forms/${signUpFormId}/submissions`, {
      email,
      firstName: "Public",
      lastName: "User",
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form_submission");
    expect(responseData.id).toBeDefined();
  });

  test("should return 404 for non-existent form", async () => {
    const request = publicPost("/forms/nonexistent-form-id/submissions", {
      email: "test@example.com",
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: "nonexistent-form-id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.FORM_NOT_FOUND);
  });

  test("should reject submission to unpublished form", async () => {
    const request = publicPost(`/forms/${unpublishedFormId}/submissions`, {
      email: "test@example.com",
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: unpublishedFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("not published");
  });
});

describe("POST /api/internal/v1/forms/[formId]/submissions - Metadata Capture", () => {
  test("should capture IP address from X-Forwarded-For header", async () => {
    const email = `metadata-ip-${Date.now()}@example.com`;
    const request = publicPost(`/forms/${signUpFormId}/submissions`, {
      email,
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    const submission = await prisma.formSubmission.findUnique({
      where: { id: responseData.id },
    });
    expect(submission?.ipAddress).toBe("203.0.113.42");
  });

  test("should capture user agent", async () => {
    const email = `metadata-ua-${Date.now()}@example.com`;
    const request = publicPost(`/forms/${signUpFormId}/submissions`, {
      email,
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    const submission = await prisma.formSubmission.findUnique({
      where: { id: responseData.id },
    });
    expect(submission?.userAgent).toBe("Mozilla/5.0 (Test Browser)");
  });

  test("should capture referrer URL", async () => {
    const email = `metadata-ref-${Date.now()}@example.com`;
    const request = publicPost(`/forms/${signUpFormId}/submissions`, {
      email,
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    const submission = await prisma.formSubmission.findUnique({
      where: { id: responseData.id },
    });
    expect(submission?.referrerUrl).toBe("https://example.com/landing-page");
  });
});

describe("POST /api/internal/v1/forms/[formId]/submissions - SIGN_UP Forms", () => {
  test("should create a new contact on public sign-up submission", async () => {
    const email = `public-signup-${Date.now()}@example.com`;
    const request = publicPost(`/forms/${signUpFormId}/submissions`, {
      email,
      firstName: "Jane",
      lastName: "Doe",
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();

    // Verify contact was created
    const contact = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email },
    });
    expect(contact).not.toBeNull();
    expect(contact?.email).toBe(email);
    expect(contact?.firstName).toBe("Jane");
    expect(contact?.lastName).toBe("Doe");
    expect(contact?.sourceType).toBe("FORM");
    expect(contact?.sourceId).toBe(signUpFormId);

    // Verify submission was linked to contact
    const submission = await prisma.formSubmission.findUnique({
      where: { id: responseData.id },
    });
    expect(submission?.contactId).toBe(contact?.id);
  });

  test("should reject public sign-up without email", async () => {
    const request = publicPost(`/forms/${signUpFormId}/submissions`, {
      firstName: "No",
      lastName: "Email",
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
  });
});

describe("POST /api/internal/v1/forms/[formId]/submissions - SURVEY Forms", () => {
  test("should create survey submission without contact", async () => {
    const request = publicPost(`/forms/${surveyFormId}/submissions`, {
      email: "survey-visitor@example.com",
      feedback: "Great experience!",
      satisfaction: 5,
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: surveyFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();

    // Verify submission was created without contact
    const submission = await prisma.formSubmission.findUnique({
      where: { id: responseData.id },
    });
    expect(submission?.contactId).toBeNull();
    expect(submission?.fieldString0).toBe("survey-visitor@example.com");
    expect(submission?.fieldString1).toBe("Great experience!");
    expect(submission?.fieldNum0).toBe(5);
  });

  test("should accept survey with minimal data", async () => {
    const request = publicPost(`/forms/${surveyFormId}/submissions`, {
      satisfaction: 3,
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: surveyFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();
  });
});

describe("POST /api/internal/v1/forms/[formId]/submissions - Cross-Workspace Access", () => {
  test("should allow submission from any origin (no workspace check on request)", async () => {
    // Public endpoint doesn't check workspace - it derives workspace from the form
    const email = `cross-origin-${Date.now()}@example.com`;
    const request = publicPost(`/forms/${signUpFormId}/submissions`, {
      email,
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();

    // Verify submission was created in the form's workspace
    const submission = await prisma.formSubmission.findUnique({
      where: { id: responseData.id },
    });
    expect(submission?.workspaceId).toBe(testWorkspace.id);
  });
});

describe("POST /api/internal/v1/forms/[formId]/submissions - Version Handling", () => {
  test("should use published version field mapping", async () => {
    // Create a root form
    const rootForm = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Public Versioned Form",
        type: "SURVEY",
        display: "INLINE_EMBED",
        status: "ARCHIVED",
        version: 1,
        fields: surveyFormFields as never,
        fieldMapping: {
          email: {
            slot: "fieldString0",
            type: "string",
            fieldType: "email",
            contactPropertyId: "email",
            contactPropertyType: "standard",
          },
          feedback: {
            slot: "fieldString1",
            type: "string",
            fieldType: "textarea",
          },
          satisfaction: {
            slot: "fieldNum0",
            type: "number",
            fieldType: "rating",
          },
        } as never,
      },
    });

    // Create and publish version 2
    const version2 = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        parentId: rootForm.id,
        name: "Public Versioned Form v2",
        type: "SURVEY",
        display: "INLINE_EMBED",
        status: "PUBLISHED",
        version: 2,
        publishedAt: new Date(),
        fields: surveyFormFields as never,
        fieldMapping: {
          email: {
            slot: "fieldString0",
            type: "string",
            fieldType: "email",
            contactPropertyId: "email",
            contactPropertyType: "standard",
          },
          feedback: {
            slot: "fieldString1",
            type: "string",
            fieldType: "textarea",
          },
          satisfaction: {
            slot: "fieldNum0",
            type: "number",
            fieldType: "rating",
          },
        } as never,
      },
    });

    // Point root to published version
    await prisma.form.update({
      where: { id: rootForm.id },
      data: { publishedVersionId: version2.id },
    });

    // Submit to root form
    const request = publicPost(`/forms/${rootForm.id}/submissions`, {
      email: "version-public@example.com",
      feedback: "Testing public versioning",
      satisfaction: 4,
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    // Verify data was stored
    const submission = await prisma.formSubmission.findUnique({
      where: { id: responseData.id },
    });
    expect(submission?.fieldString0).toBe("version-public@example.com");
    expect(submission?.fieldString1).toBe("Testing public versioning");
    expect(submission?.fieldNum0).toBe(4);
  });
});
