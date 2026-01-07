/**
 * Integration tests for Form SEO Fields
 *
 * Tests the actual Next.js route handlers for:
 * - PUT /api/v1/forms/[formId] - Update form with SEO fields
 * - GET /api/v1/forms/[formId] - Get form with SEO fields
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { GET, PUT } from "@/app/(main)/api/v1/forms/[formId]/route";
import { POST } from "@/app/(main)/api/v1/forms/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  apiRequest,
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestWorkspace,
  post,
  put,
  type TestWorkspace,
} from "@/tests/utils";
import { validFormFields } from "@/tests/utils/form-fixtures";

let testWorkspace: TestWorkspace;
let testWorkspace2: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;
let fullAccessApiKey2: CreatedApiKey;

/**
 * Setup: Create test workspaces and API keys
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  testWorkspace2 = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
  fullAccessApiKey2 = await createFullAccessApiKey(testWorkspace2.id);
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
  await cleanupWorkspace(testWorkspace2.id);
});

describe("PUT /api/v1/forms/[formId] - SEO Fields", () => {
  test("should update SEO title and description", async () => {
    // Create a form
    const createRequest = post(
      "/forms",
      {
        name: "SEO Test Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    // Update with SEO fields
    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        seoTitle: "My Custom Form Title",
        seoDescription: "A great description for search engines",
      },
      fullAccessApiKey.key,
    );

    const response = await PUT(updateRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });

    expect(response.status).toBe(200);

    // Verify by fetching
    const getRequest = apiRequest(`/forms/${createdForm.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const getResponse = await GET(getRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const formData = await getResponse.json();

    expect(formData.seoTitle).toBe("My Custom Form Title");
    expect(formData.seoDescription).toBe(
      "A great description for search engines",
    );
  });

  test("should update custom slug", async () => {
    const createRequest = post(
      "/forms",
      {
        name: "Slug Test Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        slug: "my-awesome-form",
      },
      fullAccessApiKey.key,
    );

    const response = await PUT(updateRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });

    expect(response.status).toBe(200);

    const getRequest = apiRequest(`/forms/${createdForm.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const getResponse = await GET(getRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const formData = await getResponse.json();

    expect(formData.slug).toBe("my-awesome-form");
  });

  test("should reject duplicate slug within same workspace", async () => {
    // Create first form with slug
    const form1Request = post(
      "/forms",
      {
        name: "First Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const form1Response = await POST(form1Request);
    const form1 = await form1Response.json();

    // Set slug on first form
    const updateForm1Request = put(
      `/forms/${form1.id}`,
      {
        slug: "unique-slug",
      },
      fullAccessApiKey.key,
    );

    await PUT(updateForm1Request, {
      params: Promise.resolve({ formId: form1.id }),
    });

    // Create second form
    const form2Request = post(
      "/forms",
      {
        name: "Second Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const form2Response = await POST(form2Request);
    const form2 = await form2Response.json();

    // Try to use same slug
    const updateForm2Request = put(
      `/forms/${form2.id}`,
      {
        slug: "unique-slug",
      },
      fullAccessApiKey.key,
    );

    const response = await PUT(updateForm2Request, {
      params: Promise.resolve({ formId: form2.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(409);
    expect(responseData.error.code).toBe(ErrorCode.FORM_SLUG_CONFLICT);
  });

  test("should allow same slug in different workspaces", async () => {
    // Create form in workspace 1 with slug
    const form1Request = post(
      "/forms",
      {
        name: "Workspace 1 Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const form1Response = await POST(form1Request);
    const form1 = await form1Response.json();

    await PUT(
      put(
        `/forms/${form1.id}`,
        { slug: "shared-slug-name" },
        fullAccessApiKey.key,
      ),
      { params: Promise.resolve({ formId: form1.id }) },
    );

    // Create form in workspace 2 with same slug
    const form2Request = post(
      "/forms",
      {
        name: "Workspace 2 Form",
        fields: validFormFields,
      },
      fullAccessApiKey2.key,
    );

    const form2Response = await POST(form2Request);
    const form2 = await form2Response.json();

    const updateResponse = await PUT(
      put(
        `/forms/${form2.id}`,
        { slug: "shared-slug-name" },
        fullAccessApiKey2.key,
      ),
      { params: Promise.resolve({ formId: form2.id }) },
    );

    expect(updateResponse.status).toBe(200);
  });

  test("should reject invalid slug format (uppercase)", async () => {
    const createRequest = post(
      "/forms",
      {
        name: "Invalid Slug Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        slug: "MyUpperCaseSlug",
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

  test("should reject invalid slug format (special chars)", async () => {
    const createRequest = post(
      "/forms",
      {
        name: "Special Chars Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        slug: "my_slug@here!",
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

  test("should allow slug with hyphens and numbers", async () => {
    const createRequest = post(
      "/forms",
      {
        name: "Valid Slug Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        slug: "my-form-2024-v1",
      },
      fullAccessApiKey.key,
    );

    const response = await PUT(updateRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });

    expect(response.status).toBe(200);
  });

  test("should clear SEO fields when set to null", async () => {
    const createRequest = post(
      "/forms",
      {
        name: "Clear SEO Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    // First set SEO fields
    await PUT(
      put(
        `/forms/${createdForm.id}`,
        {
          seoTitle: "Initial Title",
          seoDescription: "Initial Description",
          slug: "initial-slug",
        },
        fullAccessApiKey.key,
      ),
      { params: Promise.resolve({ formId: createdForm.id }) },
    );

    // Then clear them
    const clearRequest = put(
      `/forms/${createdForm.id}`,
      {
        seoTitle: null,
        seoDescription: null,
        slug: null,
      },
      fullAccessApiKey.key,
    );

    const response = await PUT(clearRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });

    expect(response.status).toBe(200);

    const getRequest = apiRequest(`/forms/${createdForm.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const getResponse = await GET(getRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const formData = await getResponse.json();

    expect(formData.seoTitle).toBeNull();
    expect(formData.seoDescription).toBeNull();
    expect(formData.slug).toBeNull();
  });

  test("should validate seoTitle max length (200)", async () => {
    const createRequest = post(
      "/forms",
      {
        name: "Title Length Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        seoTitle: "a".repeat(201),
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

  test("should validate seoDescription max length (500)", async () => {
    const createRequest = post(
      "/forms",
      {
        name: "Description Length Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        seoDescription: "a".repeat(501),
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

  test("should update SEO image URL", async () => {
    const createRequest = post(
      "/forms",
      {
        name: "OG Image Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        seoImageUrl: "https://example.com/images/og-image.png",
      },
      fullAccessApiKey.key,
    );

    const response = await PUT(updateRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });

    expect(response.status).toBe(200);

    const getRequest = apiRequest(`/forms/${createdForm.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const getResponse = await GET(getRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const formData = await getResponse.json();

    expect(formData.seoImageUrl).toBe("https://example.com/images/og-image.png");
  });

  test("should update SEO favicon URL", async () => {
    const createRequest = post(
      "/forms",
      {
        name: "Favicon Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        seoFaviconUrl: "https://example.com/favicon.ico",
      },
      fullAccessApiKey.key,
    );

    const response = await PUT(updateRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });

    expect(response.status).toBe(200);

    const getRequest = apiRequest(`/forms/${createdForm.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const getResponse = await GET(getRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const formData = await getResponse.json();

    expect(formData.seoFaviconUrl).toBe("https://example.com/favicon.ico");
  });

  test("should reject invalid URL for seoImageUrl", async () => {
    const createRequest = post(
      "/forms",
      {
        name: "Invalid URL Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    const updateRequest = put(
      `/forms/${createdForm.id}`,
      {
        seoImageUrl: "not-a-valid-url",
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
});

describe("GET /api/v1/forms/[formId] - SEO Fields", () => {
  test("should return SEO fields in response", async () => {
    // Create form with SEO data via prisma directly
    const form = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Complete SEO Form",
        type: "SIGN_UP",
        display: "INLINE_EMBED",
        status: "DRAFT",
        version: 1,
        fields: validFormFields as never,
        seoTitle: "Custom Page Title",
        seoDescription: "Custom meta description",
        seoImageUrl: "https://example.com/og.png",
        seoFaviconUrl: "https://example.com/favicon.ico",
        slug: "complete-seo-test",
      },
    });

    const getRequest = apiRequest(`/forms/${form.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const response = await GET(getRequest, {
      params: Promise.resolve({ formId: form.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.seoTitle).toBe("Custom Page Title");
    expect(responseData.seoDescription).toBe("Custom meta description");
    expect(responseData.seoImageUrl).toBe("https://example.com/og.png");
    expect(responseData.seoFaviconUrl).toBe("https://example.com/favicon.ico");
    expect(responseData.slug).toBe("complete-seo-test");
  });

  test("should return null for unset SEO fields", async () => {
    const createRequest = post(
      "/forms",
      {
        name: "No SEO Form",
        fields: validFormFields,
      },
      fullAccessApiKey.key,
    );

    const createResponse = await POST(createRequest);
    const createdForm = await createResponse.json();

    const getRequest = apiRequest(`/forms/${createdForm.id}`)
      .method("GET")
      .auth(fullAccessApiKey.key)
      .build();

    const response = await GET(getRequest, {
      params: Promise.resolve({ formId: createdForm.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.seoTitle).toBeNull();
    expect(responseData.seoDescription).toBeNull();
    expect(responseData.seoImageUrl).toBeNull();
    expect(responseData.seoFaviconUrl).toBeNull();
    expect(responseData.slug).toBeNull();
  });
});
