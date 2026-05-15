/**
 * Integration tests for Dashboard Template Preview Route
 *
 * Route: GET /w/<slug>/templates/[id]/preview
 *
 * This route serves an HTML response (not JSON) suitable for direct
 * browser rendering or iframe embedding. It has three rendering branches:
 *
 *   1. `contentHtml` present → render with SAMPLE_VARIABLES substituted.
 *   2. `contentJson` present → render via renderBroadcastToHtml.
 *   3. Neither present       → render a static placeholder.
 *
 * The tests below cover:
 *   - All three branches return 200 text/html with correct Content-Type.
 *   - Variable substitution actually replaces known `{{var}}` patterns
 *     using SAMPLE_VARIABLES and leaves unknown patterns intact.
 *   - The clickjacking-relevant security headers are set so the dashboard
 *     can iframe the preview but third-party origins cannot.
 *   - Workspace-scoping: a template owned by another workspace must 404.
 *   - 401 when there is no active workspace on the session.
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

import { GET as PREVIEW } from "@/app/(main)/(dashboard)/w/(fullscreen)/templates/[id]/preview/route";

let testWorkspace: TestWorkspace;
let testWorkspace2: TestWorkspace;

function makeRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, { method: "GET" });
}

async function createTemplate(
  workspaceId: string,
  content?: {
    contentHtml?: string | null;
    contentJson?: unknown;
    styles?: unknown;
  } | null,
) {
  let emailContent = null;
  if (content !== null) {
    emailContent = await prisma.emailContent.create({
      data: {
        subject: "Dashboard Preview Subject",
        previewText: "preview text",
        ...(content?.contentJson !== undefined && content.contentJson !== null
          ? { contentJson: content.contentJson as object }
          : {}),
        contentHtml: content?.contentHtml ?? null,
        contentText: null,
        ...(content?.styles !== undefined
          ? { styles: content.styles as object }
          : {}),
      },
    });
  }

  const template = await prisma.emailTemplate.create({
    data: {
      workspaceId,
      name: "Dashboard Preview Template",
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
    where: { subject: "Dashboard Preview Subject" },
  });
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
  await cleanupWorkspace(testWorkspace2.id);
  vi.restoreAllMocks();
});

describe("GET /w/<slug>/templates/[id]/preview — auth and access control", () => {
  test("returns 401 when there is no active workspace on the session", async () => {
    mockSession.currentOrganization = null;

    const response = await PREVIEW(makeRequest("/w/x/templates/anything/preview"), {
      params: Promise.resolve({ id: "anything" }),
    });

    expect(response.status).toBe(401);
    expect(await response.text()).toContain("No active workspace");
  });

  test("returns 404 when the template does not exist", async () => {
    const response = await PREVIEW(
      makeRequest("/w/x/templates/does-not-exist/preview"),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );

    expect(response.status).toBe(404);
    expect(await response.text()).toContain("Template not found");
  });

  test("returns 404 when the template belongs to a different workspace (cross-workspace isolation)", async () => {
    const { template: stranger } = await createTemplate(testWorkspace2.id, {
      contentHtml: "<p>secret content</p>",
    });

    const response = await PREVIEW(
      makeRequest(`/w/x/templates/${stranger.id}/preview`),
      { params: Promise.resolve({ id: stranger.id }) },
    );

    expect(response.status).toBe(404);
    const text = await response.text();
    // The stranger's content must never leak.
    expect(text).not.toContain("secret content");
  });
});

describe("GET /w/<slug>/templates/[id]/preview — rendering branches", () => {
  test("renders the HTML branch with SAMPLE_VARIABLES substituted", async () => {
    const { template } = await createTemplate(testWorkspace.id, {
      contentHtml:
        "<p>Hello {{firstName}} at {{contact.email}}</p>" +
        "<p>Unknown {{this_is_not_known}} stays as-is</p>",
    });

    const response = await PREVIEW(
      makeRequest(`/w/x/templates/${template.id}/preview`),
      { params: Promise.resolve({ id: template.id }) },
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("Hello John");
    expect(text).toContain("preview@example.com");
    // Unknown variables must not be silently dropped — they remain as-is so
    // template authors can see what's still un-rendered.
    expect(text).toContain("{{this_is_not_known}}");
  });

  test("renders the JSON branch via renderBroadcastToHtml when only contentJson is set", async () => {
    const { template } = await createTemplate(testWorkspace.id, {
      contentHtml: null,
      contentJson: { type: "doc", content: [{ type: "paragraph" }] },
    });

    const response = await PREVIEW(
      makeRequest(`/w/x/templates/${template.id}/preview`),
      { params: Promise.resolve({ id: template.id }) },
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    // The renderer always emits an HTML envelope.
    expect(text.toLowerCase()).toMatch(/<html|<!doctype/);
  });

  test("renders the placeholder when neither contentHtml nor contentJson is set", async () => {
    const { template } = await createTemplate(testWorkspace.id, null);

    const response = await PREVIEW(
      makeRequest(`/w/x/templates/${template.id}/preview`),
      { params: Promise.resolve({ id: template.id }) },
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("No content to preview");
  });

  test("prefers contentHtml over contentJson when both are set", async () => {
    const { template } = await createTemplate(testWorkspace.id, {
      contentHtml: "<p>HTML BRANCH MARKER {{firstName}}</p>",
      contentJson: { type: "doc", content: [{ type: "paragraph" }] },
    });

    const response = await PREVIEW(
      makeRequest(`/w/x/templates/${template.id}/preview`),
      { params: Promise.resolve({ id: template.id }) },
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("HTML BRANCH MARKER");
    expect(text).toContain("John");
  });
});

describe("GET /w/<slug>/templates/[id]/preview — response headers", () => {
  test("sets text/html Content-Type, no-store cache, and same-origin iframe headers", async () => {
    const { template } = await createTemplate(testWorkspace.id, {
      contentHtml: "<p>ok</p>",
    });

    const response = await PREVIEW(
      makeRequest(`/w/x/templates/${template.id}/preview`),
      { params: Promise.resolve({ id: template.id }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toMatch(/text\/html/);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    // Critical: iframe embedding only from same origin (clickjacking defense).
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(response.headers.get("Content-Security-Policy")).toBe(
      "frame-ancestors 'self'",
    );
  });
});
