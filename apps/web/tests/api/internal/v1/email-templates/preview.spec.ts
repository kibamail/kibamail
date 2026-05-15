/**
 * Integration tests for Email Template Preview (Internal API)
 *
 * Tests the actual Next.js route handler for:
 * - GET /api/internal/v1/email-templates/[templateId]/preview
 *
 * Covered:
 * - Workspace scoping (cross-workspace template access must 404)
 * - 404 when template does not exist at all
 * - hasContent=false fallback when emailContent.contentJson is missing
 * - hasContent=true with rendered HTML when contentJson is set
 * - Permission failure when session lacks active workspace
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

const { mockSession } = vi.hoisted(() => ({
  mockSession: {
    currentOrganization: { id: "" } as { id: string } | null,
    permissions: [] as string[],
  },
}));

vi.mock("@/lib/auth/get-session", () => ({
  getSession: async () => mockSession,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { GET as PREVIEW } from "@/app/(main)/api/internal/v1/email-templates/[templateId]/preview/route";

let testWorkspace: TestWorkspace;
let testWorkspace2: TestWorkspace;

function makeRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, { method: "GET" });
}

async function createTemplateWithContent(
  workspaceId: string,
  emailContentOverrides?: {
    contentJson?: unknown;
    contentHtml?: string | null;
    styles?: unknown;
  } | null,
) {
  let emailContent = null;
  if (emailContentOverrides !== null) {
    emailContent = await prisma.emailContent.create({
      data: {
        subject: "Preview Subject",
        previewText: "preview",
        contentJson:
          emailContentOverrides?.contentJson !== undefined
            ? (emailContentOverrides.contentJson as object)
            : { type: "doc", content: [{ type: "paragraph" }] },
        contentHtml: emailContentOverrides?.contentHtml ?? "<p>html</p>",
        contentText: "text",
        ...(emailContentOverrides?.styles !== undefined
          ? { styles: emailContentOverrides.styles as object }
          : {}),
      },
    });
  }

  const template = await prisma.emailTemplate.create({
    data: {
      workspaceId,
      name: "Preview Template",
      emailContentId: emailContent?.id,
      status: "DRAFT",
      version: 1,
    },
  });

  return { template, emailContent };
}

beforeAll(() => {
  testWorkspace = createTestWorkspace();
  testWorkspace2 = createTestWorkspace();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.currentOrganization = { id: testWorkspace.id };
  mockSession.permissions = ["read:templates"];
});

afterEach(async () => {
  await prisma.emailTemplate.deleteMany({
    where: { workspaceId: { in: [testWorkspace.id, testWorkspace2.id] } },
  });
  await prisma.emailContent.deleteMany({
    where: { subject: "Preview Subject" },
  });
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
  await cleanupWorkspace(testWorkspace2.id);
  vi.restoreAllMocks();
});

describe("GET /api/internal/v1/email-templates/[templateId]/preview", () => {
  test("returns 200 with hasContent=false when emailContent is missing", async () => {
    const { template } = await createTemplateWithContent(testWorkspace.id, null);

    const response = await PREVIEW(
      makeRequest(`/api/internal/v1/email-templates/${template.id}/preview`),
      { params: Promise.resolve({ templateId: template.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.hasContent).toBe(false);
    expect(body.html).toContain("No content");
  });

  test("returns 200 with hasContent=false when contentJson is null", async () => {
    const { template } = await createTemplateWithContent(testWorkspace.id, {
      contentJson: null,
      contentHtml: "<p>html only</p>",
    });

    const response = await PREVIEW(
      makeRequest(`/api/internal/v1/email-templates/${template.id}/preview`),
      { params: Promise.resolve({ templateId: template.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.hasContent).toBe(false);
  });

  test("returns 200 with hasContent=true and rendered HTML when contentJson is present", async () => {
    const { template } = await createTemplateWithContent(testWorkspace.id, {
      contentJson: { type: "doc", content: [{ type: "paragraph" }] },
    });

    const response = await PREVIEW(
      makeRequest(`/api/internal/v1/email-templates/${template.id}/preview`),
      { params: Promise.resolve({ templateId: template.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.hasContent).toBe(true);
    expect(typeof body.html).toBe("string");
    expect(body.html.length).toBeGreaterThan(0);
  });

  test("returns 404 for a template that does not exist", async () => {
    const response = await PREVIEW(
      makeRequest("/api/internal/v1/email-templates/does-not-exist/preview"),
      { params: Promise.resolve({ templateId: "does-not-exist" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("RESOURCE_NOT_FOUND");
  });

  test("returns 404 for a template owned by a different workspace (cross-workspace isolation)", async () => {
    const { template: otherWorkspaceTemplate } =
      await createTemplateWithContent(testWorkspace2.id, {
        contentJson: { type: "doc", content: [{ type: "paragraph" }] },
      });

    const response = await PREVIEW(
      makeRequest(
        `/api/internal/v1/email-templates/${otherWorkspaceTemplate.id}/preview`,
      ),
      { params: Promise.resolve({ templateId: otherWorkspaceTemplate.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("RESOURCE_NOT_FOUND");
  });

  test("returns 500-class error when session has no active workspace", async () => {
    mockSession.currentOrganization = null;

    const { template } = await createTemplateWithContent(testWorkspace.id, {
      contentJson: { type: "doc", content: [{ type: "paragraph" }] },
    });

    const response = await PREVIEW(
      makeRequest(`/api/internal/v1/email-templates/${template.id}/preview`),
      { params: Promise.resolve({ templateId: template.id }) },
    );

    // withErrorHandling converts unknown errors into a non-2xx response.
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
