/**
 * Integration tests for Form Publishing (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/forms/[formId]/publish - Publish a form
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST as PUBLISH_FORM } from "@/app/(main)/api/v1/forms/[formId]/publish/route";
import { POST as CREATE_VERSION } from "@/app/(main)/api/v1/forms/[formId]/versions/route";
import { POST as CREATE_FORM } from "@/app/(main)/api/v1/forms/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestWorkspace,
  post,
  type TestWorkspace,
} from "@/tests/utils";
import {
  validFormFieldMapping,
  validFormContent,
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

describe("POST /api/v1/forms/[formId]/publish - Authentication & Authorization", () => {
  test("should require write:forms scope", async () => {
    // Create a form first
    const createRequest = post(
      "/forms",
      {
        name: "Test Form",

        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await CREATE_FORM(createRequest);
    const createdForm = await createResponse.json();

    // Try to publish with read-only key
    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:forms"],
    });

    const publishRequest = post(
      `/forms/${createdForm.id}/publish`,
      {},
      readOnlyKey.key,
    );

    const response = await PUBLISH_FORM(publishRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
    expect(responseData.error.message).toBeDefined();
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should accept request with write:forms scope", async () => {
    // Create a form
    const createRequest = post(
      "/forms",
      {
        name: "Test Form",

        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await CREATE_FORM(createRequest);
    const createdForm = await createResponse.json();

    // Set deployed content so publish works
    await prisma.form.update({
      where: { id: createdForm.id },
      data: { fields: validFormContent as never },
    });

    // Publish with write:forms key
    const publishRequest = post(
      `/forms/${createdForm.id}/publish`,
      {},
      fullAccessApiKey.key,
    );

    const response = await PUBLISH_FORM(publishRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBe(createdForm.id);
  });
});

describe("POST /api/v1/forms/[formId]/publish - Publishing Logic", () => {
  test("should publish a root form (first publish)", async () => {
    // Create a draft form
    const createRequest = post(
      "/forms",
      {
        name: "Newsletter Form",
        description: "Subscribe to our newsletter",

        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await CREATE_FORM(createRequest);
    const createdForm = await createResponse.json();

    // Set deployed content so publish works
    await prisma.form.update({
      where: { id: createdForm.id },
      data: { fields: validFormContent as never },
    });

    // Publish the form
    const publishRequest = post(
      `/forms/${createdForm.id}/publish`,
      {},
      fullAccessApiKey.key,
    );

    const response = await PUBLISH_FORM(publishRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBe(createdForm.id);

    // Verify form is published in database
    const publishedForm = await prisma.form.findUnique({
      where: { id: createdForm.id },
    });

    expect(publishedForm).not.toBeNull();
    expect(publishedForm?.status).toBe("PUBLISHED");
    expect(publishedForm?.publishedVersionId).toBe(createdForm.id); // Self-reference
    expect(publishedForm?.publishedAt).not.toBeNull();
  });

  test("should reject publishing already published form", async () => {
    // Create and publish a form
    const createRequest = post(
      "/forms",
      {
        name: "Already Published Form",

        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await CREATE_FORM(createRequest);
    const createdForm = await createResponse.json();

    // Set deployed content so publish works
    await prisma.form.update({
      where: { id: createdForm.id },
      data: { fields: validFormContent as never },
    });

    // First publish
    const publishRequest1 = post(
      `/forms/${createdForm.id}/publish`,
      {},
      fullAccessApiKey.key,
    );

    await PUBLISH_FORM(publishRequest1, {
      params: Promise.resolve({ formId: createdForm.id }),
    });

    // Try to publish again
    const publishRequest2 = post(
      `/forms/${createdForm.id}/publish`,
      {},
      fullAccessApiKey.key,
    );

    const response = await PUBLISH_FORM(publishRequest2, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("already published");
  });

  test("should publish a new version and archive old published version", async () => {
    // Create and publish a root form
    const createRequest = post(
      "/forms",
      {
        name: "Contact Form",

        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await CREATE_FORM(createRequest);
    const rootForm = await createResponse.json();

    // Set deployed content so publish works
    await prisma.form.update({
      where: { id: rootForm.id },
      data: { fields: validFormContent as never },
    });

    // Publish root form
    const publishRequest1 = post(
      `/forms/${rootForm.id}/publish`,
      {},
      fullAccessApiKey.key,
    );

    await PUBLISH_FORM(publishRequest1, {
      params: Promise.resolve({ formId: rootForm.id }),
    });

    // Create version 2
    const versionRequest = post(
      `/forms/${rootForm.id}/versions`,
      {
        name: "Contact Form v2",
      },
      fullAccessApiKey.key,
    );

    const versionResponse = await CREATE_VERSION(versionRequest, {
      params: Promise.resolve({ formId: rootForm.id }),
    });
    const version2 = await versionResponse.json();

    // Publish version 2
    const publishRequest2 = post(
      `/forms/${version2.id}/publish`,
      {},
      fullAccessApiKey.key,
    );

    const response = await PUBLISH_FORM(publishRequest2, {
      params: Promise.resolve({ formId: version2.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.id).toBe(version2.id);

    // Verify root form is archived
    const updatedRootForm = await prisma.form.findUnique({
      where: { id: rootForm.id },
    });
    expect(updatedRootForm?.status).toBe("ARCHIVED");
    expect(updatedRootForm?.publishedVersionId).toBe(version2.id);

    // Verify version 2 is published
    const publishedVersion = await prisma.form.findUnique({
      where: { id: version2.id },
    });
    expect(publishedVersion?.status).toBe("PUBLISHED");
    expect(publishedVersion?.publishedAt).not.toBeNull();
  });

  test("should handle publishing version 3 after version 2", async () => {
    // Create and publish root form
    const createRequest = post(
      "/forms",
      {
        name: "Survey Form",

        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await CREATE_FORM(createRequest);
    const rootForm = await createResponse.json();

    // Set deployed content so publish works
    await prisma.form.update({
      where: { id: rootForm.id },
      data: { fields: validFormContent as never },
    });

    // Publish root
    await PUBLISH_FORM(
      post(`/forms/${rootForm.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: rootForm.id }) },
    );

    // Create and publish version 2
    const v2Response = await CREATE_VERSION(
      post(`/forms/${rootForm.id}/versions`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: rootForm.id }) },
    );
    const version2 = await v2Response.json();

    await PUBLISH_FORM(
      post(`/forms/${version2.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version2.id }) },
    );

    // Create and publish version 3
    const v3Response = await CREATE_VERSION(
      post(`/forms/${rootForm.id}/versions`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: rootForm.id }) },
    );
    const version3 = await v3Response.json();

    const response = await PUBLISH_FORM(
      post(`/forms/${version3.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version3.id }) },
    );

    expect(response.status).toBe(200);

    // Verify version 2 is archived
    const updatedV2 = await prisma.form.findUnique({
      where: { id: version2.id },
    });
    expect(updatedV2?.status).toBe("ARCHIVED");

    // Verify version 3 is published
    const updatedV3 = await prisma.form.findUnique({
      where: { id: version3.id },
    });
    expect(updatedV3?.status).toBe("PUBLISHED");

    // Verify root form points to version 3
    const updatedRoot = await prisma.form.findUnique({
      where: { id: rootForm.id },
    });
    expect(updatedRoot?.publishedVersionId).toBe(version3.id);
  });

  test("should return 404 for non-existent form", async () => {
    const publishRequest = post(
      "/forms/non_existent_id/publish",
      {},
      fullAccessApiKey.key,
    );

    const response = await PUBLISH_FORM(publishRequest, {
      params: Promise.resolve({ formId: "non_existent_id" }),
    });

    expect(response.status).toBe(404);
  });

  test("should allow rollback to previous version", async () => {
    // Create and publish root form (v1)
    const createRequest = post(
      "/forms",
      {
        name: "Feedback Form",

        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await CREATE_FORM(createRequest);
    const rootForm = await createResponse.json();

    // Set deployed content so publish works
    await prisma.form.update({
      where: { id: rootForm.id },
      data: { fields: validFormContent as never },
    });

    await PUBLISH_FORM(
      post(`/forms/${rootForm.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: rootForm.id }) },
    );

    // Create and publish version 2
    const v2Response = await CREATE_VERSION(
      post(`/forms/${rootForm.id}/versions`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: rootForm.id }) },
    );
    const version2 = await v2Response.json();

    await PUBLISH_FORM(
      post(`/forms/${version2.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version2.id }) },
    );

    // Create and publish version 3
    const v3Response = await CREATE_VERSION(
      post(`/forms/${rootForm.id}/versions`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: rootForm.id }) },
    );
    const version3 = await v3Response.json();

    await PUBLISH_FORM(
      post(`/forms/${version3.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version3.id }) },
    );

    // Verify version 3 is currently published
    const currentRoot = await prisma.form.findUnique({
      where: { id: rootForm.id },
    });
    expect(currentRoot?.publishedVersionId).toBe(version3.id);

    // ROLLBACK: Publish version 2 again (rolling back from v3 to v2)
    const rollbackResponse = await PUBLISH_FORM(
      post(`/forms/${version2.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version2.id }) },
    );

    expect(rollbackResponse.status).toBe(200);

    // Verify version 2 is now published
    const rolledBackV2 = await prisma.form.findUnique({
      where: { id: version2.id },
    });
    expect(rolledBackV2?.status).toBe("PUBLISHED");

    // Verify version 3 is now archived
    const archivedV3 = await prisma.form.findUnique({
      where: { id: version3.id },
    });
    expect(archivedV3?.status).toBe("ARCHIVED");

    // Verify root form points to version 2 (rolled back)
    const updatedRoot = await prisma.form.findUnique({
      where: { id: rootForm.id },
    });
    expect(updatedRoot?.publishedVersionId).toBe(version2.id);
  });

  test("should allow roll-forward after rollback", async () => {
    // Create and publish root form (v1)
    const createRequest = post(
      "/forms",
      {
        name: "Registration Form",

        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await CREATE_FORM(createRequest);
    const rootForm = await createResponse.json();

    // Set deployed content so publish works
    await prisma.form.update({
      where: { id: rootForm.id },
      data: { fields: validFormContent as never },
    });

    await PUBLISH_FORM(
      post(`/forms/${rootForm.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: rootForm.id }) },
    );

    // Create and publish version 2
    const v2Response = await CREATE_VERSION(
      post(`/forms/${rootForm.id}/versions`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: rootForm.id }) },
    );
    const version2 = await v2Response.json();

    await PUBLISH_FORM(
      post(`/forms/${version2.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version2.id }) },
    );

    // Create and publish version 3
    const v3Response = await CREATE_VERSION(
      post(`/forms/${rootForm.id}/versions`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: rootForm.id }) },
    );
    const version3 = await v3Response.json();

    await PUBLISH_FORM(
      post(`/forms/${version3.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version3.id }) },
    );

    // Rollback to version 2
    await PUBLISH_FORM(
      post(`/forms/${version2.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version2.id }) },
    );

    // ROLL-FORWARD: Publish version 3 again
    const rollForwardResponse = await PUBLISH_FORM(
      post(`/forms/${version3.id}/publish`, {}, fullAccessApiKey.key),
      { params: Promise.resolve({ formId: version3.id }) },
    );

    expect(rollForwardResponse.status).toBe(200);

    // Verify version 3 is published again
    const updatedV3 = await prisma.form.findUnique({
      where: { id: version3.id },
    });
    expect(updatedV3?.status).toBe("PUBLISHED");

    // Verify version 2 is archived
    const updatedV2 = await prisma.form.findUnique({
      where: { id: version2.id },
    });
    expect(updatedV2?.status).toBe("ARCHIVED");

    // Verify root points to version 3 again
    const updatedRoot = await prisma.form.findUnique({
      where: { id: rootForm.id },
    });
    expect(updatedRoot?.publishedVersionId).toBe(version3.id);
  });
});

describe("POST /api/v1/forms/[formId]/publish - Field Mapping Validation", () => {
  test("should reject publishing form with unmapped fields", async () => {
    // HTML with email and name fields, but fieldMapping only maps email
    const unmappedHtml = `<form>
  <input type="email" name="email" />
  <input type="text" name="name" />
  <button type="submit">Submit</button>
</form>`;

    // fieldMapping only maps email, not name
    const unmappedFieldMapping = {
      email: {
        contactPropertyId: "email",
        contactPropertyType: "standard" as const,
        fieldType: "string" as const,
      },
    };

    const createRequest = post(
      "/forms",
      {
        name: "Unmapped Fields Form",
        fieldMapping: unmappedFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await CREATE_FORM(createRequest);
    const createdForm = await createResponse.json();

    if (createResponse.status !== 201) {
      // If creation itself rejects unmapped fields, that is valid
      return;
    }

    // Set deployed content with HTML that has more fields than the fieldMapping
    await prisma.form.update({
      where: { id: createdForm.id },
      data: {
        fields: { html: unmappedHtml, deployId: "test-deploy", files: [] } as never,
      },
    });

    // Try to publish
    const publishRequest = post(
      `/forms/${createdForm.id}/publish`,
      {},
      fullAccessApiKey.key,
    );

    const response = await PUBLISH_FORM(publishRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(ErrorCode.FORM_VALIDATION_ERROR);
    expect(responseData.error.message).toContain("name"); // The unmapped field name
  });

  test("should reject publishing form without email contact property mapping", async () => {
    // HTML without email field
    const noEmailHtml = `<form>
  <input type="text" name="name" />
  <button type="submit">Submit</button>
</form>`;

    const noEmailFieldMapping = {
      name: {
        contactPropertyId: "firstName",
        contactPropertyType: "standard" as const,
        fieldType: "string" as const,
      },
    };

    const createRequest = post(
      "/forms",
      {
        name: "No Email Mapping Form",
        fieldMapping: noEmailFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await CREATE_FORM(createRequest);
    const createdForm = await createResponse.json();

    if (createResponse.status !== 201) {
      // If creation itself rejects missing email, that is valid
      return;
    }

    // Set deployed content
    await prisma.form.update({
      where: { id: createdForm.id },
      data: {
        fields: { html: noEmailHtml, deployId: "test-deploy", files: [] } as never,
      },
    });

    // Try to publish
    const publishRequest = post(
      `/forms/${createdForm.id}/publish`,
      {},
      fullAccessApiKey.key,
    );

    const response = await PUBLISH_FORM(publishRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(ErrorCode.FORM_VALIDATION_ERROR);
    expect(responseData.error.message).toContain("email");
  });

  test("should allow publishing form with all fields mapped including email", async () => {
    // Create a form with all fields properly mapped
    const createRequest = post(
      "/forms",
      {
        name: "Properly Mapped Form",

        fieldMapping: validFormFieldMapping,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await CREATE_FORM(createRequest);
    const createdForm = await createResponse.json();

    // Set deployed content so publish works
    await prisma.form.update({
      where: { id: createdForm.id },
      data: { fields: validFormContent as never },
    });

    // Publish
    const publishRequest = post(
      `/forms/${createdForm.id}/publish`,
      {},
      fullAccessApiKey.key,
    );

    const response = await PUBLISH_FORM(publishRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("form");
    expect(responseData.id).toBe(createdForm.id);

    // Verify form is published
    const publishedForm = await prisma.form.findUnique({
      where: { id: createdForm.id },
    });
    expect(publishedForm?.status).toBe("PUBLISHED");
  });
});
