/**
 * Integration tests for Form Creation (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/forms - Create new form
 * - Focus on authentication and authorization
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST } from "@/app/(main)/api/v1/forms/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
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
  multiFieldFormSpec,
  multiFieldFormFieldMapping,
  validFormSpec,
  validFormFieldMapping,
} from "@/tests/utils/form-fixtures";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

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
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping,
    };
    const request = apiRequest("/forms").method("POST").body(formData).build();

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(
      ErrorCode.MISSING_AUTHORIZATION_HEADER,
    );
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject request with invalid API key", async () => {
    const formData = {
      name: "Contact Form",
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping,
    };
    const request = post("/forms", formData, "kb_invalid_key_12345");

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
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping,
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
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping,
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
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping,
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
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping,
    };
    const request = post("/forms", formData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBeDefined();
  });
});

describe("POST /api/v1/forms - Type and Display Fields", () => {
  test("should create form with default type and display", async () => {
    const formData = {
      name: "Default Type Form",
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping,
    };
    const request = post("/forms", formData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBeDefined();
  });

  test("should create SURVEY type form", async () => {
    const formData = {
      name: "Customer Survey",
      type: "SURVEY",
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping,
    };
    const request = post("/forms", formData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBeDefined();
  });

  test("should create POPUP display form", async () => {
    const formData = {
      name: "Popup Form",
      display: "POPUP",
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping,
    };
    const request = post("/forms", formData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBeDefined();
  });

  test("should create form with custom type and display", async () => {
    const formData = {
      name: "Custom Survey Popup",
      type: "SURVEY",
      display: "POPUP",
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping,
    };
    const request = post("/forms", formData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBeDefined();
  });

  test("should reject invalid type value", async () => {
    const formData = {
      name: "Invalid Type Form",
      type: "INVALID_TYPE",
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping,
    };
    const request = post("/forms", formData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  test("should reject invalid display value", async () => {
    const formData = {
      name: "Invalid Display Form",
      display: "INVALID_DISPLAY",
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping,
    };
    const request = post("/forms", formData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
  });
});

describe("POST /api/v1/forms - Validation", () => {
  test("should reject form with empty name", async () => {
    const formData = {
      name: "",
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping,
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
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping,
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
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping,
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
    // Minimal valid form requires at least one page with one section with one field (including email for publishing)
    const formData = {
      name: "Minimal Form",
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping, // validFormSpec is already the minimal valid form (one email field)
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
      spec: validFormSpec,
      fieldMapping: validFormFieldMapping,
    };
    const request = post("/forms", formData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBeDefined();
  });

  test("should create form with multiple field types", async () => {
    const formData = {
      name: "Customer Satisfaction Survey",
      description: "Help us improve our service",
      spec: multiFieldFormSpec,
      fieldMapping: multiFieldFormFieldMapping,
    };
    const request = post("/forms", formData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBeDefined();
  });
});
