/**
 * Integration tests for Contact Creation (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/contacts - Create new contact
 */

import { POST } from "@/app/api/v1/contacts/route";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Contact } from "@prisma/client";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createReadOnlyApiKey,
  cleanupWorkspace,
  fakeContact,
  fakeMinimalContact,
  post,
  apiRequest,
  type TestWorkspace,
  type CreatedApiKey,
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

  test("should reject duplicate email in same workspace", async () => {
    const contactData = fakeContact();

    const firstRequest = post("/contacts", contactData, fullAccessApiKey.key);
    await POST(firstRequest);

    const duplicateRequest = post("/contacts", contactData, fullAccessApiKey.key);
    const response = await POST(duplicateRequest);
    const responseData = await response.json();

    expect(response.status).toBe(409);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("already exists");
  });

  test("should reject request with missing Authorization header", async () => {
    const contactData = fakeMinimalContact();
    const request = apiRequest("/contacts").method("POST").body(contactData).build();

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("Authorization header");
  });

  test("should reject request with invalid API key", async () => {
    const contactData = fakeMinimalContact();
    const request = post("/contacts", contactData, "sk_invalid_key_12345678");

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("Invalid API key");
  });

  test("should reject request with missing email", async () => {
    const request = post("/contacts", { firstName: "John", lastName: "Doe" }, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBeDefined();
  });

  test("should reject request with invalid email format", async () => {
    const request = post("/contacts", { email: "invalid-email" }, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBeDefined();
  });

  test("should reject request with invalid status", async () => {
    const contactData = { ...fakeMinimalContact(), status: "INVALID_STATUS" };
    const request = post("/contacts", contactData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBeDefined();
  });

  test("should reject request without write:contacts scope", async () => {
    const contactData = fakeMinimalContact();
    const request = post("/contacts", contactData, readOnlyApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("scope");
  });
});
