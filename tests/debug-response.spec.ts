/**
 * Debug test to check response format
 */

import { GET } from "@/app/api/v1/contacts/route";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  cleanupWorkspace,
  createTestContacts,
  fakeContacts,
  get,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);

  // Create 3 contacts for debugging
  const contactsData = fakeContacts(3);
  await createTestContacts(testWorkspace.id, contactsData);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("Debug Response Format", () => {
  test("should debug response format", async () => {
    const request = get("/contacts", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(responseData, null, 2));
    console.log("Response keys:", Object.keys(responseData));
    
    // This test is just for debugging
    expect(response.status).toBe(200);
  });
});
