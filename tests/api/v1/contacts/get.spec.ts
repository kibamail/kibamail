/**
 * Integration tests for Individual Contact Retrieval (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/contacts/[contactId] - Get specific contact
 */

import { GET } from "@/app/api/v1/contacts/[contactId]/route";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Contact } from "@prisma/client";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createReadOnlyApiKey,
  cleanupWorkspace,
  createTestContacts,
  fakeContact,
  get,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;
let readOnlyApiKey: CreatedApiKey;
let testContactId: string;

/**
 * Setup: Create a test workspace, API keys, and test contact
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
  readOnlyApiKey = await createReadOnlyApiKey(testWorkspace.id);

  const contactData = fakeContact();
  const [createdContact] = await createTestContacts(testWorkspace.id, [contactData]);
  testContactId = createdContact.id;
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("GET /api/v1/contacts/[contactId]", () => {
  test("should get a specific contact", async () => {
    const request = get(`/contacts/${testContactId}`, fullAccessApiKey.key);

    const response = await GET(request, { params: Promise.resolve({ contactId: testContactId }) });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("contact");
    expect(responseData.id).toBe(testContactId);
    expect(responseData.email).toBeDefined();
    expect(responseData.properties).toBeDefined();
    expect(responseData.properties).toBeObject();
  });

  test("should work with read-only API key", async () => {
    const request = get(`/contacts/${testContactId}`, readOnlyApiKey.key);

    const response = await GET(request, { params: Promise.resolve({ contactId: testContactId }) });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("contact");
    expect(responseData.id).toBe(testContactId);
    expect(responseData.properties).toBeDefined();
    expect(responseData.properties).toBeObject();
  });

  test("should return 404 for non-existent contact", async () => {
    const fakeId = "non-existent-id";
    const request = get(`/contacts/${fakeId}`, fullAccessApiKey.key);

    const response = await GET(request, { params: Promise.resolve({ contactId: fakeId }) });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
  });

  test("should reject request with missing Authorization header", async () => {
    const request = get(`/contacts/${testContactId}`);

    const response = await GET(request, { params: Promise.resolve({ contactId: testContactId }) });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("Authorization header");
  });
});
