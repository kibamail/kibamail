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
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestWorkspace,
  get,
  post,
  put,
  del,
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

describe("Unique slug validation", () => {
  test("rejects uniqueSlug starting with a number", async () => {
    const request = post(
      basePath(),
      {
        name: "Bad Slug",
        uniqueSlug: "123-bad-slug",
        subject: "Test",
        html: TRANSACTIONAL_HTML,
      },
      fullAccessApiKey.key,
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toMatch(/start with a letter/i);
  });

  test("rejects uniqueSlug with spaces", async () => {
    const request = post(
      basePath(),
      {
        name: "Space Slug",
        uniqueSlug: "has spaces",
        subject: "Test",
        html: TRANSACTIONAL_HTML,
      },
      fullAccessApiKey.key,
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  test("rejects uniqueSlug with special characters", async () => {
    const request = post(
      basePath(),
      {
        name: "Special Slug",
        uniqueSlug: "slug@#!",
        subject: "Test",
        html: TRANSACTIONAL_HTML,
      },
      fullAccessApiKey.key,
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  test("accepts uniqueSlug with underscores and hyphens", async () => {
    const request = post(
      basePath(),
      {
        name: "Good Slug",
        uniqueSlug: "my_template-v2",
        subject: "Test",
        html: TRANSACTIONAL_HTML,
      },
      fullAccessApiKey.key,
    );
    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  test("rejects missing uniqueSlug", async () => {
    const request = post(
      basePath(),
      {
        name: "No Slug",
        subject: "Test",
        html: TRANSACTIONAL_HTML,
      },
      fullAccessApiKey.key,
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  test("rejects missing subject", async () => {
    const request = post(
      basePath(),
      {
        name: "No Subject",
        uniqueSlug: "no-subject-test",
        html: TRANSACTIONAL_HTML,
      },
      fullAccessApiKey.key,
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  test("rejects missing html", async () => {
    const request = post(
      basePath(),
      {
        name: "No HTML",
        uniqueSlug: "no-html-test",
        subject: "Test",
      },
      fullAccessApiKey.key,
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  test("rejects missing name", async () => {
    const request = post(
      basePath(),
      {
        uniqueSlug: "no-name-test",
        subject: "Test",
        html: TRANSACTIONAL_HTML,
      },
      fullAccessApiKey.key,
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

describe("DELETE published template", () => {
  test("rejects deletion of PUBLISHED template", async () => {
    const createReq = post(
      basePath(),
      {
        name: "Published Delete Test",
        uniqueSlug: "published-delete-test",
        subject: "P",
        html: TRANSACTIONAL_HTML,
        publish: true,
      },
      fullAccessApiKey.key,
    );
    const id = (await (await POST(createReq)).json()).id as string;

    const request = del(basePath(`/${id}`), fullAccessApiKey.key);
    const response = await DELETE(request, {
      params: Promise.resolve({ templateId: id }),
    });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toMatch(/DRAFT/i);
  });
});

describe("Update compliance validation", () => {
  test("rejects update with HTML missing business_address", async () => {
    const createReq = post(
      basePath(),
      {
        name: "Update Compliance Test",
        uniqueSlug: "update-compliance-test",
        subject: "Draft",
        html: TRANSACTIONAL_HTML,
        publish: false,
      },
      fullAccessApiKey.key,
    );
    const id = (await (await POST(createReq)).json()).id as string;

    const updateReq = put(
      basePath(`/${id}`),
      {
        html: "<p>No compliance variables here</p>",
      },
      fullAccessApiKey.key,
    );
    const response = await PUT(updateReq, {
      params: Promise.resolve({ templateId: id }),
    });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toMatch(/business_address/);
  });
});

describe("Preview variable substitution", () => {
  test("preserves unknown variables as-is in preview", async () => {
    const htmlWithUnknown = `<html><body><p>Hello {{firstName}}, order #{{orderNumber}}</p><footer>{{business_address}}</footer></body></html>`;
    const createReq = post(
      basePath(),
      {
        name: "Preview Unknown Vars",
        uniqueSlug: "preview-unknown-vars",
        subject: "P",
        html: htmlWithUnknown,
      },
      fullAccessApiKey.key,
    );
    const id = (await (await POST(createReq)).json()).id as string;

    const request = get(basePath(`/${id}/preview`), fullAccessApiKey.key);
    const response = await PREVIEW(request, {
      params: Promise.resolve({ templateId: id }),
    });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.hasContent).toBe(true);
    expect(data.html).toContain("John");
    expect(data.html).toContain("{{orderNumber}}");
  });

  test("substitutes known sample variables in preview", async () => {
    const htmlWithKnown = `<html><body><p>{{firstName}} {{lastName}}</p><footer>{{business_address}}</footer></body></html>`;
    const createReq = post(
      basePath(),
      {
        name: "Preview Known Vars",
        uniqueSlug: "preview-known-vars",
        subject: "P",
        html: htmlWithKnown,
      },
      fullAccessApiKey.key,
    );
    const id = (await (await POST(createReq)).json()).id as string;

    const request = get(basePath(`/${id}/preview`), fullAccessApiKey.key);
    const response = await PREVIEW(request, {
      params: Promise.resolve({ templateId: id }),
    });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.html).toContain("John");
    expect(data.html).toContain("Doe");
  });
});

describe("Read scope access", () => {
  test("allows read:templates scope for GET endpoints", async () => {
    const createReq = post(
      basePath(),
      {
        name: "Read Scope Test",
        uniqueSlug: "read-scope-test",
        subject: "P",
        html: TRANSACTIONAL_HTML,
        publish: false,
      },
      fullAccessApiKey.key,
    );
    const id = (await (await POST(createReq)).json()).id as string;

    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:templates"],
    });

    const getRequest = get(basePath(`/${id}`), readOnlyKey.key);
    const getResponse = await GET(getRequest, {
      params: Promise.resolve({ templateId: id }),
    });
    expect(getResponse.status).toBe(200);

    const listRequest = get(basePath(), readOnlyKey.key);
    const listResponse = await LIST(listRequest);
    expect(listResponse.status).toBe(200);

    const previewRequest = get(basePath(`/${id}/preview`), readOnlyKey.key);
    const previewResponse = await PREVIEW(previewRequest, {
      params: Promise.resolve({ templateId: id }),
    });
    expect(previewResponse.status).toBe(200);
  });

  test("rejects read:templates scope for DELETE", async () => {
    const createReq = post(
      basePath(),
      {
        name: "Delete Scope Test",
        uniqueSlug: "delete-scope-test",
        subject: "P",
        html: TRANSACTIONAL_HTML,
        publish: false,
      },
      fullAccessApiKey.key,
    );
    const id = (await (await POST(createReq)).json()).id as string;

    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:templates"],
    });

    const deleteRequest = del(basePath(`/${id}`), readOnlyKey.key);
    const response = await DELETE(deleteRequest, {
      params: Promise.resolve({ templateId: id }),
    });
    expect([401, 403]).toContain(response.status);
  });
});

describe("Sender identity validation", () => {
  test("rejects non-existent senderIdentityId", async () => {
    const request = post(
      basePath(),
      {
        name: "Bad Sender",
        uniqueSlug: "bad-sender-test",
        subject: "Test",
        html: TRANSACTIONAL_HTML,
        senderIdentityId: "nonexistent-id-12345",
      },
      fullAccessApiKey.key,
    );
    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  test("rejects non-existent replyToIdentityId", async () => {
    const request = post(
      basePath(),
      {
        name: "Bad Reply-To",
        uniqueSlug: "bad-replyto-test",
        subject: "Test",
        html: TRANSACTIONAL_HTML,
        replyToIdentityId: "nonexistent-id-67890",
      },
      fullAccessApiKey.key,
    );
    const response = await POST(request);
    expect(response.status).toBe(404);
  });
});

describe("Version slug restriction", () => {
  test("rejects uniqueSlug update on a version (child template)", async () => {
    const createReq = post(
      basePath(),
      {
        name: "Version Slug Test",
        uniqueSlug: "version-slug-test",
        subject: "V1",
        html: TRANSACTIONAL_HTML,
      },
      fullAccessApiKey.key,
    );
    const parentId = (await (await POST(createReq)).json()).id as string;

    const createVersionReq = post(
      basePath(`/${parentId}/versions`),
      {},
      fullAccessApiKey.key,
    );
    const versionResponse = await createVersionReq;
    const versionData = await versionResponse.json();
    const versionId = versionData.id as string;

    const updateReq = put(
      basePath(`/${versionId}`),
      { uniqueSlug: "new-slug" },
      fullAccessApiKey.key,
    );
    const response = await PUT(updateReq, {
      params: Promise.resolve({ templateId: versionId }),
    });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toMatch(/slug/i);
  });
});
