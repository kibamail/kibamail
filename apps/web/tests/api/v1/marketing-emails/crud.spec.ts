/**
 * Integration tests for Marketing Email CRUD (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST   /api/v1/marketing-emails - Create
 * - GET    /api/v1/marketing-emails - List
 * - GET    /api/v1/marketing-emails/[emailId] - Get
 * - PUT    /api/v1/marketing-emails/[emailId] - Update
 * - DELETE /api/v1/marketing-emails/[emailId] - Delete
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST, GET as LIST } from "@/app/(main)/api/v1/marketing-emails/route";
import {
  GET,
  PUT,
  DELETE,
} from "@/app/(main)/api/v1/marketing-emails/[emailId]/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestWorkspace,
  post,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("POST /api/v1/marketing-emails - Create", () => {
  test("should create a marketing email with HTML", async () => {
    const request = post(
      "/marketing-emails",
      {
        name: "Confirm Subscription",
        subject: "Please confirm {{firstName}}",
        html: "<html><body><a href=\"{{confirmation_url}}\">Confirm</a></body></html>",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.object).toBe("marketing_email");
    expect(data.id).toBeDefined();
  });

  test("should create a marketing email without HTML", async () => {
    const request = post(
      "/marketing-emails",
      { name: "Draft Email" },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBeDefined();
  });

  test("should require name", async () => {
    const request = post(
      "/marketing-emails",
      { subject: "No name" },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    expect(response.status).toBe(422);
  });

  test("should require write:emails scope", async () => {
    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:emails"],
    });

    const request = post(
      "/marketing-emails",
      { name: "Test" },
      readOnlyKey.key,
    );

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  test("should default type to AUTOMATION", async () => {
    const request = post(
      "/marketing-emails",
      { name: "Default Type" },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const data = await response.json();

    const email = await prisma.email.findUnique({
      where: { id: data.id },
    });

    expect(email?.type).toBe("AUTOMATION");
  });
});

describe("GET /api/v1/marketing-emails - List", () => {
  test("should list marketing emails", async () => {
    const request = new Request(
      "http://localhost/api/v1/marketing-emails",
      {
        headers: { Authorization: `Bearer ${fullAccessApiKey.key}` },
      },
    );

    const response = await LIST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.object).toBe("marketing_email_list");
    expect(Array.isArray(data.data)).toBe(true);
  });

  test("should not include transactional emails in list", async () => {
    // Create a transactional email directly
    const txEmail = await prisma.email.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Transactional Test",
        type: "TRANSACTIONAL",
      },
    });

    const request = new Request(
      "http://localhost/api/v1/marketing-emails",
      {
        headers: { Authorization: `Bearer ${fullAccessApiKey.key}` },
      },
    );

    const response = await LIST(request as any);
    const data = await response.json();

    const ids = data.data.map((e: { id: string }) => e.id);
    expect(ids).not.toContain(txEmail.id);
  });
});

describe("GET /api/v1/marketing-emails/[emailId] - Get", () => {
  test("should get email with variables extracted", async () => {
    const email = await prisma.email.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Get Test",
        subject: "Hello {{firstName}}",
        htmlContent:
          '<html><body>Hi {{firstName}}, <a href="{{confirmation_url}}">confirm</a></body></html>',
        type: "AUTOMATION",
      },
    });

    const request = new Request(
      `http://localhost/api/v1/marketing-emails/${email.id}`,
      {
        headers: { Authorization: `Bearer ${fullAccessApiKey.key}` },
      },
    );

    const response = await GET(request as any, {
      params: Promise.resolve({ emailId: email.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.object).toBe("marketing_email");
    expect(data.name).toBe("Get Test");
    expect(data.html).toContain("{{firstName}}");
    expect(data.variables).toContain("firstName");
    expect(data.variables).toContain("confirmation_url");
  });

  test("should return 404 for non-existent email", async () => {
    const request = new Request(
      "http://localhost/api/v1/marketing-emails/nonexistent",
      {
        headers: { Authorization: `Bearer ${fullAccessApiKey.key}` },
      },
    );

    const response = await GET(request as any, {
      params: Promise.resolve({ emailId: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });
});

describe("PUT /api/v1/marketing-emails/[emailId] - Update", () => {
  test("should update email name and HTML", async () => {
    const email = await prisma.email.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Original",
        type: "AUTOMATION",
      },
    });

    const request = post(
      `/marketing-emails/${email.id}`,
      {
        name: "Updated",
        html: "<html><body>New content</body></html>",
      },
      fullAccessApiKey.key,
    );

    // Override method to PUT
    const putRequest = new Request(request.url, {
      method: "PUT",
      headers: request.headers,
      body: JSON.stringify({
        name: "Updated",
        html: "<html><body>New content</body></html>",
      }),
    });

    const response = await PUT(putRequest as any, {
      params: Promise.resolve({ emailId: email.id }),
    });

    expect(response.status).toBe(200);

    const updated = await prisma.email.findUnique({
      where: { id: email.id },
    });
    expect(updated?.name).toBe("Updated");
    expect(updated?.htmlContent).toContain("New content");
    expect(updated?.textContent).toBeTruthy();
  });
});

describe("DELETE /api/v1/marketing-emails/[emailId] - Delete", () => {
  test("should delete an unused email", async () => {
    const email = await prisma.email.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "To Delete",
        type: "AUTOMATION",
      },
    });

    const request = new Request(
      `http://localhost/api/v1/marketing-emails/${email.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${fullAccessApiKey.key}` },
      },
    );

    const response = await DELETE(request as any, {
      params: Promise.resolve({ emailId: email.id }),
    });

    expect(response.status).toBe(200);

    const deleted = await prisma.email.findUnique({
      where: { id: email.id },
    });
    expect(deleted).toBeNull();
  });

  test("should reject deletion of email used by a form", async () => {
    const email = await prisma.email.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Used Email",
        type: "AUTOMATION",
      },
    });

    // Create a form that references this email
    await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Test Form",
        type: "SIGN_UP",
        display: "INLINE_EMBED",
        status: "DRAFT",
        version: 1,
        doubleOptInEmailId: email.id,
        fieldMapping: {} as never,
      },
    });

    const request = new Request(
      `http://localhost/api/v1/marketing-emails/${email.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${fullAccessApiKey.key}` },
      },
    );

    const response = await DELETE(request as any, {
      params: Promise.resolve({ emailId: email.id }),
    });

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error.message).toContain("Test Form");
  });
});
