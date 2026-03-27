/**
 * Integration tests for List Form Versions (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/forms/{formId}/versions - List all versions of a form
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { GET } from "@/app/(main)/api/v1/forms/[formId]/versions/route";
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
let rootFormId: string;
let version2Id: string;
let version3Id: string;
let anotherRootFormId: string;

/**
 * Setup: Create a test workspace, API keys, and test forms with versions
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
  readOnlyApiKey = await createTestApiKey({
    workspaceId: testWorkspace.id,
    scopes: ["read:forms"],
  });

  // Create root form (version 1)
  const rootForm = await prisma.form.create({
    data: {
      workspaceId: testWorkspace.id,
      name: "Newsletter Signup",
      description: "Subscribe to our newsletter",
      status: "ARCHIVED", // Was published, now archived
      version: 1,
      fields: validFormSpec as never,
    },
  });
  rootFormId = rootForm.id;

  // Create version 2 (currently published)
  const version2 = await prisma.form.create({
    data: {
      workspaceId: testWorkspace.id,
      parentId: rootFormId,
      name: "Newsletter Signup v2",
      description: "Updated signup form",
      status: "PUBLISHED",
      version: 2,
      fields: validFormSpec as never,
    },
  });
  version2Id = version2.id;

  // Create version 3 (draft)
  const version3 = await prisma.form.create({
    data: {
      workspaceId: testWorkspace.id,
      parentId: rootFormId,
      name: "Newsletter Signup v3",
      description: "New draft version",
      status: "DRAFT",
      version: 3,
      fields: validFormSpec as never,
    },
  });
  version3Id = version3.id;

  // Create another root form (for testing isolation)
  const anotherRoot = await prisma.form.create({
    data: {
      workspaceId: testWorkspace.id,
      name: "Contact Form",
      description: null,
      status: "DRAFT",
      version: 1,
      fields: validFormSpec as never,
    },
  });
  anotherRootFormId = anotherRoot.id;
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("GET /api/v1/forms/{formId}/versions - Authentication & Authorization", () => {
  test("should reject request with missing Authorization header", async () => {
    const request = apiRequest(`/forms/${rootFormId}/versions`)
      .method("GET")
      .build();

    const response = await GET(request, {
      params: Promise.resolve({ formId: rootFormId }),
    });
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
    const request = get(
      `/forms/${rootFormId}/versions`,
      "kb_invalid_key_12345",
    );

    const response = await GET(request, {
      params: Promise.resolve({ formId: rootFormId }),
    });
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

    const request = get(`/forms/${rootFormId}/versions`, writeOnlyKey.key);

    const response = await GET(request, {
      params: Promise.resolve({ formId: rootFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toContain("read:forms");
  });

  test("should allow request with read:forms scope", async () => {
    const request = get(`/forms/${rootFormId}/versions`, readOnlyApiKey.key);

    const response = await GET(request, {
      params: Promise.resolve({ formId: rootFormId }),
    });

    expect(response.status).toBe(200);
  });
});

describe("GET /api/v1/forms/{formId}/versions - List Versions", () => {
  test("should list all versions of a form with correct structure", async () => {
    const request = get(`/forms/${rootFormId}/versions`, fullAccessApiKey.key);

    const response = await GET(request, {
      params: Promise.resolve({ formId: rootFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("form_version_list");
    expect(Array.isArray(responseData.data)).toBe(true);
    expect(responseData.data.length).toBe(3); // Root + 2 versions
  });

  test("should include all versions (root form + child versions)", async () => {
    const request = get(`/forms/${rootFormId}/versions`, fullAccessApiKey.key);

    const response = await GET(request, {
      params: Promise.resolve({ formId: rootFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);

    const versionIds = responseData.data.map((v: { id: string }) => v.id);
    expect(versionIds).toContain(rootFormId); // Root form (v1)
    expect(versionIds).toContain(version2Id); // Version 2
    expect(versionIds).toContain(version3Id); // Version 3
  });

  test("should return versions ordered by version number (ascending)", async () => {
    const request = get(`/forms/${rootFormId}/versions`, fullAccessApiKey.key);

    const response = await GET(request, {
      params: Promise.resolve({ formId: rootFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);

    const versions = responseData.data.map(
      (v: { version: number }) => v.version,
    );
    expect(versions).toEqual([1, 2, 3]); // Ascending order
  });

  test("should return correct fields for each version", async () => {
    const request = get(`/forms/${rootFormId}/versions`, fullAccessApiKey.key);

    const response = await GET(request, {
      params: Promise.resolve({ formId: rootFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);

    const version = responseData.data[0];

    // Should have these fields
    expect(version.id).toBeDefined();
    expect(version.name).toBeDefined();
    expect(version.description).toBeDefined();
    expect(version.status).toBeDefined();
    expect(version.version).toBeDefined();

    // Should NOT have these internal fields
    expect(version.parentId).toBeUndefined();
    expect(version.publishedVersionId).toBeUndefined();
    expect(version.publishedAt).toBeUndefined();
    expect(version.createdAt).toBeUndefined();
    expect(version.updatedAt).toBeUndefined();
    expect(version.fields).toBeUndefined();
    expect(version.settings).toBeUndefined();
  });

  test("should return versions in all statuses (DRAFT, PUBLISHED, ARCHIVED)", async () => {
    const request = get(`/forms/${rootFormId}/versions`, fullAccessApiKey.key);

    const response = await GET(request, {
      params: Promise.resolve({ formId: rootFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);

    const statuses = responseData.data.map((v: { status: string }) => v.status);
    expect(statuses).toContain("DRAFT");
    expect(statuses).toContain("PUBLISHED");
    expect(statuses).toContain("ARCHIVED");
  });

  test("should handle null description correctly", async () => {
    const request = get(
      `/forms/${anotherRootFormId}/versions`,
      fullAccessApiKey.key,
    );

    const response = await GET(request, {
      params: Promise.resolve({ formId: anotherRootFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.length).toBe(1); // Only root form, no versions

    const version = responseData.data[0];
    expect(version.description).toBeNull();
  });
});

describe("GET /api/v1/forms/{formId}/versions - Error Cases", () => {
  test("should return 404 for non-existent form", async () => {
    const fakeFormId = "fake-form-id-12345";
    const request = get(`/forms/${fakeFormId}/versions`, fullAccessApiKey.key);

    const response = await GET(request, {
      params: Promise.resolve({ formId: fakeFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.FORM_NOT_FOUND);
    expect(responseData.error.message).toContain("not found");
  });

  test("should return 404 when trying to list versions of a version (not root form)", async () => {
    // Try to get versions of version2 (which is a child, not a root)
    const request = get(`/forms/${version2Id}/versions`, fullAccessApiKey.key);

    const response = await GET(request, {
      params: Promise.resolve({ formId: version2Id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.FORM_NOT_FOUND);
    expect(responseData.error.message).toContain("not a root form");
  });

  test("should return 404 for form from different workspace", async () => {
    // Create another workspace with a form
    const otherWorkspace = createTestWorkspace();
    const _otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const otherForm = await prisma.form.create({
      data: {
        workspaceId: otherWorkspace.id,
        name: "Other Workspace Form",
        status: "DRAFT",
        version: 1,
        fields: validFormSpec as never,
      },
    });

    // Try to access other workspace's form with original API key
    const request = get(
      `/forms/${otherForm.id}/versions`,
      fullAccessApiKey.key,
    );

    const response = await GET(request, {
      params: Promise.resolve({ formId: otherForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.FORM_NOT_FOUND);

    // Cleanup
    await cleanupWorkspace(otherWorkspace.id);
  });
});

describe("GET /api/v1/forms/{formId}/versions - Single Version Form", () => {
  test("should return single version when form has no child versions", async () => {
    const request = get(
      `/forms/${anotherRootFormId}/versions`,
      fullAccessApiKey.key,
    );

    const response = await GET(request, {
      params: Promise.resolve({ formId: anotherRootFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("form_version_list");
    expect(responseData.data.length).toBe(1); // Only root form
    expect(responseData.data[0].version).toBe(1);
  });
});

describe("GET /api/v1/forms/{formId}/versions - Workspace Isolation", () => {
  test("should not return versions from other workspaces", async () => {
    // Create another workspace with same form ID structure
    const otherWorkspace = createTestWorkspace();
    const _otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    // Create a form in other workspace
    const otherRoot = await prisma.form.create({
      data: {
        workspaceId: otherWorkspace.id,
        name: "Other Root",
        status: "DRAFT",
        version: 1,
        fields: validFormSpec as never,
      },
    });

    // Query original form versions - should not include other workspace data
    const request = get(`/forms/${rootFormId}/versions`, fullAccessApiKey.key);
    const response = await GET(request, {
      params: Promise.resolve({ formId: rootFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);

    // Should only have 3 versions from original workspace
    expect(responseData.data.length).toBe(3);

    // None should be from other workspace
    const hasOtherWorkspaceVersion = responseData.data.some(
      (v: { id: string }) => v.id === otherRoot.id,
    );
    expect(hasOtherWorkspaceVersion).toBe(false);

    // Cleanup
    await cleanupWorkspace(otherWorkspace.id);
  });
});

describe("GET /api/v1/forms/{formId}/versions - Version Metadata", () => {
  test("should return correct version numbers", async () => {
    const request = get(`/forms/${rootFormId}/versions`, fullAccessApiKey.key);

    const response = await GET(request, {
      params: Promise.resolve({ formId: rootFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);

    const v1 = responseData.data.find(
      (v: { version: number }) => v.version === 1,
    );
    const v2 = responseData.data.find(
      (v: { version: number }) => v.version === 2,
    );
    const v3 = responseData.data.find(
      (v: { version: number }) => v.version === 3,
    );

    expect(v1).toBeDefined();
    expect(v1.name).toBe("Newsletter Signup");
    expect(v1.status).toBe("ARCHIVED");

    expect(v2).toBeDefined();
    expect(v2.name).toBe("Newsletter Signup v2");
    expect(v2.status).toBe("PUBLISHED");

    expect(v3).toBeDefined();
    expect(v3.name).toBe("Newsletter Signup v3");
    expect(v3.status).toBe("DRAFT");
  });

  test("should maintain version order consistency across multiple calls", async () => {
    const request1 = get(`/forms/${rootFormId}/versions`, fullAccessApiKey.key);
    const response1 = await GET(request1, {
      params: Promise.resolve({ formId: rootFormId }),
    });
    const data1 = await response1.json();

    const request2 = get(`/forms/${rootFormId}/versions`, fullAccessApiKey.key);
    const response2 = await GET(request2, {
      params: Promise.resolve({ formId: rootFormId }),
    });
    const data2 = await response2.json();

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);

    // Version order should be consistent
    const versions1 = data1.data.map((v: { version: number }) => v.version);
    const versions2 = data2.data.map((v: { version: number }) => v.version);

    expect(versions1).toEqual(versions2);
    expect(versions1).toEqual([1, 2, 3]);
  });
});
