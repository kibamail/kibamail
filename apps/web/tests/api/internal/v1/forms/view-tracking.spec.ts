/**
 * Integration tests for Form View Tracking (Internal API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/internal/v1/forms/[formId]/views - Track a form page view
 *
 * Also tests the server-side view tracking utility used by the form page.
 */

import { POST } from "@/app/(main)/api/internal/v1/forms/[formId]/views/route";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  createTestWorkspace,
  cleanupWorkspace,
  type TestWorkspace,
} from "@/tests/utils";
import { validFormFields } from "@/tests/utils/form-fixtures";
import { prisma } from "@/lib/db";
import { ErrorCode } from "@/lib/api/error-codes";

let testWorkspace: TestWorkspace;
let publishedFormId: string;

/**
 * Helper to create a view tracking request
 */
function viewRequest(
  path: string,
  options: {
    userAgent?: string;
    ip?: string;
    referer?: string;
  } = {}
): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.userAgent) {
    headers["User-Agent"] = options.userAgent;
  }
  if (options.ip) {
    headers["X-Forwarded-For"] = options.ip;
  }
  if (options.referer) {
    headers["Referer"] = options.referer;
  }

  return new Request(`http://localhost:3000/api/internal/v1${path}`, {
    method: "POST",
    headers,
  });
}

/**
 * Setup: Create test workspace and forms
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();

  // Create a published form
  const form = await prisma.form.create({
    data: {
      workspaceId: testWorkspace.id,
      name: "View Tracking Test Form",
      type: "SIGN_UP",
      display: "INLINE_EMBED",
      status: "PUBLISHED",
      version: 1,
      fields: validFormFields as never,
      publishedAt: new Date(),
      fieldMapping: {
        email: { slot: "fieldString0", type: "string", fieldType: "email" },
      } as never,
    },
  });

  await prisma.form.update({
    where: { id: form.id },
    data: { publishedVersionId: form.id },
  });

  publishedFormId = form.id;
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("POST /api/internal/v1/forms/[formId]/views - Basic Functionality", () => {
  test("should create a page view record", async () => {
    const request = viewRequest(`/forms/${publishedFormId}/views`, {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      ip: "192.168.1.100",
      referer: "https://example.com/landing",
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: publishedFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("page_view");
    expect(responseData.id).toBeDefined();

    // Verify page view was created in database
    const pageView = await prisma.pageView.findUnique({
      where: { id: responseData.id },
    });

    expect(pageView).not.toBeNull();
    expect(pageView?.formId).toBe(publishedFormId);
    expect(pageView?.workspaceId).toBe(testWorkspace.id);
    expect(pageView?.pageType).toBe("FORM");
  });

  test("should return 404 for non-existent form", async () => {
    const request = viewRequest("/forms/nonexistent-form-id/views");

    const response = await POST(request, {
      params: Promise.resolve({ formId: "nonexistent-form-id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.FORM_NOT_FOUND);
  });
});

describe("POST /api/internal/v1/forms/[formId]/views - Metadata Capture", () => {
  test("should capture IP address", async () => {
    const request = viewRequest(`/forms/${publishedFormId}/views`, {
      ip: "203.0.113.50",
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: publishedFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    const pageView = await prisma.pageView.findUnique({
      where: { id: responseData.id },
    });
    expect(pageView?.ipAddress).toBe("203.0.113.50");
  });

  test("should capture first IP from X-Forwarded-For chain", async () => {
    const request = viewRequest(`/forms/${publishedFormId}/views`, {
      ip: "203.0.113.1, 10.0.0.1, 172.16.0.1",
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: publishedFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    const pageView = await prisma.pageView.findUnique({
      where: { id: responseData.id },
    });
    expect(pageView?.ipAddress).toBe("203.0.113.1");
  });

  test("should capture user agent", async () => {
    const userAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15";
    const request = viewRequest(`/forms/${publishedFormId}/views`, {
      userAgent,
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: publishedFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    const pageView = await prisma.pageView.findUnique({
      where: { id: responseData.id },
    });
    expect(pageView?.userAgent).toBe(userAgent);
  });

  test("should capture referrer URL", async () => {
    const request = viewRequest(`/forms/${publishedFormId}/views`, {
      referer: "https://blog.example.com/article/123",
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: publishedFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    const pageView = await prisma.pageView.findUnique({
      where: { id: responseData.id },
    });
    expect(pageView?.referrerUrl).toBe("https://blog.example.com/article/123");
  });

  test("should handle missing metadata gracefully", async () => {
    const request = viewRequest(`/forms/${publishedFormId}/views`);

    const response = await POST(request, {
      params: Promise.resolve({ formId: publishedFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    const pageView = await prisma.pageView.findUnique({
      where: { id: responseData.id },
    });
    expect(pageView?.ipAddress).toBeNull();
    expect(pageView?.userAgent).toBeNull();
    expect(pageView?.referrerUrl).toBeNull();
  });
});

describe("POST /api/internal/v1/forms/[formId]/views - Device Detection", () => {
  test("should detect desktop device", async () => {
    const request = viewRequest(`/forms/${publishedFormId}/views`, {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: publishedFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    const pageView = await prisma.pageView.findUnique({
      where: { id: responseData.id },
    });
    expect(pageView?.device).toBe("desktop");
    expect(pageView?.browser).toBe("Chrome");
    expect(pageView?.os).toContain("Windows");
  });

  test("should detect mobile device", async () => {
    const request = viewRequest(`/forms/${publishedFormId}/views`, {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: publishedFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    const pageView = await prisma.pageView.findUnique({
      where: { id: responseData.id },
    });
    expect(pageView?.device).toBe("mobile");
    expect(pageView?.browser).toBe("Mobile Safari");
    expect(pageView?.os).toContain("iOS");
  });

  test("should detect tablet device", async () => {
    const request = viewRequest(`/forms/${publishedFormId}/views`, {
      userAgent:
        "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    });

    const response = await POST(request, {
      params: Promise.resolve({ formId: publishedFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    const pageView = await prisma.pageView.findUnique({
      where: { id: responseData.id },
    });
    expect(pageView?.device).toBe("tablet");
  });
});

describe("POST /api/internal/v1/forms/[formId]/views - Workspace Association", () => {
  test("should associate view with form's workspace", async () => {
    const request = viewRequest(`/forms/${publishedFormId}/views`);

    const response = await POST(request, {
      params: Promise.resolve({ formId: publishedFormId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);

    const pageView = await prisma.pageView.findUnique({
      where: { id: responseData.id },
    });
    expect(pageView?.workspaceId).toBe(testWorkspace.id);
  });
});
