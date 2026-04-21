/**
 * Integration tests for Transactional Email Templates (External API)
 *
 * Covers:
 * - POST   /api/v1/transactional-email-templates
 * - GET    /api/v1/transactional-email-templates
 * - GET    /api/v1/transactional-email-templates/[templateId]
 * - PUT    /api/v1/transactional-email-templates/[templateId]
 * - DELETE /api/v1/transactional-email-templates/[templateId]
 * - POST   /api/v1/transactional-email-templates/[templateId]/publish
 * - GET    /api/v1/transactional-email-templates/[templateId]/preview
 * - GET    /api/v1/transactional-email-templates/[templateId]/versions
 * - POST   /api/v1/transactional-email-templates/[templateId]/versions
 */

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
  GET as LIST_VERSIONS,
  POST as CREATE_VERSION,
} from "@/app/(main)/api/v1/transactional-email-templates/[templateId]/versions/route";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestWorkspace,
  del,
  get,
  post,
  put,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

// Transactional templates only require {{business_address}} — no unsubscribe.
const TRANSACTIONAL_HTML = `<html><body><h1>Receipt</h1><p>Hello {{firstName}}</p><footer>{{business_address}}</footer></body></html>`;
const UPDATED_HTML = `<html><body><h1>Updated Receipt</h1><footer>{{business_address}}</footer></body></html>`;

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

describe("POST /api/v1/transactional-email-templates", () => {
  test("creates and publishes a template by default", async () => {
    const request = post(
      basePath(),
      {
        name: "Receipt v1",
        uniqueSlug: "receipt-v1",
        subject: "Your receipt",
        html: TRANSACTIONAL_HTML,
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.object).toBe("transactional_email_template");
    expect(data.id).toBeDefined();
    expect(data.uniqueSlug).toBe("receipt-v1");
    expect(data.status).toBe("PUBLISHED");
  });

  test("creates a DRAFT when publish=false", async () => {
    const request = post(
      basePath(),
      {
        name: "Draft Template",
        uniqueSlug: "draft-tpl",
        subject: "Draft",
        html: TRANSACTIONAL_HTML,
        publish: false,
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.status).toBe("DRAFT");
  });

  test("accepts HTML with only {{business_address}} (transactional compliance)", async () => {
    const request = post(
      basePath(),
      {
        name: "Minimal Compliance",
        uniqueSlug: "minimal-compliance",
        subject: "Ok",
        html: `<p>Hi</p><p>{{business_address}}</p>`,
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  test("rejects HTML missing {{business_address}}", async () => {
    const request = post(
      basePath(),
      {
        name: "No address",
        uniqueSlug: "no-address",
        subject: "Nope",
        html: `<p>Hello</p>`,
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.message).toMatch(/business_address/);
  });

  test("rejects duplicate uniqueSlug", async () => {
    const first = post(
      basePath(),
      {
        name: "Slug collide",
        uniqueSlug: "slug-collide",
        subject: "First",
        html: TRANSACTIONAL_HTML,
      },
      fullAccessApiKey.key,
    );
    await POST(first);

    const second = post(
      basePath(),
      {
        name: "Slug collide 2",
        uniqueSlug: "slug-collide",
        subject: "Second",
        html: TRANSACTIONAL_HTML,
      },
      fullAccessApiKey.key,
    );
    const response = await POST(second);
    expect(response.status).toBe(409);
  });

  test("requires manage:templates scope", async () => {
    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:templates"],
    });

    const request = post(
      basePath(),
      {
        name: "Scope test",
        uniqueSlug: "scope-test",
        subject: "Scope",
        html: TRANSACTIONAL_HTML,
      },
      readOnlyKey.key,
    );

    const response = await POST(request);
    expect([401, 403]).toContain(response.status);
  });
});

describe("GET /api/v1/transactional-email-templates", () => {
  test("lists templates with pagination shape", async () => {
    const request = get(basePath(), fullAccessApiKey.key);
    const response = await LIST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.object).toBe("transactional_email_template_list");
    expect(Array.isArray(data.data)).toBe(true);
  });
});

describe("GET/PUT/DELETE /api/v1/transactional-email-templates/[id]", () => {
  async function createDraft(slug: string) {
    const request = post(
      basePath(),
      {
        name: `Draft ${slug}`,
        uniqueSlug: slug,
        subject: "Draft",
        html: TRANSACTIONAL_HTML,
        publish: false,
      },
      fullAccessApiKey.key,
    );
    const res = await POST(request);
    return (await res.json()).id as string;
  }

  test("gets a template", async () => {
    const id = await createDraft("draft-get");
    const request = get(basePath(`/${id}`), fullAccessApiKey.key);
    const response = await GET(request, {
      params: Promise.resolve({ templateId: id }),
    });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.id).toBe(id);
    expect(data.html).toContain("Receipt");
    expect(data.variables).toContain("firstName");
  });

  test("updates a DRAFT template", async () => {
    const id = await createDraft("draft-update");
    const request = put(
      basePath(`/${id}`),
      { html: UPDATED_HTML, subject: "Updated" },
      fullAccessApiKey.key,
    );
    const response = await PUT(request, {
      params: Promise.resolve({ templateId: id }),
    });
    expect(response.status).toBe(200);

    const getRes = await GET(get(basePath(`/${id}`), fullAccessApiKey.key), {
      params: Promise.resolve({ templateId: id }),
    });
    const data = await getRes.json();
    expect(data.subject).toBe("Updated");
    expect(data.html).toContain("Updated Receipt");
  });

  test("rejects update of PUBLISHED template", async () => {
    const createReq = post(
      basePath(),
      {
        name: "Published",
        uniqueSlug: "immutable-pub",
        subject: "P",
        html: TRANSACTIONAL_HTML,
      },
      fullAccessApiKey.key,
    );
    const id = (await (await POST(createReq)).json()).id as string;

    const request = put(
      basePath(`/${id}`),
      { subject: "cannot" },
      fullAccessApiKey.key,
    );
    const response = await PUT(request, {
      params: Promise.resolve({ templateId: id }),
    });
    expect(response.status).toBe(400);
  });

  test("deletes a DRAFT template", async () => {
    const id = await createDraft("draft-delete");
    const request = del(basePath(`/${id}`), fullAccessApiKey.key);
    const response = await DELETE(request, {
      params: Promise.resolve({ templateId: id }),
    });
    expect(response.status).toBe(200);
  });
});

describe("POST /api/v1/transactional-email-templates/[id]/publish", () => {
  test("publishes a DRAFT template", async () => {
    const createReq = post(
      basePath(),
      {
        name: "To publish",
        uniqueSlug: "to-publish",
        subject: "Hi",
        html: TRANSACTIONAL_HTML,
        publish: false,
      },
      fullAccessApiKey.key,
    );
    const id = (await (await POST(createReq)).json()).id as string;

    const publishReq = post(basePath(`/${id}/publish`), {}, fullAccessApiKey.key);
    const response = await PUBLISH(publishReq, {
      params: Promise.resolve({ templateId: id }),
    });
    expect(response.status).toBe(200);

    const getRes = await GET(get(basePath(`/${id}`), fullAccessApiKey.key), {
      params: Promise.resolve({ templateId: id }),
    });
    const data = await getRes.json();
    expect(data.status).toBe("PUBLISHED");
    expect(data.publishedAt).toBeTruthy();
  });
});

describe("GET /api/v1/transactional-email-templates/[id]/preview", () => {
  test("returns substituted HTML", async () => {
    const createReq = post(
      basePath(),
      {
        name: "Preview me",
        uniqueSlug: "preview-me",
        subject: "P",
        html: TRANSACTIONAL_HTML,
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
    expect(data.html).toBeTruthy();
  });
});

describe("Versions", () => {
  test("creates + lists versions", async () => {
    const createReq = post(
      basePath(),
      {
        name: "Versioned",
        uniqueSlug: "versioned",
        subject: "V1",
        html: TRANSACTIONAL_HTML,
      },
      fullAccessApiKey.key,
    );
    const id = (await (await POST(createReq)).json()).id as string;

    const createVersionReq = post(
      basePath(`/${id}/versions`),
      {},
      fullAccessApiKey.key,
    );
    const vResponse = await CREATE_VERSION(createVersionReq, {
      params: Promise.resolve({ templateId: id }),
    });
    expect(vResponse.status).toBe(201);

    const listReq = get(basePath(`/${id}/versions`), fullAccessApiKey.key);
    const listResponse = await LIST_VERSIONS(listReq, {
      params: Promise.resolve({ templateId: id }),
    });
    const listData = await listResponse.json();
    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listData.data)).toBe(true);
    expect(listData.data.length).toBeGreaterThanOrEqual(2);
  });
});
