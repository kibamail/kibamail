import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  GET as LIST,
  POST,
} from "@/app/(main)/api/v1/transactional-email-templates/route";
import {
  DELETE,
  GET,
  PUT,
} from "@/app/(main)/api/v1/transactional-email-templates/[templateId]/route";
import { POST as PUBLISH } from "@/app/(main)/api/v1/transactional-email-templates/[templateId]/publish/route";
import { GET as PREVIEW } from "@/app/(main)/api/v1/transactional-email-templates/[templateId]/preview/route";
import { prisma } from "@/lib/db";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestWorkspace,
  del,
  get,
  post,
  put,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

const TRANSACTIONAL_HTML = `<html><body><h1>Receipt</h1><p>Hello {{firstName}}</p><footer>{{business_address}}</footer></body></html>`;

function basePath(suffix = "") {
  return `/transactional-email-templates${suffix}`;
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("DELETE /api/v1/transactional-email-templates/[id]", () => {
  test("rejects deletion of PUBLISHED template", async () => {
    const createReq = post(
      basePath(),
      {
        name: "Published Delete",
        uniqueSlug: "published-delete-test",
        subject: "Test",
        html: TRANSACTIONAL_HTML,
      },
      fullAccessApiKey.key,
    );
    const id = ((await (await POST(createReq)).json()) as { id: string }).id;

    const request = del(basePath(`/${id}`), fullAccessApiKey.key);
    const response = await DELETE(request, {
      params: Promise.resolve({ templateId: id }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.message).toMatch(/DRAFT/i);
  });

  test("deletes the linked emailContent record when deleting a DRAFT", async () => {
    const createReq = post(
      basePath(),
      {
        name: "Draft Content Cleanup",
        uniqueSlug: "draft-content-cleanup",
        subject: "Content",
        html: TRANSACTIONAL_HTML,
        publish: false,
      },
      fullAccessApiKey.key,
    );
    const response = await POST(createReq);
    const data = (await response.json()) as { id: string };
    const templateId = data.id;

    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
    });
    const emailContentId = template?.emailContentId;
    expect(emailContentId).toBeTruthy();

    const request = del(basePath(`/${templateId}`), fullAccessApiKey.key);
    await DELETE(request, {
      params: Promise.resolve({ templateId }),
    });

    const content = emailContentId
      ? await prisma.emailContent.findUnique({ where: { id: emailContentId } })
      : null;
    expect(content).toBeNull();
  });
});

describe("PUT /api/v1/transactional-email-templates/[id] - compliance re-validation", () => {
  test("rejects updating DRAFT HTML to non-compliant content", async () => {
    const createReq = post(
      basePath(),
      {
        name: "Draft Compliance Update",
        uniqueSlug: "draft-compliance-update",
        subject: "Test",
        html: TRANSACTIONAL_HTML,
        publish: false,
      },
      fullAccessApiKey.key,
    );
    const id = ((await (await POST(createReq)).json()) as { id: string }).id;

    const request = put(
      basePath(`/${id}`),
      { html: "<p>No compliance vars at all</p>" },
      fullAccessApiKey.key,
    );
    const response = await PUT(request, {
      params: Promise.resolve({ templateId: id }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toMatch(/business_address/);
  });

  test("rejects updating DRAFT with uniqueSlug when template is a version", async () => {
    const createReq = post(
      basePath(),
      {
        name: "Version Slug",
        uniqueSlug: "version-slug-test",
        subject: "Test",
        html: TRANSACTIONAL_HTML,
      },
      fullAccessApiKey.key,
    );
    const parentId = ((await (await POST(createReq)).json()) as { id: string })
      .id;

    const versionReq = post(
      basePath(`/${parentId}/versions`),
      {},
      fullAccessApiKey.key,
    );
    const CREATE_VERSION = (await import("@/app/(main)/api/v1/transactional-email-templates/[templateId]/versions/route")).POST;
    const vRes = await CREATE_VERSION(versionReq, {
      params: Promise.resolve({ templateId: parentId }),
    });
    const vData = (await vRes.json()) as { id: string };
    const versionId = vData.id;

    const updateReq = put(
      basePath(`/${versionId}`),
      { uniqueSlug: "new-slug" },
      fullAccessApiKey.key,
    );
    const response = await PUT(updateReq, {
      params: Promise.resolve({ templateId: versionId }),
    });

    expect(response.status).toBe(400);
  });
});

describe("POST /api/v1/transactional-email-templates/[id]/publish - compliance re-check", () => {
  test("rejects publish when persisted HTML is non-compliant", async () => {
    const createReq = post(
      basePath(),
      {
        name: "Publish Compliance Recheck",
        uniqueSlug: "publish-compliance-recheck",
        subject: "Test",
        html: TRANSACTIONAL_HTML,
        publish: false,
      },
      fullAccessApiKey.key,
    );
    const id = ((await (await POST(createReq)).json()) as { id: string }).id;

    const template = await prisma.emailTemplate.findUnique({
      where: { id },
      include: { emailContent: true },
    });
    if (template?.emailContentId) {
      await prisma.emailContent.update({
        where: { id: template.emailContentId },
        data: { contentHtml: "<p>No compliance vars</p>" },
      });
    }

    const publishReq = post(basePath(`/${id}/publish`), {}, fullAccessApiKey.key);
    const response = await PUBLISH(publishReq, {
      params: Promise.resolve({ templateId: id }),
    });

    expect(response.status).toBe(400);
  });
});

describe("GET /api/v1/transactional-email-templates/[id]/preview - no content", () => {
  test("returns hasContent=false for template with no emailContent", async () => {
    const emailContent = await prisma.emailContent.create({
      data: {
        subject: "Empty Preview",
        contentHtml: null,
        contentText: null,
      },
    });

    const template = await prisma.emailTemplate.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "No Content Preview",
        uniqueSlug: "no-content-preview-test",
        emailContentId: emailContent.id,
        status: "PUBLISHED",
        version: 1,
        publishedAt: new Date(),
        publishedVersionId: "placeholder",
      },
    });
    await prisma.emailTemplate.update({
      where: { id: template.id },
      data: { publishedVersionId: template.id },
    });

    const request = get(basePath(`/${template.id}/preview`), fullAccessApiKey.key);
    const response = await PREVIEW(request, {
      params: Promise.resolve({ templateId: template.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasContent).toBe(false);
    expect(data.html).toBeNull();
  });
});

describe("GET /api/v1/transactional-email-templates/[id] - workspace isolation", () => {
  test("returns 404 for template belonging to a different workspace", async () => {
    const otherWorkspace = createTestWorkspace();

    const createReq = post(
      basePath(),
      {
        name: "Other Workspace Template",
        uniqueSlug: "other-ws-template",
        subject: "Other",
        html: TRANSACTIONAL_HTML,
      },
      fullAccessApiKey.key,
    );
    const id = ((await (await POST(createReq)).json()) as { id: string }).id;

    const otherApiKey = await (
      await import("@/tests/utils")
    ).createFullAccessApiKey(otherWorkspace.id);

    const request = get(basePath(`/${id}`), otherApiKey.key);
    const response = await GET(request, {
      params: Promise.resolve({ templateId: id }),
    });

    expect(response.status).toBe(404);

    await cleanupWorkspace(otherWorkspace.id);
  });
});
