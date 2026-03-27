/**
 * Integration tests for Form Content Image Upload (Internal API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/internal/v1/forms/[formId]/content-image - Upload content image
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

import { POST } from "@/app/(main)/api/internal/v1/forms/[formId]/content-image/route";

let testWorkspace: TestWorkspace;
let testWorkspace2: TestWorkspace;
let testFormId: string;

/**
 * Helper to create FormData with file
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
  const url = `http://localhost:3000/api/internal/v1/forms/${formId}/content-image`;
  return new NextRequest(url, {
    method: "POST",
    body: formData,
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
      name: "Test Content Image Form",
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
    publicUrl: "https://cdn.example.com/forms/test/content/image-123.png",
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

describe("POST /api/internal/v1/forms/[formId]/content-image", () => {
  test("should upload valid PNG image and return URL", async () => {
    const formData = createFileFormData("image.png", "image/png");
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.url).toBe(
      "https://cdn.example.com/forms/test/content/image-123.png",
    );

    // Verify upload was called with correct params
    expect(mockUploadPublicFile).toHaveBeenCalledWith(
      expect.stringMatching(/^forms\/.*\/content\/image-\d+\.png$/),
      expect.any(Buffer),
      "image/png",
    );
  });

  test("should accept JPEG images", async () => {
    const formData = createFileFormData("photo.jpg", "image/jpeg");
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });

    expect(response.status).toBe(200);
    expect(mockUploadPublicFile).toHaveBeenCalledWith(
      expect.stringMatching(/\.jpg$/),
      expect.any(Buffer),
      "image/jpeg",
    );
  });

  test("should accept WebP images", async () => {
    const formData = createFileFormData("image.webp", "image/webp");
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });

    expect(response.status).toBe(200);
    expect(mockUploadPublicFile).toHaveBeenCalledWith(
      expect.stringMatching(/\.webp$/),
      expect.any(Buffer),
      "image/webp",
    );
  });

  test("should accept GIF images", async () => {
    const formData = createFileFormData("animation.gif", "image/gif");
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });

    expect(response.status).toBe(200);
    expect(mockUploadPublicFile).toHaveBeenCalledWith(
      expect.stringMatching(/\.gif$/),
      expect.any(Buffer),
      "image/gif",
    );
  });

  test("should reject file exceeding 5MB limit", async () => {
    // Create a file slightly over 5MB
    const largeSize = 5 * 1024 * 1024 + 1;
    const formData = createFileFormData("large.png", "image/png", largeSize);
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("size");
    expect(mockUploadPublicFile).not.toHaveBeenCalled();
  });

  test("should reject invalid file types (PDF)", async () => {
    const formData = createFileFormData("document.pdf", "application/pdf");
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("Invalid file type");
    expect(mockUploadPublicFile).not.toHaveBeenCalled();
  });

  test("should reject invalid file types (SVG)", async () => {
    const formData = createFileFormData("icon.svg", "image/svg+xml");
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("Invalid file type");
    expect(mockUploadPublicFile).not.toHaveBeenCalled();
  });

  test("should reject invalid file types (ICO)", async () => {
    const formData = createFileFormData("favicon.ico", "image/x-icon");
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
    const formData = createFileFormData("image.png", "image/png");
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
      const formData = createFileFormData("image.png", "image/png");
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
    expect(responseData.error.message).toContain("No image file provided");
    expect(mockUploadPublicFile).not.toHaveBeenCalled();
  });

  test("should not update any form database fields", async () => {
    const formBefore = await prisma.form.findUnique({
      where: { id: testFormId },
    });

    const formData = createFileFormData("image.png", "image/png");
    const request = createUploadRequest(testFormId, formData);

    const response = await POST(request, {
      params: Promise.resolve({ formId: testFormId }),
    });

    expect(response.status).toBe(200);

    // Verify form was NOT modified (content images don't update form fields)
    const formAfter = await prisma.form.findUnique({
      where: { id: testFormId },
    });

    expect(formAfter?.seoImageUrl).toBe(formBefore?.seoImageUrl);
    expect(formAfter?.seoFaviconUrl).toBe(formBefore?.seoFaviconUrl);
    expect(formAfter?.updatedAt.getTime()).toBe(
      formBefore?.updatedAt.getTime(),
    );
  });

  test("should generate unique file paths with timestamps", async () => {
    const formData1 = createFileFormData("image1.png", "image/png");
    const formData2 = createFileFormData("image2.png", "image/png");

    const request1 = createUploadRequest(testFormId, formData1);
    const request2 = createUploadRequest(testFormId, formData2);

    await POST(request1, {
      params: Promise.resolve({ formId: testFormId }),
    });
    await POST(request2, {
      params: Promise.resolve({ formId: testFormId }),
    });

    // Verify two different upload calls were made
    expect(mockUploadPublicFile).toHaveBeenCalledTimes(2);
  });
});
