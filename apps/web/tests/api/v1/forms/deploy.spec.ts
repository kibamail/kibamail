/**
 * Integration tests for Form Deploy (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/forms/[formId]/deploy - Deploy a site bundle to a form
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { NextRequest } from "next/server";
import { POST as DEPLOY_FORM } from "@/app/(main)/api/v1/forms/[formId]/deploy/route";
import { POST as PUBLISH_FORM } from "@/app/(main)/api/v1/forms/[formId]/publish/route";
import { POST as CREATE_FORM } from "@/app/(main)/api/v1/forms/route";
import { ErrorCode } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestWorkspace,
  post,
  type TestWorkspace,
} from "@/tests/utils";
import {
  validFormFieldMapping,
  validFormContent,
  validFormHtml,
  multiFieldFormFieldMapping,
  multiFieldFormHtml,
} from "@/tests/utils/form-fixtures";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

/**
 * Helper to create a multipart deploy request with files.
 */
function deployRequest(
  formId: string,
  files: Array<{ name: string; content: string; type?: string }>,
  apiKey: string,
): NextRequest {
  const formData = new FormData();
  for (const file of files) {
    const blob = new Blob([file.content], {
      type: file.type ?? "text/html",
    });
    formData.append("files", blob, file.name);
  }

  return new NextRequest(
    `http://localhost:3000/api/v1/forms/${formId}/deploy`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    },
  );
}

/**
 * Helper to create a form via API and return its ID.
 */
async function createForm(
  name: string,
  fieldMapping = validFormFieldMapping,
): Promise<string> {
  const request = post(
    "/forms",
    { name, fieldMapping },
    fullAccessApiKey.key,
  );
  const response = await CREATE_FORM(request);
  const data = await response.json();
  return data.id;
}

describe("POST /api/v1/forms/[formId]/deploy - Validation", () => {
  test("should reject deploy with no files", async () => {
    const formId = await createForm("No Files Form");
    const request = deployRequest(formId, [], fullAccessApiKey.key);

    const response = await DEPLOY_FORM(request, {
      params: Promise.resolve({ formId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toContain("No files provided");
  });

  test("should reject deploy with no HTML file", async () => {
    const formId = await createForm("No HTML Form");
    const request = deployRequest(
      formId,
      [{ name: "styles.css", content: "body { color: red; }", type: "text/css" }],
      fullAccessApiKey.key,
    );

    const response = await DEPLOY_FORM(request, {
      params: Promise.resolve({ formId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toContain("exactly one .html file");
  });

  test("should reject deploy with multiple HTML files", async () => {
    const formId = await createForm("Multi HTML Form");
    const request = deployRequest(
      formId,
      [
        { name: "index.html", content: validFormHtml },
        { name: "other.html", content: "<html></html>" },
      ],
      fullAccessApiKey.key,
    );

    const response = await DEPLOY_FORM(request, {
      params: Promise.resolve({ formId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toContain("exactly one .html file");
  });

  test("should reject deploy with unsupported file extension", async () => {
    const formId = await createForm("Bad Extension Form");
    const request = deployRequest(
      formId,
      [
        { name: "index.html", content: validFormHtml },
        { name: "malware.exe", content: "bad", type: "application/octet-stream" },
      ],
      fullAccessApiKey.key,
    );

    const response = await DEPLOY_FORM(request, {
      params: Promise.resolve({ formId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toContain("unsupported extension");
  });

  test("should reject HTML with no form element", async () => {
    const formId = await createForm("No Form Element");
    const request = deployRequest(
      formId,
      [{ name: "index.html", content: "<html><body><p>No form here</p></body></html>" }],
      fullAccessApiKey.key,
    );

    const response = await DEPLOY_FORM(request, {
      params: Promise.resolve({ formId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toContain("<form>");
  });

  test("should reject HTML with multiple form elements", async () => {
    const formId = await createForm("Multi Form Element");
    const request = deployRequest(
      formId,
      [{
        name: "index.html",
        content: `<html><body>
          <form><input name="email" /></form>
          <form><input name="other" /></form>
        </body></html>`,
      }],
      fullAccessApiKey.key,
    );

    const response = await DEPLOY_FORM(request, {
      params: Promise.resolve({ formId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toContain("exactly one <form>");
  });

  test("should reject HTML with missing fieldMapping inputs", async () => {
    const formId = await createForm("Missing Inputs", multiFieldFormFieldMapping);
    // HTML only has email, but fieldMapping expects email + name + phone + rating
    const request = deployRequest(
      formId,
      [{ name: "index.html", content: validFormHtml }],
      fullAccessApiKey.key,
    );

    const response = await DEPLOY_FORM(request, {
      params: Promise.resolve({ formId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe(ErrorCode.FORM_VALIDATION_ERROR);
  });

  test("should reject deploy when form has no fieldMapping", async () => {
    // Create form directly via prisma with no fieldMapping
    const form = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "No Mapping Form",
        type: "SIGN_UP",
        display: "INLINE_EMBED",
        status: "DRAFT",
        version: 1,
      },
    });

    const request = deployRequest(
      form.id,
      [{ name: "index.html", content: validFormHtml }],
      fullAccessApiKey.key,
    );

    const response = await DEPLOY_FORM(request, {
      params: Promise.resolve({ formId: form.id }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toContain("fieldMapping");
  });
});

describe("POST /api/v1/forms/[formId]/deploy - Success", () => {
  test("should deploy HTML-only bundle", async () => {
    const formId = await createForm("HTML Only Deploy");
    const request = deployRequest(
      formId,
      [{ name: "index.html", content: validFormHtml }],
      fullAccessApiKey.key,
    );

    const response = await DEPLOY_FORM(request, {
      params: Promise.resolve({ formId }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.deployId).toBeDefined();

    // Verify form record was updated
    const form = await prisma.form.findUnique({ where: { id: formId } });
    const content = form?.fields as { html: string; deployId: string; files: unknown[] } | null;
    expect(content?.html).toContain("<form");
    expect(content?.deployId).toBe(data.deployId);
  });

  test("should set form action and method on the form element", async () => {
    const formId = await createForm("Action Injection");
    const request = deployRequest(
      formId,
      [{ name: "index.html", content: validFormHtml }],
      fullAccessApiKey.key,
    );

    const response = await DEPLOY_FORM(request, {
      params: Promise.resolve({ formId }),
    });

    expect(response.status).toBe(200);

    const form = await prisma.form.findUnique({ where: { id: formId } });
    const content = form?.fields as { html: string } | null;
    expect(content?.html).toContain(`action="/api/internal/v1/forms/${formId}/submissions"`);
    expect(content?.html).toContain('method="post"');
  });
});

describe("POST /api/v1/forms/[formId]/deploy - Published Form Restriction", () => {
  test("should reject deploy to a published form", async () => {
    const formId = await createForm("Published Form");

    // Deploy and publish the form
    const deployReq = deployRequest(
      formId,
      [{ name: "index.html", content: validFormHtml }],
      fullAccessApiKey.key,
    );
    await DEPLOY_FORM(deployReq, { params: Promise.resolve({ formId }) });

    const publishReq = post(`/forms/${formId}/publish`, {}, fullAccessApiKey.key);
    const publishResponse = await PUBLISH_FORM(publishReq, {
      params: Promise.resolve({ formId }),
    });
    expect(publishResponse.status).toBe(200);

    // Try to deploy again — should be rejected
    const redeployReq = deployRequest(
      formId,
      [{ name: "index.html", content: validFormHtml }],
      fullAccessApiKey.key,
    );
    const response = await DEPLOY_FORM(redeployReq, {
      params: Promise.resolve({ formId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe(ErrorCode.FORM_NOT_EDITABLE);
    expect(data.error.message).toContain("DRAFT");
  });

  test("should reject deploy to an archived form", async () => {
    // Create a form via prisma in ARCHIVED status
    const form = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Archived Form",
        type: "SIGN_UP",
        display: "INLINE_EMBED",
        status: "ARCHIVED",
        version: 1,
        fieldMapping: validFormFieldMapping as never,
      },
    });

    const request = deployRequest(
      form.id,
      [{ name: "index.html", content: validFormHtml }],
      fullAccessApiKey.key,
    );

    const response = await DEPLOY_FORM(request, {
      params: Promise.resolve({ formId: form.id }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe(ErrorCode.FORM_NOT_EDITABLE);
  });

  test("should allow deploy to a new DRAFT version of a published form", async () => {
    const formId = await createForm("Version Deploy Test");

    // Deploy and publish v1
    const deployV1 = deployRequest(
      formId,
      [{ name: "index.html", content: validFormHtml }],
      fullAccessApiKey.key,
    );
    await DEPLOY_FORM(deployV1, { params: Promise.resolve({ formId }) });

    const publishReq = post(`/forms/${formId}/publish`, {}, fullAccessApiKey.key);
    await PUBLISH_FORM(publishReq, { params: Promise.resolve({ formId }) });

    // Create a new version
    const { POST: CREATE_VERSION } = await import(
      "@/app/(main)/api/v1/forms/[formId]/versions/route"
    );
    const versionReq = post(
      `/forms/${formId}/versions`,
      {},
      fullAccessApiKey.key,
    );
    const versionResponse = await CREATE_VERSION(versionReq, {
      params: Promise.resolve({ formId }),
    });
    const versionData = await versionResponse.json();
    const versionId = versionData.id;

    // Deploy to the new DRAFT version — should succeed
    const deployV2 = deployRequest(
      versionId,
      [{
        name: "index.html",
        content: `<form>
          <input type="email" name="email" required />
          <input type="text" name="extra" />
          <button type="submit">Submit v2</button>
        </form>`,
      }],
      fullAccessApiKey.key,
    );

    // Update fieldMapping for the new field
    await prisma.form.update({
      where: { id: versionId },
      data: {
        fieldMapping: {
          ...validFormFieldMapping,
          extra: {
            contactPropertyId: "extra",
            contactPropertyType: "custom",
            fieldType: "string",
          },
        } as never,
      },
    });

    const response = await DEPLOY_FORM(deployV2, {
      params: Promise.resolve({ formId: versionId }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.deployId).toBeDefined();
  });
});
