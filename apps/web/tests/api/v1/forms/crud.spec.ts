/**
 * Integration tests for Form CRUD Operations (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/v1/forms/[formId] - Get form by ID
 * - PUT /api/v1/forms/[formId] - Update form (DRAFT only)
 * - DELETE /api/v1/forms/[formId] - Delete form
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { DELETE, GET, PUT } from "@/app/(main)/api/v1/forms/[formId]/route";
import { POST as CREATE_VERSION } from "@/app/(main)/api/v1/forms/[formId]/versions/route";
import { POST } from "@/app/(main)/api/v1/forms/route";
import { ErrorType } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  apiRequest,
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestWorkspace,
  del,
  post,
  put,
  type TestWorkspace,
} from "@/tests/utils";
import {
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

describe("GET /api/v1/forms/[formId]", () => {
  test("should get a form by ID with type and display", async () => {
    // Create a form first
    const createRequest = post(
      "/forms",
      {
        name: "Contact Form",
        description: "Get in touch",
        type: "SURVEY",
        display: "POPUP",
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
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
    expect(responseData.type).toBe("SURVEY");
    expect(responseData.display).toBe("POPUP");
    expect(responseData.status).toBe("DRAFT");
    expect(responseData.spec).toEqual(validFormSpec);
  });

  test("should return default type and display values", async () => {
    // Create a form without specifying type and display
    const createRequest = post(
      "/forms",
      {
        name: "Default Form",
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
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
    expect(responseData.type).toBe("SIGN_UP");
    expect(responseData.display).toBe("INLINE_EMBED");
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
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
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
    expect(responseData.error.message).toContain("scope");
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
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
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
      fullAccessApiKey.key,
    );

    const response = await PUT(updateRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBe(createdForm.id);
  });

  test("should update form type and display", async () => {
    // Create a form with default type and display
    const createRequest = post(
      "/forms",
      {
        name: "Type Test Form",
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    // Update type and display
    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        type: "SURVEY",
        display: "POPUP",
      },
      fullAccessApiKey.key,
    );

    const response = await PUT(updateRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });

    expect(response.status).toBe(200);

    // Verify type and display were updated
    const getRequest = apiRequest(`/forms/${createdForm.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const getResponse = await GET(getRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const formData = await getResponse.json();

    expect(formData.type).toBe("SURVEY");
    expect(formData.display).toBe("POPUP");
  });

  test("should reject invalid type value on update", async () => {
    // Create a form
    const createRequest = post(
      "/forms",
      {
        name: "Test Form",
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    // Try to update with invalid type
    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        type: "INVALID_TYPE",
      },
      fullAccessApiKey.key,
    );

    const response = await PUT(updateRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
  });

  test("should update form fields", async () => {
    // Create a form
    const createRequest = post(
      "/forms",
      {
        name: "Test Form",
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    // New spec with updated structure
    const newSpec = {
      root: "form",
      elements: {
        form: {
          type: "FormRoot",
          props: { submitLabel: "Submit" },
          children: ["email-field", "firstName-field", "lastName-field"],
        },
        "email-field": {
          type: "Input",
          props: { name: "email", label: "Email Address", type: "email" },
        },
        "firstName-field": {
          type: "Input",
          props: { name: "firstName", label: "First Name" },
        },
        "lastName-field": {
          type: "Input",
          props: { name: "lastName", label: "Last Name" },
        },
      },
    };

    // Update the form spec and fieldMapping together
    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        spec: newSpec,
        fieldMapping: {
          email: {
            contactPropertyId: "email",
            contactPropertyType: "standard",
            fieldType: "string",
          },
          firstName: {
            contactPropertyId: "firstName",
            contactPropertyType: "standard",
            fieldType: "string",
          },
          lastName: {
            contactPropertyId: "lastName",
            contactPropertyType: "standard",
            fieldType: "string",
          },
        },
      },
      fullAccessApiKey.key,
    );

    const response = await PUT(updateRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });

    expect(response.status).toBe(200);
  });

  test("should update form settings", async () => {
    // Create a form
    const createRequest = post(
      "/forms",
      {
        name: "Test Form",
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    const newSettings = {
      successAction: {
        type: "redirect" as const,
        url: "https://example.com/thank-you",
        openInNewTab: false,
      },
      doubleOptIn: {
        enabled: true,
      },
      preventDuplicateSubmissions: true,
    };

    // Update the form settings
    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        settings: newSettings,
      },
      fullAccessApiKey.key,
    );

    const response = await PUT(updateRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });

    expect(response.status).toBe(200);

    // Verify settings were updated by fetching the form
    const getRequest = apiRequest(`/forms/${createdForm.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const getResponse = await GET(getRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const formData = await getResponse.json();

    expect(formData.settings).toEqual(newSettings);
  });

  test("should not allow updating published forms", async () => {
    // Create a form
    const createRequest = post(
      "/forms",
      {
        name: "Test Form",
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
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
      fullAccessApiKey.key,
    );

    const response = await PUT(updateRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("DRAFT");
  });

  test("should not allow updating archived forms", async () => {
    // Create a form
    const createRequest = post(
      "/forms",
      {
        name: "Test Form",
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
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
      fullAccessApiKey.key,
    );

    const response = await PUT(updateRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("DRAFT");
  });

  test("should return 404 for non-existent form", async () => {
    const request = put(
      "/forms/nonexistent",
      { name: "New Name" },
      fullAccessApiKey.key,
    );

    const response = await PUT(request, {
      params: Promise.resolve({ formId: "nonexistent" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should require update:forms scope", async () => {
    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:forms"],
    });

    const request = put(
      "/forms/some-id",
      { name: "New Name" },
      readOnlyKey.key,
    );

    const response = await PUT(request, {
      params: Promise.resolve({ formId: "some-id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.message).toContain("scope");
  });
});

describe("DELETE /api/v1/forms/[formId]", () => {
  test("should delete a form", async () => {
    // Create a form
    const createRequest = post(
      "/forms",
      {
        name: "Form to Delete",
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
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
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBeDefined();
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
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
    expect(responseData.error.message).toContain("scope");
  });

  test("should delete a version without affecting parent or other versions", async () => {
    // Create a root form
    const createRequest = post(
      "/forms",
      {
        name: "Root Form",
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
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

    // Create version 2 (DRAFT by default)
    const version2Request = post(
      `/forms/${rootForm.id}/versions`,
      {},
      fullAccessApiKey.key,
    );

    const version2Response = await CREATE_VERSION(version2Request, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version2 = await version2Response.json();

    // Archive root (but keep version 2 as DRAFT so it can be deleted)
    await prisma.form.update({
      where: { id: rootForm.id },
      data: {
        status: "ARCHIVED",
      },
    });

    // Create version 3 directly via prisma (as ARCHIVED to avoid DRAFT constraint)
    const version3 = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        parentId: rootForm.id,
        name: "Root Form",
        fields: validFormSpec as never,
        version: 3,
        status: "ARCHIVED",
      },
    });

    // Delete version 2 (which is in DRAFT status)
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
    // Create a root form (DRAFT by default - must stay DRAFT to be deletable)
    const createRequest = post(
      "/forms",
      {
        name: "Root Form",
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const rootForm = await createResponse.json();

    // Create version 2 directly via prisma (to avoid the "only one DRAFT" constraint)
    const version2 = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        parentId: rootForm.id,
        name: "Root Form",
        fields: validFormSpec as never,
        version: 2,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    // Create version 3
    const version3 = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        parentId: rootForm.id,
        name: "Root Form",
        fields: validFormSpec as never,
        version: 3,
        status: "ARCHIVED",
      },
    });

    // Delete root form (which is in DRAFT status)
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

    // Verify all versions are cascade deleted (regardless of their status)
    const version2Check = await prisma.form.findUnique({
      where: { id: version2.id },
    });
    expect(version2Check).toBeNull();

    const version3Check = await prisma.form.findUnique({
      where: { id: version3.id },
    });
    expect(version3Check).toBeNull();
  });

  test("should return 400 when trying to delete a published form", async () => {
    // Create and publish a form
    const createRequest = post(
      "/forms",
      {
        name: "Published Form",
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const form = await createResponse.json();

    // Publish the form
    await prisma.form.update({
      where: { id: form.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishedVersionId: form.id,
      },
    });

    // Try to delete published form
    const deleteRequest = del(`/forms/${form.id}`, fullAccessApiKey.key);

    const response = await DELETE(deleteRequest, {
      params: Promise.resolve({ formId: form.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe("FORM_NOT_DELETABLE");
    expect(responseData.error.message).toContain("DRAFT");
  });

  test("should return 400 when trying to delete an archived form", async () => {
    // Create and archive a form
    const createRequest = post(
      "/forms",
      {
        name: "Archived Form",
        spec: validFormSpec,
        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const form = await createResponse.json();

    // Archive the form
    await prisma.form.update({
      where: { id: form.id },
      data: {
        status: "ARCHIVED",
      },
    });

    // Try to delete archived form
    const deleteRequest = del(`/forms/${form.id}`, fullAccessApiKey.key);

    const response = await DELETE(deleteRequest, {
      params: Promise.resolve({ formId: form.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe("FORM_NOT_DELETABLE");
    expect(responseData.error.message).toContain("DRAFT");
  });
});
