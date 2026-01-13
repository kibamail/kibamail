/**
 * Integration tests for Template Groups CRUD Operations (Internal API)
 *
 * Tests the actual Next.js route handlers for:
 * - GET /api/internal/v1/template-groups - List groups
 * - POST /api/internal/v1/template-groups - Create group
 * - GET /api/internal/v1/template-groups/[groupId] - Get group by ID
 * - PUT /api/internal/v1/template-groups/[groupId] - Update group
 * - DELETE /api/internal/v1/template-groups/[groupId] - Delete group (soft delete)
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
} from "@/app/(main)/api/internal/v1/template-groups/[groupId]/route";
import {
  POST as CREATE_GROUP,
  GET as LIST_GROUPS,
} from "@/app/(main)/api/internal/v1/template-groups/route";
import { PUT as UPDATE_TEMPLATE } from "@/app/(main)/api/internal/v1/email-templates/[templateId]/route";

let testWorkspace: TestWorkspace;
let testWorkspace2: TestWorkspace;
let testGroupId: string;

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

async function createTestTemplateGroup(
  workspaceId: string,
  overrides?: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
  },
) {
  const group = await prisma.templateGroup.create({
    data: {
      workspaceId,
      name: overrides?.name ?? "Test Group",
      description: overrides?.description ?? "Test description",
      color: overrides?.color ?? "#6366F1",
      icon: overrides?.icon ?? "folder",
    },
  });

  return group;
}

async function createTestEmailTemplate(
  workspaceId: string,
  templateGroupId?: string | null,
) {
  const emailContent = await prisma.emailContent.create({
    data: {
      subject: "Test Subject",
      contentHtml: "<p>Test</p>",
    },
  });

  const template = await prisma.emailTemplate.create({
    data: {
      workspaceId,
      name: "Test Template",
      emailContentId: emailContent.id,
      templateGroupId,
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

  const group = await createTestTemplateGroup(testWorkspace.id);
  testGroupId = group.id;
});

afterEach(async () => {
  mockSession.permissions = ["read:templates", "manage:templates"];

  if (testGroupId) {
    await prisma.templateGroup
      .delete({ where: { id: testGroupId } })
      .catch(() => {});
    testGroupId = "";
  }

  // Clean up any remaining test data
  await prisma.emailTemplate.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
  await prisma.emailContent.deleteMany({
    where: {
      templates: { none: {} },
    },
  });
  await prisma.templateGroup.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
  await cleanupWorkspace(testWorkspace2.id);
  vi.restoreAllMocks();
});

describe("POST /api/internal/v1/template-groups", () => {
  test("should create a template group with required fields only", async () => {
    const request = createInternalRequest("/template-groups", "POST", {
      name: "New Group",
    });

    const response = await CREATE_GROUP(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("template_group");
    expect(responseData.id).toBeDefined();

    const group = await prisma.templateGroup.findUnique({
      where: { id: responseData.id },
    });

    expect(group).not.toBeNull();
    expect(group?.name).toBe("New Group");
    expect(group?.color).toBe("#6366F1"); // default color
    expect(group?.icon).toBe("folder"); // default icon
    expect(group?.deletedAt).toBeNull();

    // Cleanup
    await prisma.templateGroup.delete({ where: { id: responseData.id } });
  });

  test("should create a template group with all optional fields", async () => {
    const request = createInternalRequest("/template-groups", "POST", {
      name: "Marketing Templates",
      description: "Templates for marketing campaigns",
      color: "#EF4444",
      icon: "mail",
    });

    const response = await CREATE_GROUP(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);

    const group = await prisma.templateGroup.findUnique({
      where: { id: responseData.id },
    });

    expect(group?.name).toBe("Marketing Templates");
    expect(group?.description).toBe("Templates for marketing campaigns");
    expect(group?.color).toBe("#EF4444");
    expect(group?.icon).toBe("mail");

    // Cleanup
    await prisma.templateGroup.delete({ where: { id: responseData.id } });
  });

  test("should return 422 for missing name", async () => {
    const request = createInternalRequest("/template-groups", "POST", {
      description: "No name provided",
    });

    const response = await CREATE_GROUP(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
  });

  test("should return 422 for invalid color format", async () => {
    const request = createInternalRequest("/template-groups", "POST", {
      name: "Test Group",
      color: "invalid-color",
    });

    const response = await CREATE_GROUP(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
  });

  test("should return 409 for duplicate group name in same workspace", async () => {
    const request = createInternalRequest("/template-groups", "POST", {
      name: "Test Group", // Same as the one created in beforeEach
    });

    const response = await CREATE_GROUP(request);
    const responseData = await response.json();

    expect(response.status).toBe(409);
    expect(responseData.error.message).toContain("already exists");
  });

  test("should allow same name in different workspace", async () => {
    mockSession.currentOrganization = { id: testWorkspace2.id };

    const request = createInternalRequest("/template-groups", "POST", {
      name: "Test Group", // Same name but different workspace
    });

    const response = await CREATE_GROUP(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);

    // Cleanup
    await prisma.templateGroup.delete({ where: { id: responseData.id } });

    // Reset session
    mockSession.currentOrganization = { id: testWorkspace.id };
  });

  test("should return 403 without manage:templates permission", async () => {
    mockSession.permissions = ["read:templates"];

    const request = createInternalRequest("/template-groups", "POST", {
      name: "Test Group 2",
    });

    const response = await CREATE_GROUP(request);
    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData.error.message).toContain("permission");
  });
});

describe("GET /api/internal/v1/template-groups", () => {
  test("should list template groups with pagination", async () => {
    // Create additional groups
    await prisma.templateGroup.createMany({
      data: [
        { workspaceId: testWorkspace.id, name: "Group 1", color: "#EF4444" },
        { workspaceId: testWorkspace.id, name: "Group 2", color: "#22C55E" },
        { workspaceId: testWorkspace.id, name: "Group 3", color: "#3B82F6" },
      ],
    });

    const request = createInternalRequest("/template-groups", "GET");
    const response = await LIST_GROUPS(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("template_group_list");
    expect(responseData.data.length).toBeGreaterThanOrEqual(4); // 3 + 1 from beforeEach
    expect(responseData.data[0]).toHaveProperty("id");
    expect(responseData.data[0]).toHaveProperty("name");
    expect(responseData.data[0]).toHaveProperty("color");
    expect(responseData.data[0]).toHaveProperty("icon");
    expect(responseData.data[0]).toHaveProperty("templateCount");
  });

  test("should include template count for each group", async () => {
    // Create templates in the test group
    const { template: template1, emailContent: content1 } =
      await createTestEmailTemplate(testWorkspace.id, testGroupId);
    const { template: template2, emailContent: content2 } =
      await createTestEmailTemplate(testWorkspace.id, testGroupId);

    const request = createInternalRequest("/template-groups", "GET");
    const response = await LIST_GROUPS(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);

    const group = responseData.data.find(
      (g: { id: string }) => g.id === testGroupId,
    );
    expect(group).toBeDefined();
    expect(group.templateCount).toBe(2);

    // Cleanup
    await prisma.emailTemplate.delete({ where: { id: template1.id } });
    await prisma.emailTemplate.delete({ where: { id: template2.id } });
    await prisma.emailContent.delete({ where: { id: content1.id } });
    await prisma.emailContent.delete({ where: { id: content2.id } });
  });

  test("should not list soft-deleted groups", async () => {
    // Soft delete the test group
    await prisma.templateGroup.update({
      where: { id: testGroupId },
      data: { deletedAt: new Date() },
    });

    const request = createInternalRequest("/template-groups", "GET");
    const response = await LIST_GROUPS(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);

    const deletedGroup = responseData.data.find(
      (g: { id: string }) => g.id === testGroupId,
    );
    expect(deletedGroup).toBeUndefined();
  });

  test("should not list groups from other workspaces", async () => {
    // Create a group in workspace2
    const workspace2Group = await createTestTemplateGroup(testWorkspace2.id, {
      name: "Workspace 2 Group",
    });

    const request = createInternalRequest("/template-groups", "GET");
    const response = await LIST_GROUPS(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);

    const otherWorkspaceGroup = responseData.data.find(
      (g: { id: string }) => g.id === workspace2Group.id,
    );
    expect(otherWorkspaceGroup).toBeUndefined();

    // Cleanup
    await prisma.templateGroup.delete({ where: { id: workspace2Group.id } });
  });

  test("should return 403 without read:templates permission", async () => {
    mockSession.permissions = ["manage:forms"];

    const request = createInternalRequest("/template-groups", "GET");
    const response = await LIST_GROUPS(request);
    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData.error.message).toContain("permission");
  });
});

describe("GET /api/internal/v1/template-groups/[groupId]", () => {
  test("should get a template group by ID", async () => {
    const request = createInternalRequest(
      `/template-groups/${testGroupId}`,
      "GET",
    );
    const response = await GET(request, {
      params: Promise.resolve({ groupId: testGroupId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("template_group");
    expect(responseData.id).toBe(testGroupId);
    expect(responseData.name).toBe("Test Group");
    expect(responseData.description).toBe("Test description");
    expect(responseData.color).toBe("#6366F1");
    expect(responseData.icon).toBe("folder");
    expect(responseData.templateCount).toBeDefined();
    expect(responseData.createdAt).toBeDefined();
    expect(responseData.updatedAt).toBeDefined();
  });

  test("should return 404 for non-existent group", async () => {
    const request = createInternalRequest(
      "/template-groups/non_existent_id",
      "GET",
    );
    const response = await GET(request, {
      params: Promise.resolve({ groupId: "non_existent_id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.message).toContain("not found");
  });

  test("should return 404 for soft-deleted group", async () => {
    await prisma.templateGroup.update({
      where: { id: testGroupId },
      data: { deletedAt: new Date() },
    });

    const request = createInternalRequest(
      `/template-groups/${testGroupId}`,
      "GET",
    );
    const response = await GET(request, {
      params: Promise.resolve({ groupId: testGroupId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.message).toContain("not found");
  });

  test("should return 404 for group from different workspace", async () => {
    const workspace2Group = await createTestTemplateGroup(testWorkspace2.id, {
      name: "Workspace 2 Group",
    });

    const request = createInternalRequest(
      `/template-groups/${workspace2Group.id}`,
      "GET",
    );
    const response = await GET(request, {
      params: Promise.resolve({ groupId: workspace2Group.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.message).toContain("not found");

    // Cleanup
    await prisma.templateGroup.delete({ where: { id: workspace2Group.id } });
  });
});

describe("PUT /api/internal/v1/template-groups/[groupId]", () => {
  test("should update a template group", async () => {
    const request = createInternalRequest(
      `/template-groups/${testGroupId}`,
      "PUT",
      {
        name: "Updated Group Name",
        description: "Updated description",
        color: "#EF4444",
        icon: "star",
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ groupId: testGroupId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("template_group");
    expect(responseData.id).toBe(testGroupId);

    const group = await prisma.templateGroup.findUnique({
      where: { id: testGroupId },
    });
    expect(group?.name).toBe("Updated Group Name");
    expect(group?.description).toBe("Updated description");
    expect(group?.color).toBe("#EF4444");
    expect(group?.icon).toBe("star");
  });

  test("should allow partial updates", async () => {
    const request = createInternalRequest(
      `/template-groups/${testGroupId}`,
      "PUT",
      {
        color: "#22C55E",
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ groupId: testGroupId }),
    });

    expect(response.status).toBe(200);

    const group = await prisma.templateGroup.findUnique({
      where: { id: testGroupId },
    });
    expect(group?.name).toBe("Test Group"); // unchanged
    expect(group?.color).toBe("#22C55E"); // changed
  });

  test("should allow setting description to null", async () => {
    const request = createInternalRequest(
      `/template-groups/${testGroupId}`,
      "PUT",
      {
        description: null,
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ groupId: testGroupId }),
    });

    expect(response.status).toBe(200);

    const group = await prisma.templateGroup.findUnique({
      where: { id: testGroupId },
    });
    expect(group?.description).toBeNull();
  });

  test("should return 409 for duplicate name", async () => {
    // Create another group
    const anotherGroup = await createTestTemplateGroup(testWorkspace.id, {
      name: "Another Group",
    });

    const request = createInternalRequest(
      `/template-groups/${testGroupId}`,
      "PUT",
      {
        name: "Another Group", // Try to rename to existing name
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ groupId: testGroupId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(409);
    expect(responseData.error.message).toContain("already exists");

    // Cleanup
    await prisma.templateGroup.delete({ where: { id: anotherGroup.id } });
  });

  test("should return 404 for non-existent group", async () => {
    const request = createInternalRequest(
      "/template-groups/non_existent_id",
      "PUT",
      {
        name: "Updated Name",
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ groupId: "non_existent_id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.message).toContain("not found");
  });

  test("should return 403 without manage:templates permission", async () => {
    mockSession.permissions = ["read:templates"];

    const request = createInternalRequest(
      `/template-groups/${testGroupId}`,
      "PUT",
      {
        name: "Updated Name",
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ groupId: testGroupId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData.error.message).toContain("permission");
  });
});

describe("DELETE /api/internal/v1/template-groups/[groupId]", () => {
  test("should soft delete a template group", async () => {
    const request = createInternalRequest(
      `/template-groups/${testGroupId}`,
      "DELETE",
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ groupId: testGroupId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("template_group");
    expect(responseData.id).toBe(testGroupId);

    const group = await prisma.templateGroup.findUnique({
      where: { id: testGroupId },
    });
    expect(group?.deletedAt).not.toBeNull();
  });

  test("should unlink templates when group is deleted", async () => {
    // Create a template in the group
    const { template, emailContent } = await createTestEmailTemplate(
      testWorkspace.id,
      testGroupId,
    );

    expect(template.templateGroupId).toBe(testGroupId);

    const request = createInternalRequest(
      `/template-groups/${testGroupId}`,
      "DELETE",
    );

    await DELETE(request, {
      params: Promise.resolve({ groupId: testGroupId }),
    });

    // Template should still exist but be ungrouped
    const updatedTemplate = await prisma.emailTemplate.findUnique({
      where: { id: template.id },
    });
    expect(updatedTemplate).not.toBeNull();
    expect(updatedTemplate?.templateGroupId).toBeNull();

    // Cleanup
    await prisma.emailTemplate.delete({ where: { id: template.id } });
    await prisma.emailContent.delete({ where: { id: emailContent.id } });
  });

  test("should return 404 for non-existent group", async () => {
    const request = createInternalRequest(
      "/template-groups/non_existent_id",
      "DELETE",
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ groupId: "non_existent_id" }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.message).toContain("not found");
  });

  test("should return 404 for already deleted group", async () => {
    await prisma.templateGroup.update({
      where: { id: testGroupId },
      data: { deletedAt: new Date() },
    });

    const request = createInternalRequest(
      `/template-groups/${testGroupId}`,
      "DELETE",
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ groupId: testGroupId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.message).toContain("not found");
  });

  test("should return 403 without manage:templates permission", async () => {
    mockSession.permissions = ["read:templates"];

    const request = createInternalRequest(
      `/template-groups/${testGroupId}`,
      "DELETE",
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ groupId: testGroupId }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData.error.message).toContain("permission");
  });
});

describe("Template Group Assignment", () => {
  test("should assign a template to a group", async () => {
    const { template, emailContent } = await createTestEmailTemplate(
      testWorkspace.id,
      null, // No group initially
    );

    const request = createInternalRequest(
      `/email-templates/${template.id}`,
      "PUT",
      {
        templateGroupId: testGroupId,
      },
    );

    const response = await UPDATE_TEMPLATE(request, {
      params: Promise.resolve({ templateId: template.id }),
    });

    expect(response.status).toBe(200);

    const updatedTemplate = await prisma.emailTemplate.findUnique({
      where: { id: template.id },
    });
    expect(updatedTemplate?.templateGroupId).toBe(testGroupId);

    // Cleanup
    await prisma.emailTemplate.delete({ where: { id: template.id } });
    await prisma.emailContent.delete({ where: { id: emailContent.id } });
  });

  test("should remove template from group by setting null", async () => {
    const { template, emailContent } = await createTestEmailTemplate(
      testWorkspace.id,
      testGroupId,
    );

    expect(template.templateGroupId).toBe(testGroupId);

    const request = createInternalRequest(
      `/email-templates/${template.id}`,
      "PUT",
      {
        templateGroupId: null,
      },
    );

    const response = await UPDATE_TEMPLATE(request, {
      params: Promise.resolve({ templateId: template.id }),
    });

    expect(response.status).toBe(200);

    const updatedTemplate = await prisma.emailTemplate.findUnique({
      where: { id: template.id },
    });
    expect(updatedTemplate?.templateGroupId).toBeNull();

    // Cleanup
    await prisma.emailTemplate.delete({ where: { id: template.id } });
    await prisma.emailContent.delete({ where: { id: emailContent.id } });
  });

  test("should return 404 for non-existent group when assigning", async () => {
    const { template, emailContent } = await createTestEmailTemplate(
      testWorkspace.id,
      null,
    );

    const request = createInternalRequest(
      `/email-templates/${template.id}`,
      "PUT",
      {
        templateGroupId: "non_existent_group_id",
      },
    );

    const response = await UPDATE_TEMPLATE(request, {
      params: Promise.resolve({ templateId: template.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.message).toContain("not found");

    // Cleanup
    await prisma.emailTemplate.delete({ where: { id: template.id } });
    await prisma.emailContent.delete({ where: { id: emailContent.id } });
  });

  test("should return 404 for group from different workspace", async () => {
    const workspace2Group = await createTestTemplateGroup(testWorkspace2.id, {
      name: "Workspace 2 Group",
    });

    const { template, emailContent } = await createTestEmailTemplate(
      testWorkspace.id,
      null,
    );

    const request = createInternalRequest(
      `/email-templates/${template.id}`,
      "PUT",
      {
        templateGroupId: workspace2Group.id,
      },
    );

    const response = await UPDATE_TEMPLATE(request, {
      params: Promise.resolve({ templateId: template.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.message).toContain("not found");

    // Cleanup
    await prisma.emailTemplate.delete({ where: { id: template.id } });
    await prisma.emailContent.delete({ where: { id: emailContent.id } });
    await prisma.templateGroup.delete({ where: { id: workspace2Group.id } });
  });

  test("templates can exist without a group (ungrouped)", async () => {
    const { template, emailContent } = await createTestEmailTemplate(
      testWorkspace.id,
      null, // No group
    );

    expect(template.templateGroupId).toBeNull();

    // Verify template works without a group
    const foundTemplate = await prisma.emailTemplate.findUnique({
      where: { id: template.id },
      include: { templateGroup: true },
    });

    expect(foundTemplate).not.toBeNull();
    expect(foundTemplate?.templateGroup).toBeNull();

    // Cleanup
    await prisma.emailTemplate.delete({ where: { id: template.id } });
    await prisma.emailContent.delete({ where: { id: emailContent.id } });
  });
});
