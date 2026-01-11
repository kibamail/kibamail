/**
 * Integration tests for Email Template Versioning and Publishing (Internal API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/internal/v1/email-templates/[templateId]/publish - Publish template
 * - POST /api/internal/v1/email-templates/[templateId]/versions - Create new version
 * - GET /api/internal/v1/email-templates/[templateId]/versions - List all versions
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
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";

const { mockSession } = vi.hoisted(() => ({
  mockSession: {
    currentOrganization: { id: "" },
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

import { POST as PUBLISH_TEMPLATE } from "@/app/(main)/api/internal/v1/email-templates/[templateId]/publish/route";
import {
  POST as CREATE_VERSION,
  GET as LIST_VERSIONS,
} from "@/app/(main)/api/internal/v1/email-templates/[templateId]/versions/route";

let testWorkspace: TestWorkspace;
let testWorkspace2: TestWorkspace;

function createInternalRequest(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: unknown,
): NextRequest {
  const url = `http://localhost:3000/api/internal/v1${path}`;
  const headers = new Headers();

  if (body) {
    headers.set("Content-Type", "application/json");
    return new NextRequest(url, {
      method,
      headers,
      body: JSON.stringify(body),
    });
  }

  return new NextRequest(url, {
    method,
    headers,
  });
}

async function createTestEmailTemplate(
  workspaceId: string,
  overrides?: {
    name?: string;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    version?: number;
    parentId?: string | null;
    publishedVersionId?: string | null;
    subject?: string;
    withEmailContent?: boolean;
  },
) {
  let emailContent = null;

  if (overrides?.withEmailContent !== false) {
    emailContent = await prisma.emailContent.create({
      data: {
        subject: overrides?.subject ?? "Test Subject",
        previewText: "Test preview text",
        contentJson: { type: "doc", content: [] },
        contentHtml: "<p>Test content</p>",
        contentText: "Test content",
      },
    });
  }

  const template = await prisma.emailTemplate.create({
    data: {
      workspaceId,
      name: overrides?.name ?? "Test Template",
      emailContentId: emailContent?.id,
      status: overrides?.status ?? "DRAFT",
      version: overrides?.version ?? 1,
      parentId: overrides?.parentId ?? null,
      publishedVersionId: overrides?.publishedVersionId ?? null,
    },
  });

  return { template, emailContent };
}

async function cleanupTemplate(templateId: string) {
  const template = await prisma.emailTemplate.findUnique({
    where: { id: templateId },
    select: { emailContentId: true },
  });

  if (template) {
    await prisma.emailTemplate.delete({ where: { id: templateId } });
    if (template.emailContentId) {
      await prisma.emailContent
        .delete({ where: { id: template.emailContentId } })
        .catch(() => {});
    }
  }
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  testWorkspace2 = createTestWorkspace();
  mockSession.currentOrganization = { id: testWorkspace.id };
  mockSession.permissions = ["read:templates", "manage:templates"];
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
  await cleanupWorkspace(testWorkspace2.id);
  vi.restoreAllMocks();
});

describe("POST /api/internal/v1/email-templates/[templateId]/publish", () => {
  let testTemplateId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSession.permissions = ["read:templates", "manage:templates"];
    const { template } = await createTestEmailTemplate(testWorkspace.id);
    testTemplateId = template.id;
  });

  afterEach(async () => {
    if (testTemplateId) {
      await cleanupTemplate(testTemplateId);
    }
    // Clean up any child versions
    const childVersions = await prisma.emailTemplate.findMany({
      where: { parentId: testTemplateId },
    });
    for (const v of childVersions) {
      await cleanupTemplate(v.id);
    }
  });

  test("should publish a root template (first publish)", async () => {
    const request = createInternalRequest(
      `/email-templates/${testTemplateId}/publish`,
      "POST",
    );

    const response = await PUBLISH_TEMPLATE(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("email_template");
    expect(responseData.id).toBe(testTemplateId);

    const template = await prisma.emailTemplate.findUnique({
      where: { id: testTemplateId },
    });

    expect(template?.status).toBe("PUBLISHED");
    expect(template?.publishedVersionId).toBe(testTemplateId);
    expect(template?.publishedAt).not.toBeNull();
  });

  test("should not publish already published template", async () => {
    // First publish
    await prisma.emailTemplate.update({
      where: { id: testTemplateId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishedVersionId: testTemplateId,
      },
    });

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}/publish`,
      "POST",
    );

    const response = await PUBLISH_TEMPLATE(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.code).toBe(ErrorCode.TEMPLATE_ALREADY_PUBLISHED);
  });

  test("should not publish template without subject", async () => {
    // Create template with no subject
    const noSubjectContent = await prisma.emailContent.create({
      data: {
        subject: null,
        contentHtml: "<p>No subject</p>",
      },
    });

    const { template: noSubjectTemplate } = await createTestEmailTemplate(
      testWorkspace.id,
      { withEmailContent: false },
    );

    await prisma.emailTemplate.update({
      where: { id: noSubjectTemplate.id },
      data: { emailContentId: noSubjectContent.id },
    });

    try {
      const request = createInternalRequest(
        `/email-templates/${noSubjectTemplate.id}/publish`,
        "POST",
      );

      const response = await PUBLISH_TEMPLATE(request, {
        params: Promise.resolve({ templateId: noSubjectTemplate.id }),
      });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error.code).toBe(ErrorCode.TEMPLATE_NO_CONTENT);
    } finally {
      // cleanupTemplate will cascade delete the emailContent
      await cleanupTemplate(noSubjectTemplate.id);
    }
  });

  test("should publish version and archive previous published version", async () => {
    // First, publish the root template
    await prisma.emailTemplate.update({
      where: { id: testTemplateId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishedVersionId: testTemplateId,
      },
    });

    // Create a new draft version
    const { template: v2Template } = await createTestEmailTemplate(
      testWorkspace.id,
      {
        name: "Test Template",
        version: 2,
        parentId: testTemplateId,
        status: "DRAFT",
      },
    );

    try {
      const request = createInternalRequest(
        `/email-templates/${v2Template.id}/publish`,
        "POST",
      );

      const response = await PUBLISH_TEMPLATE(request, {
        params: Promise.resolve({ templateId: v2Template.id }),
      });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.id).toBe(v2Template.id);

      // Check that v2 is now published
      const publishedTemplate = await prisma.emailTemplate.findUnique({
        where: { id: v2Template.id },
      });
      expect(publishedTemplate?.status).toBe("PUBLISHED");

      // Check that v1 (root) is now archived
      const archivedTemplate = await prisma.emailTemplate.findUnique({
        where: { id: testTemplateId },
      });
      expect(archivedTemplate?.status).toBe("ARCHIVED");

      // Check that root's publishedVersionId points to v2
      expect(archivedTemplate?.publishedVersionId).toBe(v2Template.id);
    } finally {
      await cleanupTemplate(v2Template.id);
    }
  });

  test("should return 404 for non-existent template", async () => {
    const request = createInternalRequest(
      "/email-templates/non-existent/publish",
      "POST",
    );

    const response = await PUBLISH_TEMPLATE(request, {
      params: Promise.resolve({ templateId: "non-existent" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.TEMPLATE_NOT_FOUND);
  });

  test("should return 404 for template from different workspace", async () => {
    const { template: otherTemplate } = await createTestEmailTemplate(
      testWorkspace2.id,
    );

    try {
      const request = createInternalRequest(
        `/email-templates/${otherTemplate.id}/publish`,
        "POST",
      );

      const response = await PUBLISH_TEMPLATE(request, {
        params: Promise.resolve({ templateId: otherTemplate.id }),
      });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error.code).toBe(ErrorCode.TEMPLATE_NOT_FOUND);
    } finally {
      await cleanupTemplate(otherTemplate.id);
    }
  });

  test("should return 403 without manage:templates permission", async () => {
    mockSession.permissions = ["read:templates"];

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}/publish`,
      "POST",
    );

    const response = await PUBLISH_TEMPLATE(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData.error.message).toContain("permission");
  });
});

describe("POST /api/internal/v1/email-templates/[templateId]/versions", () => {
  let testTemplateId: string;
  let createdVersionIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSession.permissions = ["read:templates", "manage:templates"];
    createdVersionIds = [];

    // Create and publish a root template
    const { template } = await createTestEmailTemplate(testWorkspace.id, {
      subject: "Original Subject",
    });
    testTemplateId = template.id;

    await prisma.emailTemplate.update({
      where: { id: testTemplateId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishedVersionId: testTemplateId,
      },
    });
  });

  afterEach(async () => {
    // Clean up versions in reverse order
    for (const vId of [...createdVersionIds].reverse()) {
      await cleanupTemplate(vId);
    }
    if (testTemplateId) {
      await cleanupTemplate(testTemplateId);
    }
  });

  test("should create a new version from root template", async () => {
    const request = createInternalRequest(
      `/email-templates/${testTemplateId}/versions`,
      "POST",
    );

    const response = await CREATE_VERSION(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("email_template");
    expect(responseData.id).toBeDefined();
    createdVersionIds.push(responseData.id);

    const newVersion = await prisma.emailTemplate.findUnique({
      where: { id: responseData.id },
      include: { emailContent: true },
    });

    expect(newVersion?.status).toBe("DRAFT");
    expect(newVersion?.version).toBe(2);
    expect(newVersion?.parentId).toBe(testTemplateId);
    expect(newVersion?.emailContent?.subject).toBe("Original Subject");
  });

  test("should create version from existing version", async () => {
    // Create first version
    const { template: v2 } = await createTestEmailTemplate(testWorkspace.id, {
      name: "Test Template",
      version: 2,
      parentId: testTemplateId,
      status: "PUBLISHED",
      subject: "Version 2 Subject",
    });
    createdVersionIds.push(v2.id);

    // Archive root and update root's publishedVersionId
    await prisma.emailTemplate.update({
      where: { id: testTemplateId },
      data: {
        status: "ARCHIVED",
        publishedVersionId: v2.id,
      },
    });

    const request = createInternalRequest(
      `/email-templates/${v2.id}/versions`,
      "POST",
    );

    const response = await CREATE_VERSION(request, {
      params: Promise.resolve({ templateId: v2.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    createdVersionIds.push(responseData.id);

    const newVersion = await prisma.emailTemplate.findUnique({
      where: { id: responseData.id },
      include: { emailContent: true },
    });

    expect(newVersion?.status).toBe("DRAFT");
    expect(newVersion?.version).toBe(3);
    expect(newVersion?.parentId).toBe(testTemplateId); // Points to root
    expect(newVersion?.emailContent?.subject).toBe("Version 2 Subject");
  });

  test("should reject when DRAFT already exists", async () => {
    // Create a draft version
    const { template: draftVersion } = await createTestEmailTemplate(
      testWorkspace.id,
      {
        name: "Test Template",
        version: 2,
        parentId: testTemplateId,
        status: "DRAFT",
      },
    );
    createdVersionIds.push(draftVersion.id);

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}/versions`,
      "POST",
    );

    const response = await CREATE_VERSION(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(409);
    expect(responseData.error.code).toBe(ErrorCode.TEMPLATE_HAS_DRAFT_VERSION);
  });

  test("should copy email content when creating version", async () => {
    // Update root template's email content with specific values
    const rootTemplate = await prisma.emailTemplate.findUnique({
      where: { id: testTemplateId },
      include: { emailContent: true },
    });

    await prisma.emailContent.update({
      where: { id: rootTemplate!.emailContentId! },
      data: {
        subject: "Custom Subject",
        previewText: "Custom Preview",
        contentJson: { type: "doc", content: [{ type: "paragraph" }] },
        contentHtml: "<p>Custom HTML</p>",
        styles: { backgroundColor: "#fff" },
      },
    });

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}/versions`,
      "POST",
    );

    const response = await CREATE_VERSION(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    createdVersionIds.push(responseData.id);

    const newVersion = await prisma.emailTemplate.findUnique({
      where: { id: responseData.id },
      include: { emailContent: true },
    });

    // Verify content was copied
    expect(newVersion?.emailContent?.subject).toBe("Custom Subject");
    expect(newVersion?.emailContent?.previewText).toBe("Custom Preview");
    expect(newVersion?.emailContent?.contentHtml).toBe("<p>Custom HTML</p>");
    expect(newVersion?.emailContent?.styles).toEqual({ backgroundColor: "#fff" });

    // Verify it's a new email content record
    expect(newVersion?.emailContentId).not.toBe(rootTemplate!.emailContentId);
  });

  test("should increment version numbers correctly", async () => {
    // Create v2 and publish
    const { template: v2 } = await createTestEmailTemplate(testWorkspace.id, {
      name: "Test Template",
      version: 2,
      parentId: testTemplateId,
      status: "PUBLISHED",
    });
    createdVersionIds.push(v2.id);

    // Create v3 and publish
    const { template: v3 } = await createTestEmailTemplate(testWorkspace.id, {
      name: "Test Template",
      version: 3,
      parentId: testTemplateId,
      status: "ARCHIVED",
    });
    createdVersionIds.push(v3.id);

    // Update root to point to v2 as published
    await prisma.emailTemplate.update({
      where: { id: testTemplateId },
      data: {
        status: "ARCHIVED",
        publishedVersionId: v2.id,
      },
    });

    // Create new version from v2
    const request = createInternalRequest(
      `/email-templates/${v2.id}/versions`,
      "POST",
    );

    const response = await CREATE_VERSION(request, {
      params: Promise.resolve({ templateId: v2.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    createdVersionIds.push(responseData.id);

    const newVersion = await prisma.emailTemplate.findUnique({
      where: { id: responseData.id },
    });

    // Should be v4 (max of 1, 2, 3) + 1
    expect(newVersion?.version).toBe(4);
  });

  test("should return 404 for non-existent template", async () => {
    const request = createInternalRequest(
      "/email-templates/non-existent/versions",
      "POST",
    );

    const response = await CREATE_VERSION(request, {
      params: Promise.resolve({ templateId: "non-existent" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.TEMPLATE_NOT_FOUND);
  });

  test("should return 403 without manage:templates permission", async () => {
    mockSession.permissions = ["read:templates"];

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}/versions`,
      "POST",
    );

    const response = await CREATE_VERSION(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData.error.message).toContain("permission");
  });
});

describe("GET /api/internal/v1/email-templates/[templateId]/versions", () => {
  let testTemplateId: string;
  let createdVersionIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSession.permissions = ["read:templates", "manage:templates"];
    createdVersionIds = [];

    // Create and publish a root template
    const { template } = await createTestEmailTemplate(testWorkspace.id);
    testTemplateId = template.id;

    await prisma.emailTemplate.update({
      where: { id: testTemplateId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishedVersionId: testTemplateId,
      },
    });
  });

  afterEach(async () => {
    for (const vId of [...createdVersionIds].reverse()) {
      await cleanupTemplate(vId);
    }
    if (testTemplateId) {
      await cleanupTemplate(testTemplateId);
    }
  });

  test("should list all versions of a template", async () => {
    // Create v2 (draft)
    const { template: v2 } = await createTestEmailTemplate(testWorkspace.id, {
      name: "Test Template",
      version: 2,
      parentId: testTemplateId,
      status: "DRAFT",
    });
    createdVersionIds.push(v2.id);

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}/versions`,
      "GET",
    );

    const response = await LIST_VERSIONS(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("email_template_versions");
    expect(responseData.data).toHaveLength(2);
    expect(responseData.rootTemplateId).toBe(testTemplateId);
    expect(responseData.publishedVersionId).toBe(testTemplateId);

    // Check v1 (root)
    const v1Data = responseData.data.find(
      (v: { id: string }) => v.id === testTemplateId,
    );
    expect(v1Data.version).toBe(1);
    expect(v1Data.status).toBe("PUBLISHED");
    expect(v1Data.isLive).toBe(true);

    // Check v2 (draft)
    const v2Data = responseData.data.find(
      (v: { id: string }) => v.id === v2.id,
    );
    expect(v2Data.version).toBe(2);
    expect(v2Data.status).toBe("DRAFT");
    expect(v2Data.isLive).toBe(false);
  });

  test("should return versions ordered by version number ascending", async () => {
    // Create v3 first
    const { template: v3 } = await createTestEmailTemplate(testWorkspace.id, {
      name: "Test Template",
      version: 3,
      parentId: testTemplateId,
      status: "ARCHIVED",
    });
    createdVersionIds.push(v3.id);

    // Create v2
    const { template: v2 } = await createTestEmailTemplate(testWorkspace.id, {
      name: "Test Template",
      version: 2,
      parentId: testTemplateId,
      status: "DRAFT",
    });
    createdVersionIds.push(v2.id);

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}/versions`,
      "GET",
    );

    const response = await LIST_VERSIONS(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data).toHaveLength(3);

    // Verify order
    expect(responseData.data[0].version).toBe(1);
    expect(responseData.data[1].version).toBe(2);
    expect(responseData.data[2].version).toBe(3);
  });

  test("should work when queried from a child version", async () => {
    // Create v2
    const { template: v2 } = await createTestEmailTemplate(testWorkspace.id, {
      name: "Test Template",
      version: 2,
      parentId: testTemplateId,
      status: "DRAFT",
    });
    createdVersionIds.push(v2.id);

    // Query from v2 instead of root
    const request = createInternalRequest(
      `/email-templates/${v2.id}/versions`,
      "GET",
    );

    const response = await LIST_VERSIONS(request, {
      params: Promise.resolve({ templateId: v2.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data).toHaveLength(2);
    expect(responseData.rootTemplateId).toBe(testTemplateId);
  });

  test("should correctly identify live version when it's not root", async () => {
    // Create v2 and make it published
    const { template: v2 } = await createTestEmailTemplate(testWorkspace.id, {
      name: "Test Template",
      version: 2,
      parentId: testTemplateId,
      status: "PUBLISHED",
    });
    createdVersionIds.push(v2.id);

    // Archive root and point to v2
    await prisma.emailTemplate.update({
      where: { id: testTemplateId },
      data: {
        status: "ARCHIVED",
        publishedVersionId: v2.id,
      },
    });

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}/versions`,
      "GET",
    );

    const response = await LIST_VERSIONS(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.publishedVersionId).toBe(v2.id);

    // Root should not be live
    const v1Data = responseData.data.find(
      (v: { id: string }) => v.id === testTemplateId,
    );
    expect(v1Data.isLive).toBe(false);
    expect(v1Data.status).toBe("ARCHIVED");

    // v2 should be live
    const v2Data = responseData.data.find(
      (v: { id: string }) => v.id === v2.id,
    );
    expect(v2Data.isLive).toBe(true);
    expect(v2Data.status).toBe("PUBLISHED");
  });

  test("should return 404 for non-existent template", async () => {
    const request = createInternalRequest(
      "/email-templates/non-existent/versions",
      "GET",
    );

    const response = await LIST_VERSIONS(request, {
      params: Promise.resolve({ templateId: "non-existent" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.TEMPLATE_NOT_FOUND);
  });

  test("should return 404 for template from different workspace", async () => {
    const { template: otherTemplate } = await createTestEmailTemplate(
      testWorkspace2.id,
    );

    try {
      const request = createInternalRequest(
        `/email-templates/${otherTemplate.id}/versions`,
        "GET",
      );

      const response = await LIST_VERSIONS(request, {
        params: Promise.resolve({ templateId: otherTemplate.id }),
      });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error.code).toBe(ErrorCode.TEMPLATE_NOT_FOUND);
    } finally {
      await cleanupTemplate(otherTemplate.id);
    }
  });

  test("should return 403 without read:templates permission", async () => {
    mockSession.permissions = ["manage:forms"];

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}/versions`,
      "GET",
    );

    const response = await LIST_VERSIONS(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData.error.message).toContain("permission");
  });
});
