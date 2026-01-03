/**
 * Integration tests for Form Versions (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/forms/[formId]/versions - Create new version
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { GET } from "@/app/(main)/api/v1/forms/[formId]/route";
import { POST as CREATE_VERSION } from "@/app/(main)/api/v1/forms/[formId]/versions/route";
import { POST } from "@/app/(main)/api/v1/forms/route";
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
import { validFormFields } from "@/tests/utils/form-fixtures";

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

describe("POST /api/v1/forms/[formId]/versions - Authentication & Authorization", () => {
  test("should reject request without write:forms scope", async () => {
    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:forms"],
    });

    const request = post("/forms/some-id/versions", {}, readOnlyKey.key);

    const response = await CREATE_VERSION(request, {
      params: Promise.resolve({ formId: "some-id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should accept request with write:forms scope", async () => {
    // Create a form first
    const createRequest = post(
      "/forms",
      {
        name: "Test Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    const writeFormsKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:forms"],
    });

    const versionRequest = post(
      `/forms/${createdForm.id}/versions`,
      {},
      writeFormsKey.key,
    );

    const response = await CREATE_VERSION(versionRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBeDefined();
  });
});

describe("POST /api/v1/forms/[formId]/versions - Version Creation", () => {
  test("should create version from root form", async () => {
    // Create a root form
    const createRequest = post(
      "/forms",
      {
        name: "Root Form",
        description: "Original description",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const rootForm = await createResponse.json();

    // Create a version
    const versionRequest = post(
      `/forms/${rootForm.id}/versions`,
      {},
      fullAccessApiKey.key,
    );

    const versionResponse = await CREATE_VERSION(versionRequest, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const versionData = await versionResponse.json();

    expect(versionResponse.status).toBe(201);
    expect(versionData.object).toBe("form");
    expect(versionData.id).toBeDefined();
    expect(versionData.id).not.toBe(rootForm.id);

    // Verify version inherits fields from root
    const getRequest = apiRequest(`/forms/${versionData.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const getResponse = await GET(getRequest, {
      params: Promise.resolve({ formId: versionData.id }),
    });
    const versionDetails = await getResponse.json();

    expect(versionDetails.name).toBe("Root Form");
    expect(versionDetails.description).toBe("Original description");
    expect(versionDetails.fields).toEqual(validFormFields);
    expect(versionDetails.status).toBe("DRAFT");
    expect(versionDetails.version).toBe(2);
  });

  test("should create version from existing version (uses root parent)", async () => {
    // Create a root form
    const createRequest = post(
      "/forms",
      {
        name: "Root Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const rootForm = await createResponse.json();

    // Publish root form (self-reference for first publish)
    await prisma.form.update({
      where: { id: rootForm.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishedVersionId: rootForm.id, // Self-reference
      },
    });

    // Create version 2
    const version2Request = post(
      `/forms/${rootForm.id}/versions`,
      {},
      fullAccessApiKey.key,
    );

    const version2Response = await CREATE_VERSION(version2Request, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version2 = await version2Response.json();

    // Publish version 2 and update root to point to it
    await prisma.form.update({
      where: { id: rootForm.id },
      data: {
        status: "ARCHIVED",
        publishedVersionId: version2.id, // Point to version 2
      },
    });

    await prisma.form.update({
      where: { id: version2.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });

    // Create version 3 from version 2 (should still use root as parent)
    const version3Request = post(
      `/forms/${version2.id}/versions`,
      {},
      fullAccessApiKey.key,
    );

    const version3Response = await CREATE_VERSION(version3Request, {
      params: Promise.resolve({ formId: version2.id }),
    });
    const version3 = await version3Response.json();

    expect(version3Response.status).toBe(201);
    expect(version3.id).toBeDefined();

    // Verify version 3 has correct version number
    const getRequest = apiRequest(`/forms/${version3.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const getResponse = await GET(getRequest, {
      params: Promise.resolve({ formId: version3.id }),
    });
    const version3Details = await getResponse.json();

    expect(version3Details.version).toBe(3);
  });

  test("should override fields when provided in version request", async () => {
    // Create a root form
    const createRequest = post(
      "/forms",
      {
        name: "Original Name",
        description: "Original description",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const rootForm = await createResponse.json();

    // New fields with updated structure (must include email for sign-up forms)
    const newFields = {
      ...validFormFields,
      id: "updated_form",
      title: "Updated Form",
      pages: [
        {
          id: "page_1",
          sections: [
            {
              id: "section_1",
              fields: [
                {
                  id: "field_email",
                  type: "email",
                  name: "email",
                  label: "Email Address",
                  validation: { required: true },
                  appearance: {
                    width: "full",
                    labelPosition: "top",
                    size: "default",
                  },
                },
                {
                  id: "field_firstName",
                  type: "text",
                  name: "firstName",
                  label: "First Name",
                  validation: { required: true },
                  appearance: {
                    width: "full",
                    labelPosition: "top",
                    size: "default",
                  },
                },
              ],
              collapsible: false,
              defaultCollapsed: false,
            },
          ],
        },
      ],
    };

    // Create version with custom fields
    const versionRequest = post(
      `/forms/${rootForm.id}/versions`,
      {
        name: "Updated Name",
        description: "Updated description",
        fields: newFields,
      },
      fullAccessApiKey.key,
    );

    const versionResponse = await CREATE_VERSION(versionRequest, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version = await versionResponse.json();

    // Verify version uses provided fields
    const getRequest = apiRequest(`/forms/${version.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const getResponse = await GET(getRequest, {
      params: Promise.resolve({ formId: version.id }),
    });
    const versionDetails = await getResponse.json();

    expect(versionDetails.name).toBe("Updated Name");
    expect(versionDetails.description).toBe("Updated description");
    expect(versionDetails.fields).toEqual(newFields);
    expect(versionDetails.version).toBe(2);
  });

  test("should partially override fields (name only)", async () => {
    // Create a root form
    const createRequest = post(
      "/forms",
      {
        name: "Original Name",
        description: "Original description",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const rootForm = await createResponse.json();

    // Create version with only name override
    const versionRequest = post(
      `/forms/${rootForm.id}/versions`,
      {
        name: "Updated Name Only",
      },
      fullAccessApiKey.key,
    );

    const versionResponse = await CREATE_VERSION(versionRequest, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version = await versionResponse.json();

    // Verify version uses new name but inherits description and fields
    const getRequest = apiRequest(`/forms/${version.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const getResponse = await GET(getRequest, {
      params: Promise.resolve({ formId: version.id }),
    });
    const versionDetails = await getResponse.json();

    expect(versionDetails.name).toBe("Updated Name Only");
    expect(versionDetails.description).toBe("Original description");
    expect(versionDetails.fields).toEqual(validFormFields);
  });

  test("should return 404 for non-existent form", async () => {
    const request = post(
      "/forms/nonexistent/versions",
      {},
      fullAccessApiKey.key,
    );

    const response = await CREATE_VERSION(request, {
      params: Promise.resolve({ formId: "nonexistent" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should create multiple versions with incrementing version numbers", async () => {
    // Create a root form
    const createRequest = post(
      "/forms",
      {
        name: "Multi-version Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const rootForm = await createResponse.json();

    // Get root form details (should be version 1)
    const getRootRequest = apiRequest(`/forms/${rootForm.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const getRootResponse = await GET(getRootRequest, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const rootDetails = await getRootResponse.json();

    expect(rootDetails.version).toBe(1);

    // Publish root form so we can create a version
    await prisma.form.update({
      where: { id: rootForm.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });

    // Create version 2
    const version2Request = post(
      `/forms/${rootForm.id}/versions`,
      {},
      fullAccessApiKey.key,
    );

    const version2Response = await CREATE_VERSION(version2Request, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version2 = await version2Response.json();

    // Get version 2 details
    const getVersion2Request = apiRequest(`/forms/${version2.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const getVersion2Response = await GET(getVersion2Request, {
      params: Promise.resolve({ formId: version2.id }),
    });
    const version2Details = await getVersion2Response.json();

    expect(version2Details.version).toBe(2);

    // Archive root and publish version 2 so we can create version 3
    await prisma.form.update({
      where: { id: rootForm.id },
      data: { status: "ARCHIVED" },
    });

    await prisma.form.update({
      where: { id: version2.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });

    // Create version 3
    const version3Request = post(
      `/forms/${rootForm.id}/versions`,
      {},
      fullAccessApiKey.key,
    );

    const version3Response = await CREATE_VERSION(version3Request, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version3 = await version3Response.json();

    // Get version 3 details
    const getVersion3Request = apiRequest(`/forms/${version3.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const getVersion3Response = await GET(getVersion3Request, {
      params: Promise.resolve({ formId: version3.id }),
    });
    const version3Details = await getVersion3Response.json();

    expect(version3Details.version).toBe(3);
  });

  test("should reject creating version when DRAFT already exists", async () => {
    // Create a root form
    const createRequest = post(
      "/forms",
      {
        name: "Test Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const rootForm = await createResponse.json();

    // Publish root form
    await prisma.form.update({
      where: { id: rootForm.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });

    // Create version 2 (will be DRAFT)
    const version2Request = post(
      `/forms/${rootForm.id}/versions`,
      {},
      fullAccessApiKey.key,
    );

    const version2Response = await CREATE_VERSION(version2Request, {
      params: Promise.resolve({ formId: rootForm.id }),
    });

    expect(version2Response.status).toBe(201);

    // Try to create another version without publishing version 2
    const version3Request = post(
      `/forms/${rootForm.id}/versions`,
      {},
      fullAccessApiKey.key,
    );

    const version3Response = await CREATE_VERSION(version3Request, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const responseData = await version3Response.json();

    expect(version3Response.status).toBe(409);
    expect(responseData.error.message).toContain(
      "DRAFT version already exists",
    );
  });
});
