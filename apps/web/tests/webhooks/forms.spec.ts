/**
 * Webhook Integration Tests - Form Submission Events
 *
 * Tests that webhook dispatching is correctly triggered for form submissions:
 * - form.submission
 * - contact.created (for new contacts via form)
 */

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import type {
  dispatchWebhook as DispatchWebhookFn,
  dispatchWebhookBulk as DispatchWebhookBulkFn,
} from "@/webhooks";

// Hoist the mock functions so they can be used in vi.mock
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
import { prisma } from "@/lib/db";
import {
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestWorkspace,
  post,
  type CreatedApiKey,
  type TestWorkspace,
} from "@/tests/utils";
import { signUpFormFields, surveyFormFields } from "@/tests/utils/form-fixtures";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;
let signUpFormId: string;
let surveyFormId: string;

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
      } as never,
    },
  });
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
          contactPropertyId: null,
          contactPropertyType: null,
        },
      } as never,
    },
  });
  await prisma.form.update({
    where: { id: surveyForm.id },
    data: { publishedVersionId: surveyForm.id },
  });
  surveyFormId = surveyForm.id;
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

beforeEach(() => {
  mockDispatchWebhook.mockClear();
  mockDispatchWebhookBulk.mockClear();
});

describe("Form Webhooks - form.submission (Sign Up)", () => {
  test("should dispatch form.submission webhook when submitting to sign-up form", async () => {
    const submissionData = {
      email: `webhook-test-${Date.now()}@example.com`,
      firstName: "John",
    };
    const request = post(
      `/forms/${signUpFormId}/submissions`,
      submissionData,
      fullAccessApiKey.key
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    // Verify form.submission webhook was dispatched
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "form.submission",
      expect.objectContaining({
        formId: signUpFormId,
        submissionId: responseData.id,
      })
    );
  });

  test("should dispatch contact.created webhook for new contact from sign-up form", async () => {
    const email = `new-contact-${Date.now()}@example.com`;
    const submissionData = {
      email,
      firstName: "Jane",
    };
    const request = post(
      `/forms/${signUpFormId}/submissions`,
      submissionData,
      fullAccessApiKey.key
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });

    expect(response.status).toBe(201);

    // Verify contact.created webhook was dispatched
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "contact.created",
      expect.objectContaining({
        sourceType: "FORM",
        formId: signUpFormId,
        importId: null,
      })
    );
  });

  test("should NOT dispatch contact.created for existing contact", async () => {
    const email = `existing-${Date.now()}@example.com`;

    // Create the contact first
    await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email,
        firstName: "Existing",
      },
    });

    mockDispatchWebhook.mockClear();

    // Now submit the form with same email
    const submissionData = {
      email,
      firstName: "Updated",
    };
    const request = post(
      `/forms/${signUpFormId}/submissions`,
      submissionData,
      fullAccessApiKey.key
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: signUpFormId }),
    });

    expect(response.status).toBe(201);

    // Verify form.submission was dispatched
    const formSubmissionCalls = mockDispatchWebhook.mock.calls.filter(
      (call) => call[1] === "form.submission"
    );
    expect(formSubmissionCalls.length).toBe(1);

    // Verify contact.created was NOT dispatched
    const contactCreatedCalls = mockDispatchWebhook.mock.calls.filter(
      (call) => call[1] === "contact.created"
    );
    expect(contactCreatedCalls.length).toBe(0);
  });
});

describe("Form Webhooks - form.submission (Survey)", () => {
  test("should dispatch form.submission webhook when submitting to survey form", async () => {
    const submissionData = {
      email: `survey-${Date.now()}@example.com`,
      feedback: "Great service!",
    };
    const request = post(
      `/forms/${surveyFormId}/submissions`,
      submissionData,
      fullAccessApiKey.key
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: surveyFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    // Verify form.submission webhook was dispatched
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "form.submission",
      expect.objectContaining({
        formId: surveyFormId,
        submissionId: responseData.id,
      })
    );
  });

  test("should NOT dispatch contact.created for survey forms", async () => {
    const submissionData = {
      email: `survey-no-contact-${Date.now()}@example.com`,
      feedback: "Good feedback",
    };
    const request = post(
      `/forms/${surveyFormId}/submissions`,
      submissionData,
      fullAccessApiKey.key
    );

    const response = await POST(request, {
      params: Promise.resolve({ formId: surveyFormId }),
    });

    expect(response.status).toBe(201);

    // Verify contact.created was NOT dispatched (surveys don't create contacts)
    const contactCreatedCalls = mockDispatchWebhook.mock.calls.filter(
      (call) => call[1] === "contact.created"
    );
    expect(contactCreatedCalls.length).toBe(0);
  });
});
