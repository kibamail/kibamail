/**
 * Integration tests for Form Submissions (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/forms/[formId]/submissions - Submit data to a form
 */

import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import type {
  dispatchWebhook as DispatchWebhookFn,
  dispatchWebhookBulk as DispatchWebhookBulkFn,
} from "@/webhooks";

// Hoist mock functions so they can be used in vi.mock
const { mockDispatchWebhook, mockDispatchWebhookBulk } = vi.hoisted(() => ({
  mockDispatchWebhook: vi.fn<typeof DispatchWebhookFn>(),
  mockDispatchWebhookBulk: vi.fn<typeof DispatchWebhookBulkFn>(),
}));

vi.mock("@/webhooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/webhooks")>();
  return {
    ...actual,
    dispatchWebhook: mockDispatchWebhook,
    dispatchWebhookBulk: mockDispatchWebhookBulk,
  };
});

// Import after mocking
import { POST } from "@/app/(main)/api/v1/forms/[formId]/submissions/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  apiRequest,
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestWorkspace,
  post,
  type TestWorkspace,
} from "@/tests/utils";
import {
  signUpFormSpec,
  surveyFormSpec,
} from "@/tests/utils/form-fixtures";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

// Test form IDs
let signUpFormId: string;
let surveyFormId: string;
let unpublishedFormId: string;

/**
 * Setup: Create test workspace, API keys, and test forms
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);

  // Create a SIGN_UP form and publish it
  const signUpForm = await prisma.form.create({
    data: {
      workspaceId: testWorkspace.id,
      name: "Newsletter Sign Up",
      type: "SIGN_UP",
      display: "INLINE_EMBED",
      status: "PUBLISHED",
      version: 1,
      fields: signUpFormSpec as never,
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
      name: "Customer Feedback",
      type: "SURVEY",
      display: "POPUP",
      status: "PUBLISHED",
      version: 1,
      fields: surveyFormSpec as never,
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
      fields: signUpFormSpec as never,
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

describe("POST /api/v1/forms/[formId]/submissions - Authentication", () => {
  test("should reject request with missing Authorization header", async () => {
    const request = apiRequest(`/forms/${signUpFormId}/submissions`)
      .method("POST")
      .body({ email: "test@example.com" })
      .build();

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(
      ErrorCode.MISSING_AUTHORIZATION_HEADER,
    );
  });

  test("should reject request with invalid API key", async () => {
    const request = post(
      `/forms/${signUpFormId}/submissions`,
      { email: "test@example.com" },
      "kb_invalid_key_12345678",
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INVALID_API_KEY);
  });

  test("should reject request without write:forms scope", async () => {
    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:forms"],
    });

    const request = post(
      `/forms/${signUpFormId}/submissions`,
      { email: "test@example.com" },
      readOnlyKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });
});

describe("POST /api/v1/forms/[formId]/submissions - Form Validation", () => {
  test("should return 404 for non-existent form", async () => {
    const request = post(
      "/forms/nonexistent-form-id/submissions",
      { email: "test@example.com" },
      fullAccessApiKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: "nonexistent-form-id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.FORM_NOT_FOUND);
  });

  test("should reject submission to unpublished form", async () => {
    const request = post(
      `/forms/${unpublishedFormId}/submissions`,
      { email: "test@example.com" },
      fullAccessApiKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: unpublishedFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("not published");
  });
});

describe("POST /api/v1/forms/[formId]/submissions - SIGN_UP Forms", () => {
  test("should create a new contact on sign-up form submission", async () => {
    const email = `signup-new-${Date.now()}@example.com`;
    const request = post(
      `/forms/${signUpFormId}/submissions`,
      {
        email,
        firstName: "John",
        lastName: "Doe",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form_submission");
    expect(responseData.id).toBeDefined();

    // Verify contact was created with correct sourceType
    const contact = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email },
    });
    expect(contact).not.toBeNull();
    expect(contact?.email).toBe(email);
    expect(contact?.firstName).toBe("John");
    expect(contact?.lastName).toBe("Doe");
    expect(contact?.sourceType).toBe("FORM");
    expect(contact?.sourceId).toBe(signUpFormId);

    // Verify form submission was created
    const submission = await prisma.formSubmission.findUnique({
      where: { id: responseData.id },
    });
    expect(submission).not.toBeNull();
    expect(submission?.contactId).toBe(contact?.id);
    expect(submission?.status).toBe("PROCESSED");
  });

  test("should update existing contact on sign-up form submission", async () => {
    const email = `signup-existing-${Date.now()}@example.com`;

    // Create existing contact
    const existingContact = await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email,
        firstName: "Old",
        lastName: "Name",
        sourceType: "API",
      },
    });

    const request = post(
      `/forms/${signUpFormId}/submissions`,
      {
        email,
        firstName: "New",
        lastName: "Name",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();

    // Verify contact was updated
    const updatedContact = await prisma.contact.findUnique({
      where: { id: existingContact.id },
    });
    expect(updatedContact?.firstName).toBe("New");
    expect(updatedContact?.lastName).toBe("Name");
  });

  test("should reject sign-up submission without email", async () => {
    const request = post(
      `/forms/${signUpFormId}/submissions`,
      {
        firstName: "John",
        lastName: "Doe",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  test("should reject sign-up submission with invalid email", async () => {
    const request = post(
      `/forms/${signUpFormId}/submissions`,
      {
        email: "invalid-email",
        firstName: "John",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  test("should store submission data in slots for sign-up form", async () => {
    const email = `signup-slots-${Date.now()}@example.com`;
    const request = post(
      `/forms/${signUpFormId}/submissions`,
      {
        email,
        firstName: "Jane",
        lastName: "Smith",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    // Verify slot data was stored
    const submission = await prisma.formSubmission.findUnique({
      where: { id: responseData.id },
    });
    expect(submission?.fieldString0).toBe(email);
    expect(submission?.fieldString1).toBe("Jane");
    expect(submission?.fieldString2).toBe("Smith");
  });
});

describe("POST /api/v1/forms/[formId]/submissions - SURVEY Forms", () => {
  test("should create form submission without contact for survey", async () => {
    const request = post(
      `/forms/${surveyFormId}/submissions`,
      {
        email: "survey@example.com",
        feedback: "Great product!",
        satisfaction: 5,
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: surveyFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form_submission");
    expect(responseData.id).toBeDefined();

    // Verify form submission was created without contact
    const submission = await prisma.formSubmission.findUnique({
      where: { id: responseData.id },
    });
    expect(submission).not.toBeNull();
    expect(submission?.contactId).toBeNull();
    expect(submission?.status).toBe("PROCESSED");
  });

  test("should store survey data in correct slots", async () => {
    const request = post(
      `/forms/${surveyFormId}/submissions`,
      {
        email: "slots-test@example.com",
        feedback: "Excellent service",
        satisfaction: 4,
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: surveyFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    // Verify slot data was stored correctly
    const submission = await prisma.formSubmission.findUnique({
      where: { id: responseData.id },
    });
    expect(submission?.fieldString0).toBe("slots-test@example.com");
    expect(submission?.fieldString1).toBe("Excellent service");
    expect(submission?.fieldNum0).toBe(4);
  });

  test("should accept survey with partial data", async () => {
    const request = post(
      `/forms/${surveyFormId}/submissions`,
      {
        feedback: "Only feedback provided",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: surveyFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();

    // Verify only provided field was stored
    const submission = await prisma.formSubmission.findUnique({
      where: { id: responseData.id },
    });
    expect(submission?.fieldString0).toBeNull();
    expect(submission?.fieldString1).toBe("Only feedback provided");
    expect(submission?.fieldNum0).toBeNull();
  });

  test("should accept survey with empty data", async () => {
    const request = post(
      `/forms/${surveyFormId}/submissions`,
      {},
      fullAccessApiKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: surveyFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();
  });

  test("should ignore unknown fields in survey submission", async () => {
    const request = post(
      `/forms/${surveyFormId}/submissions`,
      {
        feedback: "Test feedback",
        unknownField: "This should be ignored",
        anotherUnknownField: 123,
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: surveyFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.id).toBeDefined();

    // Verify only mapped field was stored
    const submission = await prisma.formSubmission.findUnique({
      where: { id: responseData.id },
    });
    expect(submission?.fieldString1).toBe("Test feedback");
  });

  test("should coerce numeric string to number for rating field", async () => {
    const request = post(
      `/forms/${surveyFormId}/submissions`,
      {
        satisfaction: "5", // String instead of number
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: surveyFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    const submission = await prisma.formSubmission.findUnique({
      where: { id: responseData.id },
    });
    expect(submission?.fieldNum0).toBe(5);
  });
});

describe("POST /api/v1/forms/[formId]/submissions - Workspace Isolation", () => {
  test("should not allow submission to form from different workspace", async () => {
    // Create another workspace with its own form
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    // Try to submit to first workspace's form using other workspace's API key
    const request = post(
      `/forms/${signUpFormId}/submissions`,
      { email: "test@example.com" },
      otherApiKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.FORM_NOT_FOUND);

    // Cleanup
    await cleanupWorkspace(otherWorkspace.id);
  });
});

describe("POST /api/v1/forms/[formId]/submissions - Form Versions", () => {
  test("should use published version field mapping for submissions", async () => {
    // Create a root form
    const rootForm = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Versioned Form",
        type: "SURVEY",
        display: "INLINE_EMBED",
        status: "ARCHIVED", // Root becomes archived when version is published
        version: 1,
        fields: surveyFormSpec as never,
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

    // Create version 2 with different field mapping (additional field)
    const version2 = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        parentId: rootForm.id,
        name: "Versioned Form v2",
        type: "SURVEY",
        display: "INLINE_EMBED",
        status: "PUBLISHED",
        version: 2,
        publishedAt: new Date(),
        fields: {
          root: "form",
          elements: {
            form: {
              type: "FormRoot",
              props: { submitLabel: "Submit Feedback" },
              children: ["email-field", "feedback-field", "satisfaction-field", "new-field"],
            },
            "email-field": {
              type: "Input",
              props: { name: "email", label: "Email", type: "email" },
            },
            "feedback-field": {
              type: "Textarea",
              props: { name: "feedback", label: "Your Feedback" },
            },
            "satisfaction-field": {
              type: "Rating",
              props: { name: "satisfaction", label: "How satisfied are you?", maxRating: 5 },
            },
            "new-field": {
              type: "Input",
              props: { name: "newField", label: "New Field" },
            },
          },
        } as never,
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
          newField: { slot: "fieldString2", type: "string", fieldType: "text" },
          satisfaction: {
            slot: "fieldNum0",
            type: "number",
            fieldType: "rating",
          },
        } as never,
      },
    });

    // Update root to point to version 2 as published
    await prisma.form.update({
      where: { id: rootForm.id },
      data: { publishedVersionId: version2.id },
    });

    // Submit to root form - should use version 2's field mapping
    const request = post(
      `/forms/${rootForm.id}/submissions`,
      {
        email: "version-test@example.com",
        feedback: "Testing versions",
        newField: "New field value",
        satisfaction: 5,
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    // Verify data was stored using version 2's field mapping
    const submission = await prisma.formSubmission.findUnique({
      where: { id: responseData.id },
    });
    expect(submission?.fieldString0).toBe("version-test@example.com");
    expect(submission?.fieldString1).toBe("Testing versions");
    expect(submission?.fieldString2).toBe("New field value");
    expect(submission?.fieldNum0).toBe(5);
  });
});

describe("POST /api/v1/forms/[formId]/submissions - API-only Form (no HTML)", () => {
  test("should accept submission to a form published without site content", async () => {
    // Create a form with fieldMapping but no deployed HTML content
    const apiOnlyForm = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "API-Only Signup",
        type: "SIGN_UP",
        display: "INLINE_EMBED",
        status: "PUBLISHED",
        version: 1,
        fields: [] as never, // no HTML content
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
        } as never,
      },
    });

    await prisma.form.update({
      where: { id: apiOnlyForm.id },
      data: { publishedVersionId: apiOnlyForm.id },
    });

    const request = post(
      `/forms/${apiOnlyForm.id}/submissions`,
      {
        email: "api-only@example.com",
        firstName: "Jane",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: apiOnlyForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form_submission");
    expect(responseData.id).toBeDefined();

    // Verify contact was created
    const contact = await prisma.contact.findUnique({
      where: {
        workspaceId_email: {
          workspaceId: testWorkspace.id,
          email: "api-only@example.com",
        },
      },
    });
    expect(contact).not.toBeNull();
    expect(contact?.firstName).toBe("Jane");

    // Verify submission was stored
    const submission = await prisma.formSubmission.findUnique({
      where: { id: responseData.id },
    });
    expect(submission?.fieldString0).toBe("api-only@example.com");
    expect(submission?.fieldString1).toBe("Jane");
  });
});
