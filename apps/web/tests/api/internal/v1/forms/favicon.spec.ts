/**
 * Integration tests for Form Favicon Upload (Internal API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/internal/v1/forms/[formId]/favicon - Upload favicon
 * - DELETE /api/internal/v1/forms/[formId]/favicon - Remove favicon
 */

import { NextRequest } from "next/server";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { prisma } from "@/lib/db";
import {
  cleanupWorkspace,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils";
import { validFormSpec } from "@/tests/utils/form-fixtures";

// Create mock functions using vi.hoisted
const { mockUploadPublicFile, mockSession } = vi.hoisted(() => ({
  mockUploadPublicFile: vi.fn(),
  mockSession: {
    currentOrganization: { id: "" },
    permissions: ["manage:forms"],
  },
}));

// Mock the storage module
vi.mock("@/lib/storage", () => ({
  uploadPublicFile: mockUploadPublicFile,
}));

// Mock the session
vi.mock("@/lib/auth/get-session", () => ({
  getSession: async () => mockSession,
}));

// Mock Next.js cache functions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import {
  DELETE,
  POST,
} from "@/app/(main)/api/internal/v1/forms/[formId]/favicon/route";

let testWorkspace: TestWorkspace;
let testWorkspace2: TestWorkspace;
let testFormId: string;

/**
 * Helper to create FormData with file
 * Note: The favicon handler expects the field name to be "image"
 */
function createFileFormData(
  fileName: string,
  mimeType: string,
  size?: number,
): FormData {
  const content = new Uint8Array(size || 1024);
  const blob = new Blob([content], { type: mimeType });
  const file = new File([blob], fileName, { type: mimeType });
  const formData = new FormData();
  formData.append("image", file);
  return formData;
}

/**
 * Helper to create upload request
 */
function createUploadRequest(formId: string, formData: FormData): NextRequest {
  const url = `http://localhost:3000/api/internal/v1/forms/${formId}/favicon`;
  return new NextRequest(url, {
    method: "POST",
    body: formData,
  });
}

/**
 * Helper to create delete request
 */
function createDeleteRequest(formId: string): NextRequest {
  const url = `http://localhost:3000/api/internal/v1/forms/${formId}/favicon`;
  return new NextRequest(url, {
    method: "DELETE",
  });
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  testWorkspace2 = createTestWorkspace();
  mockSession.currentOrganization = { id: testWorkspace.id };
});

beforeEach(async () => {
  vi.clearAllMocks();

  // Create a test form
  const form = await prisma.form.create({
    data: {
      workspaceId: testWorkspace.id,
      name: "Test Favicon Form",
      type: "SIGN_UP",
      display: "INLINE_EMBED",
      status: "DRAFT",
      version: 1,
      fields: validFormSpec as never,
    },
  });
  testFormId = form.id;

  // Setup mock to return a URL
  mockUploadPublicFile.mockResolvedValue({
    publicUrl: "https://cdn.example.com/forms/test/favicon.ico",
  });
});

afterEach(async () => {
  if (testFormId) {
    await prisma.form.delete({ where: { id: testFormId } }).catch(() => {});
    testFormId = "";
  }
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
  await cleanupWorkspace(testWorkspace2.id);
  vi.restoreAllMocks();
});

describe("POST /api/internal/v1/forms/[formId]/favicon", () => {
  test("should upload valid favicon and update form.seoFaviconUrl", async () => {
    const formData = createFileFormData("favicon.ico", "image/x-icon");
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.url).toBe(
      "https://cdn.example.com/forms/test/favicon.ico",
    );

    // Verify database was updated
    const form = await prisma.form.findUnique({
      where: { id: testFormId },
    });
    expect(form?.seoFaviconUrl).toBe(
      "https://cdn.example.com/forms/test/favicon.ico",
    );

    // Verify upload was called with correct params
    expect(mockUploadPublicFile).toHaveBeenCalledWith(
      expect.stringMatching(/^forms\/.*\/favicon-\d+\.ico$/),
      expect.any(Buffer),
      "image/x-icon",
    );
  });

  test("should accept PNG favicons", async () => {
    const formData = createFileFormData("favicon.png", "image/png");
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });

    expect(response.status).toBe(200);
    expect(mockUploadPublicFile).toHaveBeenCalledWith(
      expect.stringMatching(/\.png$/),
      expect.any(Buffer),
      "image/png",
    );
  });

  test("should accept SVG favicons", async () => {
    const formData = createFileFormData("favicon.svg", "image/svg+xml");
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });

    expect(response.status).toBe(200);
    expect(mockUploadPublicFile).toHaveBeenCalledWith(
      expect.stringMatching(/\.svg$/),
      expect.any(Buffer),
      "image/svg+xml",
    );
  });

  test("should accept vnd.microsoft.icon type", async () => {
    const formData = createFileFormData(
      "favicon.ico",
      "image/vnd.microsoft.icon",
    );
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });

    expect(response.status).toBe(200);
    expect(mockUploadPublicFile).toHaveBeenCalled();
  });

  test("should reject file exceeding 500KB limit", async () => {
    // Create a file slightly over 500KB
    const largeSize = 500 * 1024 + 1;
    const formData = createFileFormData("large.ico", "image/x-icon", largeSize);
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("size");
    expect(mockUploadPublicFile).not.toHaveBeenCalled();
  });

  test("should reject invalid file types (JPEG)", async () => {
    const formData = createFileFormData("image.jpg", "image/jpeg");
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("Invalid file type");
    expect(mockUploadPublicFile).not.toHaveBeenCalled();
  });

  test("should reject invalid file types (WebP)", async () => {
    const formData = createFileFormData("image.webp", "image/webp");
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("Invalid file type");
    expect(mockUploadPublicFile).not.toHaveBeenCalled();
  });

  test("should reject invalid file types (GIF)", async () => {
    const formData = createFileFormData("animation.gif", "image/gif");
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("Invalid file type");
    expect(mockUploadPublicFile).not.toHaveBeenCalled();
  });

  test("should return 404 for non-existent form", async () => {
    const formData = createFileFormData("favicon.ico", "image/x-icon");
    const request = createUploadRequest("non-existent-id", formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: "non-existent-id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe("FORM_NOT_FOUND");
    expect(mockUploadPublicFile).not.toHaveBeenCalled();
  });

  test("should reject access to form from different workspace", async () => {
    // Create form in different workspace
    const otherForm = await prisma.form.create({
      data: {
        workspaceId: testWorkspace2.id,
        name: "Other Workspace Form",
        type: "SIGN_UP",
        display: "INLINE_EMBED",
        status: "DRAFT",
        version: 1,
        fields: validFormSpec as never,
      },
    });

    try {
      const formData = createFileFormData("favicon.ico", "image/x-icon");
      const request = createUploadRequest(otherForm.id, formData);

      const response = await POST(request, {
        params: Promise.resolve({ formId: otherForm.id }),
      });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error.code).toBe("FORM_NOT_FOUND");
      expect(mockUploadPublicFile).not.toHaveBeenCalled();
    } finally {
      await prisma.form.delete({ where: { id: otherForm.id } });
    }
  });

  test("should return 400 when no file is provided", async () => {
    const formData = new FormData();
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("No favicon file provided");
    expect(mockUploadPublicFile).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/internal/v1/forms/[formId]/favicon", () => {
  test("should clear seoFaviconUrl", async () => {
    // First set a favicon URL
    await prisma.form.update({
      where: { id: testFormId },
      data: { seoFaviconUrl: "https://cdn.example.com/existing-favicon.ico" },
    });

    const request = createDeleteRequest(testFormId);
    const response = await DELETE(request, {
      params: Promise.resolve({ formId: testFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);

    // Verify database was updated
    const form = await prisma.form.findUnique({
      where: { id: testFormId },
    });
    expect(form?.seoFaviconUrl).toBeNull();
  });

  test("should return 404 for non-existent form", async () => {
    const request = createDeleteRequest("non-existent-id");
    const response = await DELETE(request, {
      params: Promise.resolve({ formId: "non-existent-id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe("FORM_NOT_FOUND");
  });

  test("should reject access to form from different workspace", async () => {
    // Create form in different workspace
    const otherForm = await prisma.form.create({
      data: {
        workspaceId: testWorkspace2.id,
        name: "Other Workspace Form",
        type: "SIGN_UP",
        display: "INLINE_EMBED",
        status: "DRAFT",
        version: 1,
        fields: validFormSpec as never,
        seoFaviconUrl: "https://cdn.example.com/other-favicon.ico",
      },
    });

    try {
      const request = createDeleteRequest(otherForm.id);
      const response = await DELETE(request, {
        params: Promise.resolve({ formId: otherForm.id }),
      });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error.code).toBe("FORM_NOT_FOUND");

      // Verify favicon was NOT deleted
      const form = await prisma.form.findUnique({
        where: { id: otherForm.id },
      });
      expect(form?.seoFaviconUrl).toBe(
        "https://cdn.example.com/other-favicon.ico",
      );
    } finally {
      await prisma.form.delete({ where: { id: otherForm.id } });
    }
  });

  test("should succeed even if no favicon was set", async () => {
    // Ensure no favicon is set
    await prisma.form.update({
      where: { id: testFormId },
      data: { seoFaviconUrl: null },
    });

    const request = createDeleteRequest(testFormId);
    const response = await DELETE(request, {
      params: Promise.resolve({ formId: testFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
  });
});
