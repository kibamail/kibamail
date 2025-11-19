/**
 * Integration tests for Form Creation (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/forms - Create new form
 * - Focus on authentication and authorization
 */

import { POST } from "@/app/api/v1/forms/route";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  cleanupWorkspace,
  post,
  apiRequest,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";
import { ErrorType, ErrorCode } from "@/lib/api/error-codes";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

/**
 * Valid SurveyJS form configuration for testing
 */
const validFormFields = {
  pages: [
    {
      elements: [
        {
          type: "text",
          name: "firstName",
          title: "First Name",
          isRequired: true,
        },
        {
          type: "text",
          name: "email",
          title: "Email",
          inputType: "email",
          isRequired: true,
        },
      ],
    },
  ],
};

/**
 * Setup: Create a test workspace and API keys for authentication
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("POST /api/v1/forms - Authentication & Authorization", () => {
  test("should reject request with missing Authorization header", async () => {
    const formData = {
      name: "Contact Form",
      fields: validFormFields,
    };
    const request = apiRequest("/forms").method("POST").body(formData).build();

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_AUTHORIZATION_HEADER);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject request with invalid API key", async () => {
    const formData = {
      name: "Contact Form",
      fields: validFormFields,
    };
    const request = post("/forms", formData, "sk_invalid_key_12345");

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
  });

  test("should reject request without write:forms scope", async () => {
    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:forms"],
    });

    const formData = {
      name: "Contact Form",
      fields: validFormFields,
    };
    const request = post("/forms", formData, readOnlyKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject request with unrelated scope", async () => {
    const contactsOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:contacts", "write:contacts"],
    });

    const formData = {
      name: "Contact Form",
      fields: validFormFields,
    };
    const request = post("/forms", formData, contactsOnlyKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should accept request with write:forms scope", async () => {
    const writeFormsKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:forms"],
    });

    const formData = {
      name: "Contact Form",
      description: "A simple contact form",
      fields: validFormFields,
    };
    const request = post("/forms", formData, writeFormsKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBeDefined();
  });

  test("should accept request with full access API key", async () => {
    const formData = {
      name: "Newsletter Signup",
      description: "Sign up for our weekly newsletter",
      fields: validFormFields,
    };
    const request = post("/forms", formData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBeDefined();
  });
});

describe("POST /api/v1/forms - Validation", () => {
  test("should reject form with empty name", async () => {
    const formData = {
      name: "",
      fields: validFormFields,
    };
    const request = post("/forms", formData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject form with name exceeding max length", async () => {
    const formData = {
      name: "A".repeat(201), // Exceeds 200 character limit
      fields: validFormFields,
    };
    const request = post("/forms", formData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject form with description exceeding max length", async () => {
    const formData = {
      name: "Contact Form",
      description: "A".repeat(1001), // Exceeds 1000 character limit
      fields: validFormFields,
    };
    const request = post("/forms", formData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });


  test("should create form with minimal valid fields", async () => {
    const minimalFields = {
      pages: [],
    };
    const formData = {
      name: "Minimal Form",
      fields: minimalFields,
    };
    const request = post("/forms", formData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBeDefined();
  });

  test("should create form without description (optional field)", async () => {
    const formData = {
      name: "No Description Form",
      fields: validFormFields,
    };
    const request = post("/forms", formData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBeDefined();
  });

  test("should create form with complex SurveyJS configuration", async () => {
    const complexFields = {
      pages: [
        {
          elements: [
            {
              type: "radiogroup",
              name: "satisfaction",
              title: "How satisfied are you?",
              choices: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"],
            },
            {
              type: "comment",
              name: "feedback",
              title: "Additional feedback",
            },
            {
              type: "rating",
              name: "rating",
              title: "Rate us",
              rateMin: 1,
              rateMax: 5,
            },
          ],
        },
      ],
      showProgressBar: "top",
      showQuestionNumbers: "on",
    };
    const formData = {
      name: "Customer Satisfaction Survey",
      description: "Help us improve our service",
      fields: complexFields,
    };
    const request = post("/forms", formData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBeDefined();
  });
});
