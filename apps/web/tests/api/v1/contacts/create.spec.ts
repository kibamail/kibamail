/**
 * Integration tests for Contact Creation (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/contacts - Create new contact
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST } from "@/app/(main)/api/v1/contacts/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  apiRequest,
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createReadOnlyApiKey,
  createTestWorkspace,
  fakeContact,
  fakeMinimalContact,
  post,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;
let readOnlyApiKey: CreatedApiKey;

/**
 * Setup: Create a test workspace and API keys for authentication
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
  readOnlyApiKey = await createReadOnlyApiKey(testWorkspace.id);
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("POST /api/v1/contacts", () => {
  test("should create a new contact with valid authentication and required fields", async () => {
    const contactData = fakeContact();
    const request = post("/contacts", contactData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("contact");
    expect(responseData.id).toBeDefined();
  });

  test("should create a contact with only email (minimal required data)", async () => {
    const contactData = fakeMinimalContact();
    const request = post("/contacts", contactData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("contact");
    expect(responseData.id).toBeDefined();
  });

  test("should create a contact with all optional fields", async () => {
    const contactData = fakeContact({ status: "UNSUBSCRIBED" });
    const request = post("/contacts", contactData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("contact");
    expect(responseData.id).toBeDefined();
  });

  test("should create a contact with subscribedAt and unsubscribedAt fields", async () => {
    const now = new Date();
    const contactData = {
      ...fakeContact(),
      subscribedAt: now.toISOString(),
      unsubscribedAt: null,
    };
    const request = post("/contacts", contactData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("contact");
    expect(responseData.id).toBeDefined();
  });

  test("should reject duplicate email in same workspace", async () => {
    const contactData = fakeContact();

    const firstRequest = post("/contacts", contactData, fullAccessApiKey.key);
    await POST(firstRequest);

    const duplicateRequest = post(
      "/contacts",
      contactData,
      fullAccessApiKey.key,
    );
    const response = await POST(duplicateRequest);
    const responseData = await response.json();

    expect(response.status).toBe(409);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toContain("already exists");
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject request with missing Authorization header", async () => {
    const contactData = fakeMinimalContact();
    const request = apiRequest("/contacts")
      .method("POST")
      .body(contactData)
      .build();

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
    const contactData = fakeMinimalContact();
    const request = post("/contacts", contactData, "kb_invalid_key_12345678");

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INVALID_API_KEY);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject request with missing email", async () => {
    const request = post(
      "/contacts",
      { firstName: "John", lastName: "Doe" },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject request with invalid email format", async () => {
    const request = post(
      "/contacts",
      { email: "invalid-email" },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject request with invalid status", async () => {
    const contactData = { ...fakeMinimalContact(), status: "INVALID_STATUS" };
    const request = post("/contacts", contactData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.validationErrors).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should reject request without write:contacts scope", async () => {
    const contactData = fakeMinimalContact();
    const request = post("/contacts", contactData, readOnlyApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });
});

describe("POST /api/v1/contacts - Source Type", () => {
  test("should set sourceType to API when creating via external API", async () => {
    const contactData = fakeContact();
    const request = post("/contacts", contactData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);

    // Verify the contact has sourceType = API
    const contact = await prisma.contact.findUnique({
      where: { id: responseData.id },
    });

    expect(contact).not.toBeNull();
    expect(contact?.sourceType).toBe("API");
    expect(contact?.sourceId).toBeNull();
  });
});
