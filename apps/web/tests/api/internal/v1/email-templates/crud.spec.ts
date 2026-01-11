/**
 * Integration tests for Email Templates CRUD Operations (Internal API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/internal/v1/email-templates - List templates
 * - POST /api/internal/v1/email-templates - Create template
 * - GET /api/internal/v1/email-templates/[templateId] - Get template by ID
 * - PUT /api/internal/v1/email-templates/[templateId] - Update template (DRAFT only)
 * - DELETE /api/internal/v1/email-templates/[templateId] - Delete template
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
import { ErrorType } from "@/lib/api/error-codes";

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

import {
  DELETE,
  GET,
  PUT,
} from "@/app/(main)/api/internal/v1/email-templates/[templateId]/route";
import {
  POST as CREATE_TEMPLATE,
  GET as LIST_TEMPLATES,
} from "@/app/(main)/api/internal/v1/email-templates/route";

let testWorkspace: TestWorkspace;
let testWorkspace2: TestWorkspace;
let testTemplateId: string;
let testEmailContentId: string;

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
    description?: string;
    trackClicks?: boolean;
    trackOpens?: boolean;
    withEmailContent?: boolean;
  },
) {
  let emailContent = null;

  // By default, create with email content for backwards compatibility
  if (overrides?.withEmailContent !== false) {
    emailContent = await prisma.emailContent.create({
      data: {
        subject: "Test Subject",
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
      description: overrides?.description ?? "Test description",
      emailContentId: emailContent?.id,
      trackClicks: overrides?.trackClicks ?? true,
      trackOpens: overrides?.trackOpens ?? true,
      status: "DRAFT",
      version: 1,
    },
  });

  return { template, emailContent };
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  testWorkspace2 = createTestWorkspace();
  mockSession.currentOrganization = { id: testWorkspace.id };
  mockSession.permissions = ["read:templates", "manage:templates"];
});

beforeEach(async () => {
  vi.clearAllMocks();
  mockSession.permissions = ["read:templates", "manage:templates"];

  const { template, emailContent } = await createTestEmailTemplate(
    testWorkspace.id,
  );
  testTemplateId = template.id;
  testEmailContentId = emailContent?.id ?? "";
});

afterEach(async () => {
  // Reset permissions to default for next test
  mockSession.permissions = ["read:templates", "manage:templates"];

  if (testTemplateId) {
    await prisma.emailTemplate
      .delete({ where: { id: testTemplateId } })
      .catch(() => {});
    testTemplateId = "";
  }
  if (testEmailContentId) {
    await prisma.emailContent
      .delete({ where: { id: testEmailContentId } })
      .catch(() => {});
    testEmailContentId = "";
  }
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
  await cleanupWorkspace(testWorkspace2.id);
  vi.restoreAllMocks();
});

describe("POST /api/internal/v1/email-templates", () => {
  test("should create an email template with auto-generated emailContent", async () => {
    const request = createInternalRequest("/email-templates", "POST", {
      name: "New Template",
    });

    const response = await CREATE_TEMPLATE(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("email_template");
    expect(responseData.id).toBeDefined();

    const template = await prisma.emailTemplate.findUnique({
      where: { id: responseData.id },
      include: { emailContent: true },
    });

    expect(template).not.toBeNull();
    expect(template?.name).toBe("New Template");
    expect(template?.status).toBe("DRAFT");
    expect(template?.version).toBe(1);
    expect(template?.emailContentId).toBeDefined();
    expect(template?.emailContent).not.toBeNull();
    expect(template?.trackClicks).toBe(true);
    expect(template?.trackOpens).toBe(true);
    // Sender identities should be null on create
    expect(template?.senderIdentityId).toBeNull();
    expect(template?.replyToIdentityId).toBeNull();

    // Cleanup
    await prisma.emailTemplate.delete({ where: { id: responseData.id } });
    if (template?.emailContentId) {
      await prisma.emailContent.delete({
        where: { id: template.emailContentId },
      });
    }
  });

  test("should create template with all optional fields", async () => {
    const request = createInternalRequest("/email-templates", "POST", {
      name: "Password Reset Template",
      description: "Template for password reset emails",
      trackClicks: false,
      trackOpens: false,
    });

    const response = await CREATE_TEMPLATE(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);

    const template = await prisma.emailTemplate.findUnique({
      where: { id: responseData.id },
    });

    expect(template?.name).toBe("Password Reset Template");
    expect(template?.description).toBe("Template for password reset emails");
    expect(template?.trackClicks).toBe(false);
    expect(template?.trackOpens).toBe(false);
    expect(template?.emailContentId).toBeDefined();

    // Cleanup
    await prisma.emailTemplate.delete({ where: { id: responseData.id } });
    if (template?.emailContentId) {
      await prisma.emailContent.delete({
        where: { id: template.emailContentId },
      });
    }
  });

  test("should return 422 for missing name", async () => {
    const request = createInternalRequest("/email-templates", "POST", {
      description: "No name provided",
    });

    const response = await CREATE_TEMPLATE(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
  });

  test("should return 403 without manage:templates permission", async () => {
    mockSession.permissions = ["read:templates"];

    const request = createInternalRequest("/email-templates", "POST", {
      name: "Test Template",
    });

    const response = await CREATE_TEMPLATE(request);
    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData.error.message).toContain("permission");
  });
});

describe("GET /api/internal/v1/email-templates", () => {
  test("should list email templates with pagination", async () => {
    const emailContent1 = await prisma.emailContent.create({
      data: { subject: "Template 1", contentHtml: "<p>1</p>" },
    });
    const emailContent2 = await prisma.emailContent.create({
      data: { subject: "Template 2", contentHtml: "<p>2</p>" },
    });
    const emailContent3 = await prisma.emailContent.create({
      data: { subject: "Template 3", contentHtml: "<p>3</p>" },
    });

    await prisma.emailTemplate.createMany({
      data: [
        {
          workspaceId: testWorkspace.id,
          name: "Template 1",
          emailContentId: emailContent1.id,
          status: "DRAFT",
          version: 1,
        },
        {
          workspaceId: testWorkspace.id,
          name: "Template 2",
          emailContentId: emailContent2.id,
          status: "PUBLISHED",
          version: 1,
        },
        {
          workspaceId: testWorkspace.id,
          name: "Template 3",
          emailContentId: emailContent3.id,
          status: "ARCHIVED",
          version: 2,
        },
      ],
    });

    const request = createInternalRequest("/email-templates", "GET");

    const response = await LIST_TEMPLATES(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("email_template_list");
    expect(responseData.data).toBeInstanceOf(Array);

    const templateNames = responseData.data.map(
      (t: { name: string }) => t.name,
    );
    expect(templateNames).toContain("Template 1");
    expect(templateNames).toContain("Template 2");
    expect(templateNames).toContain("Template 3");

    await prisma.emailTemplate.deleteMany({
      where: { workspaceId: testWorkspace.id },
    });
    await prisma.emailContent.deleteMany({
      where: {
        id: { in: [emailContent1.id, emailContent2.id, emailContent3.id] },
      },
    });
  });

  test("should return empty list when no templates exist", async () => {
    await prisma.emailTemplate.deleteMany({
      where: { workspaceId: testWorkspace.id },
    });

    const request = createInternalRequest("/email-templates", "GET");

    const response = await LIST_TEMPLATES(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data).toEqual([]);
    expect(responseData.hasMore).toBe(false);
  });

  test("should return 403 without read:templates permission", async () => {
    mockSession.permissions = ["manage:forms"];

    const request = createInternalRequest("/email-templates", "GET");

    const response = await LIST_TEMPLATES(request);
    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData.error.message).toContain("permission");
  });
});

describe("GET /api/internal/v1/email-templates/[templateId]", () => {
  test("should get an email template by ID with full content", async () => {
    const request = createInternalRequest(
      `/email-templates/${testTemplateId}`,
      "GET",
    );

    const response = await GET(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("email_template");
    expect(responseData.id).toBe(testTemplateId);
    expect(responseData.name).toBe("Test Template");
    expect(responseData.description).toBe("Test description");
    expect(responseData.status).toBe("DRAFT");
    expect(responseData.version).toBe(1);
    expect(responseData.emailContent).toBeDefined();
    expect(responseData.emailContent.subject).toBe("Test Subject");
    expect(responseData.emailContent.previewText).toBe("Test preview text");
    expect(responseData.trackClicks).toBe(true);
    expect(responseData.trackOpens).toBe(true);
  });

  test("should return 404 for non-existent template", async () => {
    const request = createInternalRequest(
      "/email-templates/non-existent",
      "GET",
    );

    const response = await GET(request, {
      params: Promise.resolve({ templateId: "non-existent" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBe("RESOURCE_NOT_FOUND");
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should return 404 for template from different workspace", async () => {
    const { template: otherTemplate } = await createTestEmailTemplate(
      testWorkspace2.id,
    );

    try {
      const request = createInternalRequest(
        `/email-templates/${otherTemplate.id}`,
        "GET",
      );

      const response = await GET(request, {
        params: Promise.resolve({ templateId: otherTemplate.id }),
      });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error.code).toBe("RESOURCE_NOT_FOUND");
    } finally {
      await prisma.emailTemplate.delete({ where: { id: otherTemplate.id } });
    }
  });

  test("should include sender identity in response", async () => {
    const sendingDomain = await prisma.sendingDomain.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "example.com",
        dkimSubDomain: "kiba",
        dkimPublicKey: "test-key",
        dkimPrivateKey: "test-private",
        returnPathSubDomain: "bounce",
        returnPathDomainCnameValue: "bounce.example.com",
        trackingSubDomain: "track",
        trackingDomainCnameValue: "track.example.com",
        dmarcReportingCode: "testcode123",
      },
    });

    const senderIdentity = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Test Sender",
        email: "test",
        sendingDomainId: sendingDomain.id,
      },
    });

    await prisma.emailTemplate.update({
      where: { id: testTemplateId },
      data: { senderIdentityId: senderIdentity.id },
    });

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}`,
      "GET",
    );

    const response = await GET(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.senderIdentity).toBeDefined();
    expect(responseData.senderIdentity.id).toBe(senderIdentity.id);
    expect(responseData.senderIdentity.name).toBe("Test Sender");
    expect(responseData.senderIdentity.email).toBe("test");

    await prisma.senderIdentity.delete({ where: { id: senderIdentity.id } });
    await prisma.sendingDomain.delete({ where: { id: sendingDomain.id } });
  });

  test("should return 403 without read:templates permission", async () => {
    mockSession.permissions = ["manage:forms"];

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}`,
      "GET",
    );

    const response = await GET(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData.error.message).toContain("permission");
  });

  test("should handle template without emailContent", async () => {
    // Create a template without email content
    const { template } = await createTestEmailTemplate(testWorkspace.id, {
      name: "No Content Template",
      withEmailContent: false,
    });

    try {
      const request = createInternalRequest(
        `/email-templates/${template.id}`,
        "GET",
      );

      const response = await GET(request, {
        params: Promise.resolve({ templateId: template.id }),
      });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.name).toBe("No Content Template");
      expect(responseData.emailContentId).toBeNull();
      expect(responseData.emailContent).toBeNull();
    } finally {
      await prisma.emailTemplate.delete({ where: { id: template.id } });
    }
  });
});

describe("PUT /api/internal/v1/email-templates/[templateId]", () => {
  test("should update a DRAFT template", async () => {
    const request = createInternalRequest(
      `/email-templates/${testTemplateId}`,
      "PUT",
      {
        name: "Updated Template Name",
        description: "Updated description",
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("email_template");
    expect(responseData.id).toBe(testTemplateId);

    const template = await prisma.emailTemplate.findUnique({
      where: { id: testTemplateId },
    });

    expect(template?.name).toBe("Updated Template Name");
    expect(template?.description).toBe("Updated description");
  });

  test("should update tracking settings", async () => {
    const request = createInternalRequest(
      `/email-templates/${testTemplateId}`,
      "PUT",
      {
        trackClicks: false,
        trackOpens: false,
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });

    expect(response.status).toBe(200);

    const template = await prisma.emailTemplate.findUnique({
      where: { id: testTemplateId },
    });

    expect(template?.trackClicks).toBe(false);
    expect(template?.trackOpens).toBe(false);
  });

  test("should not allow updating published templates", async () => {
    await prisma.emailTemplate.update({
      where: { id: testTemplateId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishedVersionId: testTemplateId,
      },
    });

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}`,
      "PUT",
      {
        name: "Updated Name",
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("DRAFT");
    expect(responseData.error.message).toContain("edited");
  });

  test("should not allow updating archived templates", async () => {
    await prisma.emailTemplate.update({
      where: { id: testTemplateId },
      data: { status: "ARCHIVED" },
    });

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}`,
      "PUT",
      {
        name: "Updated Name",
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("DRAFT");
    expect(responseData.error.message).toContain("edited");
  });

  test("should return 404 for non-existent template", async () => {
    const request = createInternalRequest(
      "/email-templates/non-existent",
      "PUT",
      { name: "Updated Name" },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ templateId: "non-existent" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
  });

  test("should return 404 for template from different workspace", async () => {
    const { template: otherTemplate } = await createTestEmailTemplate(
      testWorkspace2.id,
    );

    try {
      const request = createInternalRequest(
        `/email-templates/${otherTemplate.id}`,
        "PUT",
        { name: "Updated Name" },
      );

      const response = await PUT(request, {
        params: Promise.resolve({ templateId: otherTemplate.id }),
      });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error.code).toBe("RESOURCE_NOT_FOUND");
    } finally {
      await prisma.emailTemplate.delete({ where: { id: otherTemplate.id } });
    }
  });

  test("should return 404 for invalid senderIdentityId on update", async () => {
    const request = createInternalRequest(
      `/email-templates/${testTemplateId}`,
      "PUT",
      { senderIdentityId: "invalid-sender-id" },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe("RESOURCE_NOT_FOUND");
    expect(responseData.error.message).toContain("Sender identity not found");
  });

  test("should allow clearing senderIdentityId by setting null", async () => {
    // First set a sender identity
    const sendingDomain = await prisma.sendingDomain.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "test-clear.com",
        dkimSubDomain: "kiba",
        dkimPublicKey: "test-key",
        dkimPrivateKey: "test-private",
        returnPathSubDomain: "bounce",
        returnPathDomainCnameValue: "bounce.test-clear.com",
        trackingSubDomain: "track",
        trackingDomainCnameValue: "track.test-clear.com",
        dmarcReportingCode: "testcode789",
      },
    });

    const senderIdentity = await prisma.senderIdentity.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Test Clear Sender",
        email: "clear",
        sendingDomainId: sendingDomain.id,
      },
    });

    try {
      // Set the sender identity
      await prisma.emailTemplate.update({
        where: { id: testTemplateId },
        data: { senderIdentityId: senderIdentity.id },
      });

      // Clear it by setting null
      const request = createInternalRequest(
        `/email-templates/${testTemplateId}`,
        "PUT",
        { senderIdentityId: null },
      );

      const response = await PUT(request, {
        params: Promise.resolve({ templateId: testTemplateId }),
      });

      expect(response.status).toBe(200);

      const template = await prisma.emailTemplate.findUnique({
        where: { id: testTemplateId },
      });

      expect(template?.senderIdentityId).toBeNull();
    } finally {
      await prisma.senderIdentity.delete({ where: { id: senderIdentity.id } });
      await prisma.sendingDomain.delete({ where: { id: sendingDomain.id } });
    }
  });

  test("should return 403 without manage:templates permission", async () => {
    mockSession.permissions = ["read:templates"];

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}`,
      "PUT",
      { name: "Updated Name" },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData.error.message).toContain("permission");
  });
});

describe("DELETE /api/internal/v1/email-templates/[templateId]", () => {
  test("should delete a DRAFT template", async () => {
    const { template: templateToDelete } = await createTestEmailTemplate(
      testWorkspace.id,
      { name: "Template to Delete" },
    );

    const request = createInternalRequest(
      `/email-templates/${templateToDelete.id}`,
      "DELETE",
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ templateId: templateToDelete.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("email_template");
    expect(responseData.id).toBe(templateToDelete.id);

    const deletedTemplate = await prisma.emailTemplate.findUnique({
      where: { id: templateToDelete.id },
    });
    expect(deletedTemplate).toBeNull();
  });

  test("should cascade delete email content when template is deleted", async () => {
    const emailContent = await prisma.emailContent.create({
      data: {
        subject: "Dedicated Content",
        contentHtml: "<p>Dedicated content</p>",
      },
    });

    const template = await prisma.emailTemplate.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Template with Dedicated Content",
        emailContentId: emailContent.id,
        status: "DRAFT",
        version: 1,
      },
    });

    const request = createInternalRequest(
      `/email-templates/${template.id}`,
      "DELETE",
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ templateId: template.id }),
    });

    expect(response.status).toBe(200);

    const deletedTemplate = await prisma.emailTemplate.findUnique({
      where: { id: template.id },
    });
    expect(deletedTemplate).toBeNull();

    const deletedContent = await prisma.emailContent.findUnique({
      where: { id: emailContent.id },
    });
    expect(deletedContent).toBeNull();
  });

  test("should not allow deleting published templates", async () => {
    await prisma.emailTemplate.update({
      where: { id: testTemplateId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishedVersionId: testTemplateId,
      },
    });

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}`,
      "DELETE",
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("DRAFT");
    expect(responseData.error.message).toContain("deleted");
  });

  test("should not allow deleting archived templates", async () => {
    await prisma.emailTemplate.update({
      where: { id: testTemplateId },
      data: { status: "ARCHIVED" },
    });

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}`,
      "DELETE",
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.message).toContain("DRAFT");
    expect(responseData.error.message).toContain("deleted");
  });

  test("should return 404 for non-existent template", async () => {
    const request = createInternalRequest(
      "/email-templates/non-existent",
      "DELETE",
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ templateId: "non-existent" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.requestId).toBeDefined();
  });

  test("should return 404 for template from different workspace", async () => {
    const { template: otherTemplate } = await createTestEmailTemplate(
      testWorkspace2.id,
    );

    try {
      const request = createInternalRequest(
        `/email-templates/${otherTemplate.id}`,
        "DELETE",
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ templateId: otherTemplate.id }),
      });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error.code).toBe("RESOURCE_NOT_FOUND");
    } finally {
      await prisma.emailTemplate.delete({ where: { id: otherTemplate.id } });
    }
  });

  test("should return 403 without manage:templates permission", async () => {
    mockSession.permissions = ["read:templates"];

    const request = createInternalRequest(
      `/email-templates/${testTemplateId}`,
      "DELETE",
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ templateId: testTemplateId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData.error.message).toContain("permission");
  });
});
