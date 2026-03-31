/**
 * Integration tests for List Forms (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/forms - List all root forms with cursor-based pagination
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { GET } from "@/app/(main)/api/v1/forms/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  apiRequest,
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestWorkspace,
  get,
  type TestWorkspace,
} from "@/tests/utils";
import { validFormSpec } from "@/tests/utils/form-fixtures";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;
let readOnlyApiKey: CreatedApiKey;

// Test form IDs
let rootForm1Id: string;
let rootForm2Id: string;
let rootForm3Id: string;
let versionFormId: string;

/**
 * Setup: Create a test workspace, API keys, and test forms
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
  readOnlyApiKey = await createTestApiKey({
    workspaceId: testWorkspace.id,
    scopes: ["read:forms"],
  });

  // Create root forms for testing
  const form1 = await prisma.form.create({
    data: {
      workspaceId: testWorkspace.id,
      name: "Newsletter Signup",
      description: "Subscribe to our newsletter",
      type: "SIGN_UP",
      display: "INLINE_EMBED",
      status: "PUBLISHED",
      version: 1,
      fields: validFormSpec as never,
    },
  });
  rootForm1Id = form1.id;

  const form2 = await prisma.form.create({
    data: {
      workspaceId: testWorkspace.id,
      name: "Contact Form",
      description: null,
      type: "SURVEY",
      display: "POPUP",
      status: "DRAFT",
      version: 1,
      fields: validFormSpec as never,
    },
  });
  rootForm2Id = form2.id;

  const form3 = await prisma.form.create({
    data: {
      workspaceId: testWorkspace.id,
      name: "Feedback Form",
      description: "Share your feedback",
      type: "SURVEY",
      display: "INLINE_EMBED",
      status: "ARCHIVED",
      version: 1,
      fields: validFormSpec as never,
    },
  });
  rootForm3Id = form3.id;

  // Create a version (child) form - should NOT appear in list
  const versionForm = await prisma.form.create({
    data: {
      workspaceId: testWorkspace.id,
      parentId: rootForm1Id, // This is a child version
      name: "Newsletter Signup v2",
      description: "Updated version",
      status: "DRAFT",
      version: 2,
      fields: validFormSpec as never,
    },
  });
  versionFormId = versionForm.id;
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("GET /api/v1/forms - Authentication & Authorization", () => {
  test("should reject request with missing Authorization header", async () => {
    const request = apiRequest("/forms").method("GET").build();

    const response = await GET(request);
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
    const request = get("/forms", "kb_invalid_key_12345");

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INVALID_API_KEY);
    expect(responseData.error.message).toBeDefined();
  });

  test("should reject request without read:forms scope", async () => {
    const writeOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:forms"],
    });

    const request = get("/forms", writeOnlyKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toContain("read:forms");
  });

  test("should allow request with read:forms scope", async () => {
    const request = get("/forms", readOnlyApiKey.key);

    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});

describe("GET /api/v1/forms - List Forms", () => {
  test("should list all root forms with correct structure", async () => {
    const request = get("/forms", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("form_list");
    expect(responseData.hasMore).toBeDefined();
    expect(Array.isArray(responseData.data)).toBe(true);
    expect(responseData.data.length).toBe(3); // Only root forms, not versions
  });

  test("should only return root forms (not versions)", async () => {
    const request = get("/forms", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);

    // Check that version form is NOT in the list
    const versionInList = responseData.data.find(
      (f: { id: string }) => f.id === versionFormId,
    );
    expect(versionInList).toBeUndefined();

    // Check that all root forms ARE in the list
    const rootIds = responseData.data.map((f: { id: string }) => f.id);
    expect(rootIds).toContain(rootForm1Id);
    expect(rootIds).toContain(rootForm2Id);
    expect(rootIds).toContain(rootForm3Id);
  });

  test("should return simplified form fields (no internal fields)", async () => {
    const request = get("/forms", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);

    const form = responseData.data[0];

    // Should have all form fields (list returns full objects)
    expect(form.id).toBeDefined();
    expect(form.name).toBeDefined();
    expect(form.description).toBeDefined();
    expect(form.type).toBeDefined();
    expect(form.display).toBeDefined();
    expect(form.status).toBeDefined();
    expect(form.version).toBeDefined();
    expect(form.settings).toBeDefined();
    expect(form.createdAt).toBeDefined();
    expect(form.updatedAt).toBeDefined();

    // Should NOT have internal fields
    expect(form.parentId).toBeUndefined();
    expect(form.publishedVersionId).toBeUndefined();
    expect(form.fields).toBeUndefined();
  });

  test("should return type and display values correctly", async () => {
    const request = get("/forms", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);

    // Find specific forms and check their type/display
    const signupForm = responseData.data.find(
      (f: { id: string }) => f.id === rootForm1Id,
    );
    expect(signupForm.type).toBe("SIGN_UP");
    expect(signupForm.display).toBe("INLINE_EMBED");

    const contactForm = responseData.data.find(
      (f: { id: string }) => f.id === rootForm2Id,
    );
    expect(contactForm.type).toBe("SURVEY");
    expect(contactForm.display).toBe("POPUP");
  });

  test("should return forms in all statuses (DRAFT, PUBLISHED, ARCHIVED)", async () => {
    const request = get("/forms", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);

    const statuses = responseData.data.map((f: { status: string }) => f.status);
    expect(statuses).toContain("DRAFT");
    expect(statuses).toContain("PUBLISHED");
    expect(statuses).toContain("ARCHIVED");
  });

  test("should handle null description correctly", async () => {
    const request = get("/forms", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);

    // Find the form with null description (Contact Form)
    const formWithNullDesc = responseData.data.find(
      (f: { id: string }) => f.id === rootForm2Id,
    );
    expect(formWithNullDesc).toBeDefined();
    expect(formWithNullDesc.description).toBeNull();
  });
});

describe("GET /api/v1/forms - Pagination", () => {
  test("should support default pagination (20 items per page)", async () => {
    const request = get("/forms", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBeLessThanOrEqual(20);
  });

  test("should support custom limit parameter", async () => {
    const request = get("/forms?limit=2", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBeLessThanOrEqual(2);
  });

  test("should enforce maximum limit of 100", async () => {
    const request = get("/forms?limit=200", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    // Should clamp to 100, so we get at most 100 items
    expect(responseData.data.length).toBeLessThanOrEqual(100);
  });

  test("should support cursor-based pagination with after parameter", async () => {
    // Get first page
    const request1 = get("/forms?limit=1", fullAccessApiKey.key);
    const response1 = await GET(request1);
    const data1 = await response1.json();

    expect(response1.status).toBe(200);
    expect(data1.data.length).toBe(1);

    // Get next page using after cursor
    const firstItemId = data1.data[0].id;
    const request2 = get(
      `/forms?limit=1&after=${firstItemId}`,
      fullAccessApiKey.key,
    );
    const response2 = await GET(request2);
    const data2 = await response2.json();

    expect(response2.status).toBe(200);
    expect(data2.data.length).toBeGreaterThan(0);

    // Second page should have different items
    if (data2.data.length > 0) {
      expect(data2.data[0].id).not.toBe(firstItemId);
    }
  });

  test("should indicate hasMore correctly when more pages exist", async () => {
    const request = get("/forms?limit=1", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    // With 3 forms and limit=1, hasMore should be true
    expect(responseData.hasMore).toBe(true);
  });

  test("should indicate hasMore=false when no more pages exist", async () => {
    const request = get("/forms?limit=100", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    // With only 3 forms and limit=100, hasMore should be false
    expect(responseData.hasMore).toBe(false);
  });
});

describe("GET /api/v1/forms - Workspace Isolation", () => {
  test("should only return forms from the authenticated workspace", async () => {
    // Create another workspace with a form
    const otherWorkspace = createTestWorkspace();
    const _otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    await prisma.form.create({
      data: {
        workspaceId: otherWorkspace.id,
        name: "Other Workspace Form",
        status: "DRAFT",
        version: 1,
        fields: validFormSpec as never,
      },
    });

    // Query with original workspace API key
    const request = get("/forms", fullAccessApiKey.key);
    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);

    // Should only have 3 forms from test workspace
    expect(responseData.data.length).toBe(3);

    // None should be from other workspace
    const hasOtherWorkspaceForm = responseData.data.some(
      (f: { name: string }) => f.name === "Other Workspace Form",
    );
    expect(hasOtherWorkspaceForm).toBe(false);

    // Cleanup
    await cleanupWorkspace(otherWorkspace.id);
  });
});

describe("GET /api/v1/forms - Edge Cases", () => {
  test("should return empty list when workspace has no forms", async () => {
    const emptyWorkspace = createTestWorkspace();
    const emptyApiKey = await createFullAccessApiKey(emptyWorkspace.id);

    const request = get("/forms", emptyApiKey.key);
    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("form_list");
    expect(responseData.data).toEqual([]);
    expect(responseData.hasMore).toBe(false);

    // Cleanup
    await cleanupWorkspace(emptyWorkspace.id);
  });

  test("should handle invalid limit parameter gracefully", async () => {
    const request = get("/forms?limit=invalid", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    // Should fallback to default behavior (treat as NaN -> default to 20)
    expect(Array.isArray(responseData.data)).toBe(true);
  });

  test("should handle negative limit parameter gracefully", async () => {
    const request = get("/forms?limit=-10", fullAccessApiKey.key);

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    // Should clamp to minimum of 1
    expect(Array.isArray(responseData.data)).toBe(true);
  });
});
