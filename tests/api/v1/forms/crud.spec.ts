/**
 * Integration tests for Form CRUD Operations (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/forms/[formId] - Get form by ID
 * - PUT /api/v1/forms/[formId] - Update form (DRAFT only)
 * - DELETE /api/v1/forms/[formId] - Delete form
 */

import { GET, PUT, DELETE } from "@/app/api/v1/forms/[formId]/route";
import { POST } from "@/app/api/v1/forms/route";
import { POST as CREATE_VERSION } from "@/app/api/v1/forms/[formId]/versions/route";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  cleanupWorkspace,
  post,
  put,
  del,
  apiRequest,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";
import { prisma } from "@/lib/db";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

const validFormFields = {
  pages: [
    {
      elements: [
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

describe("GET /api/v1/forms/[formId]", () => {
  test("should get a form by ID", async () => {
    // Create a form first
    const createRequest = post(
      "/forms",
      {
        name: "Contact Form",
        description: "Get in touch",
        fields: validFormFields,
      },
      fullAccessApiKey.key
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    // Get the form
    const getRequest = apiRequest(`/forms/${createdForm.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const response = await GET(getRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBe(createdForm.id);
    expect(responseData.name).toBe("Contact Form");
    expect(responseData.description).toBe("Get in touch");
    expect(responseData.status).toBe("DRAFT");
    expect(responseData.fields).toEqual(validFormFields);
  });

  test("should return 404 for non-existent form", async () => {
    const request = apiRequest("/forms/nonexistent")
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const response = await GET(request, {
      params: Promise.resolve({ formId: "nonexistent" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
  });

  test("should require read:forms scope", async () => {
    const writeOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:forms"],
    });

    const request = apiRequest("/forms/some-id")
      .method("GET")
      .auth(writeOnlyKey.key)
      .build();

    const response = await GET(request, {
      params: Promise.resolve({ formId: "some-id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toContain("scope");
  });
});

describe("PUT /api/v1/forms/[formId]", () => {
  test("should update a DRAFT form", async () => {
    // Create a form
    const createRequest = post(
      "/forms",
      {
        name: "Original Name",
        description: "Original description",
        fields: validFormFields,
      },
      fullAccessApiKey.key
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    // Update the form
    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        name: "Updated Name",
        description: "Updated description",
      },
      fullAccessApiKey.key
    );

    const response = await PUT(updateRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBe(createdForm.id);
  });

  test("should update form fields", async () => {
    // Create a form
    const createRequest = post(
      "/forms",
      {
        name: "Test Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    const newFields = {
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
              name: "lastName",
              title: "Last Name",
            },
          ],
        },
      ],
    };

    // Update the form fields
    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        fields: newFields,
      },
      fullAccessApiKey.key
    );

    const response = await PUT(updateRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });

    expect(response.status).toBe(200);
  });

  test("should not allow updating published forms", async () => {
    // Create a form
    const createRequest = post(
      "/forms",
      {
        name: "Test Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    // Manually update the form to PUBLISHED status (self-reference)
    await prisma.form.update({
      where: { id: createdForm.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishedVersionId: createdForm.id, // Self-reference
      },
    });

    // Try to update the published form
    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        name: "Updated Name",
      },
      fullAccessApiKey.key
    );

    const response = await PUT(updateRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toContain("DRAFT");
  });

  test("should not allow updating archived forms", async () => {
    // Create a form
    const createRequest = post(
      "/forms",
      {
        name: "Test Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    // Manually update the form to ARCHIVED status
    await prisma.form.update({
      where: { id: createdForm.id },
      data: { status: "ARCHIVED" },
    });

    // Try to update the archived form
    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        name: "Updated Name",
      },
      fullAccessApiKey.key
    );

    const response = await PUT(updateRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toContain("DRAFT");
  });

  test("should return 404 for non-existent form", async () => {
    const request = put(
      "/forms/nonexistent",
      { name: "New Name" },
      fullAccessApiKey.key
    );

    const response = await PUT(request, {
      params: Promise.resolve({ formId: "nonexistent" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
  });

  test("should require update:forms scope", async () => {
    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:forms"],
    });

    const request = put(
      "/forms/some-id",
      { name: "New Name" },
      readOnlyKey.key
    );

    const response = await PUT(request, {
      params: Promise.resolve({ formId: "some-id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toContain("scope");
  });
});

describe("DELETE /api/v1/forms/[formId]", () => {
  test("should delete a form", async () => {
    // Create a form
    const createRequest = post(
      "/forms",
      {
        name: "Form to Delete",
        fields: validFormFields,
      },
      fullAccessApiKey.key
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    // Delete the form
    const deleteRequest = del(`/forms/${createdForm.id}`, fullAccessApiKey.key);

    const response = await DELETE(deleteRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBe(createdForm.id);

    // Verify form is deleted
    const form = await prisma.form.findUnique({
      where: { id: createdForm.id },
    });
    expect(form).toBeNull();
  });

  test("should return 404 for non-existent form", async () => {
    const request = del("/forms/nonexistent", fullAccessApiKey.key);

    const response = await DELETE(request, {
      params: Promise.resolve({ formId: "nonexistent" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
  });

  test("should require delete:forms scope", async () => {
    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:forms"],
    });

    const request = del("/forms/some-id", readOnlyKey.key);

    const response = await DELETE(request, {
      params: Promise.resolve({ formId: "some-id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toContain("scope");
  });

  test("should delete a version without affecting parent or other versions", async () => {
    // Create a root form
    const createRequest = post(
      "/forms",
      {
        name: "Root Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key
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
      fullAccessApiKey.key
    );

    const version2Response = await CREATE_VERSION(version2Request, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version2 = await version2Response.json();

    // Archive root and publish version 2
    await prisma.form.update({
      where: { id: rootForm.id },
      data: {
        status: "ARCHIVED",
        publishedVersionId: version2.id, // Update to point to version 2
      },
    });

    await prisma.form.update({
      where: { id: version2.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });

    // Create version 3
    const version3Request = post(
      `/forms/${rootForm.id}/versions`,
      {},
      fullAccessApiKey.key
    );

    const version3Response = await CREATE_VERSION(version3Request, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version3 = await version3Response.json();

    // Delete version 2
    const deleteRequest = del(`/forms/${version2.id}`, fullAccessApiKey.key);

    const response = await DELETE(deleteRequest, {
      params: Promise.resolve({ formId: version2.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBe(version2.id);

    // Verify version 2 is deleted
    const deletedVersion = await prisma.form.findUnique({
      where: { id: version2.id },
    });
    expect(deletedVersion).toBeNull();

    // Verify root form still exists
    const rootFormCheck = await prisma.form.findUnique({
      where: { id: rootForm.id },
    });
    expect(rootFormCheck).not.toBeNull();
    expect(rootFormCheck?.id).toBe(rootForm.id);

    // Verify version 3 still exists
    const version3Check = await prisma.form.findUnique({
      where: { id: version3.id },
    });
    expect(version3Check).not.toBeNull();
    expect(version3Check?.id).toBe(version3.id);
  });

  test("should cascade delete all versions when deleting root form", async () => {
    // Create a root form
    const createRequest = post(
      "/forms",
      {
        name: "Root Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key
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
      fullAccessApiKey.key
    );

    const version2Response = await CREATE_VERSION(version2Request, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version2 = await version2Response.json();

    // Archive root and publish version 2
    await prisma.form.update({
      where: { id: rootForm.id },
      data: {
        status: "ARCHIVED",
        publishedVersionId: version2.id, // Update to point to version 2
      },
    });

    await prisma.form.update({
      where: { id: version2.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });

    // Create version 3
    const version3Request = post(
      `/forms/${rootForm.id}/versions`,
      {},
      fullAccessApiKey.key
    );

    const version3Response = await CREATE_VERSION(version3Request, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version3 = await version3Response.json();

    // Delete root form
    const deleteRequest = del(`/forms/${rootForm.id}`, fullAccessApiKey.key);

    const response = await DELETE(deleteRequest, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBe(rootForm.id);

    // Verify root form is deleted
    const rootFormCheck = await prisma.form.findUnique({
      where: { id: rootForm.id },
    });
    expect(rootFormCheck).toBeNull();

    // Verify all versions are cascade deleted
    const version2Check = await prisma.form.findUnique({
      where: { id: version2.id },
    });
    expect(version2Check).toBeNull();

    const version3Check = await prisma.form.findUnique({
      where: { id: version3.id },
    });
    expect(version3Check).toBeNull();
  });
});
