import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST, GET as LIST } from "@/app/(main)/api/v1/marketing-emails/route";
import {
  GET,
  PUT,
  DELETE,
} from "@/app/(main)/api/v1/marketing-emails/[emailId]/route";
import { GET as PREVIEW } from "@/app/(main)/api/v1/marketing-emails/[emailId]/preview/route";
import { GET as STATS } from "@/app/(main)/api/v1/marketing-emails/[emailId]/stats/route";
import { prisma } from "@/lib/db";
import {
  COMPLIANCE_FOOTER,
  COMPLIANT_HTML,
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

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("GET /api/v1/marketing-emails/[emailId]/preview", () => {
  test("returns substituted HTML for email with content", async () => {
    const email = await prisma.email.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Preview Test",
        type: "AUTOMATION",
        htmlContent: `<p>Hello {{firstName}}</p><footer>${COMPLIANCE_FOOTER}</footer>`,
      },
    });

    const request = get(
      `/marketing-emails/${email.id}/preview`,
      fullAccessApiKey.key,
    );
    const response = await PREVIEW(request, {
      params: Promise.resolve({ emailId: email.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasContent).toBe(true);
    expect(data.html).toContain("John");
    expect(data.html).not.toContain("{{firstName}}");
  });

  test("returns hasContent=false for email without HTML", async () => {
    const email = await prisma.email.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "No HTML",
        type: "AUTOMATION",
      },
    });

    const request = get(
      `/marketing-emails/${email.id}/preview`,
      fullAccessApiKey.key,
    );
    const response = await PREVIEW(request, {
      params: Promise.resolve({ emailId: email.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasContent).toBe(false);
    expect(data.html).toBeNull();
  });

  test("returns 404 for non-existent email", async () => {
    const request = get(
      "/marketing-emails/nonexistent/preview",
      fullAccessApiKey.key,
    );
    const response = await PREVIEW(request, {
      params: Promise.resolve({ emailId: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  test("preserves unknown variables as-is in preview", async () => {
    const email = await prisma.email.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Unknown Var Preview",
        type: "AUTOMATION",
        htmlContent: `<p>{{unknown_variable}}</p><footer>${COMPLIANCE_FOOTER}</footer>`,
      },
    });

    const request = get(
      `/marketing-emails/${email.id}/preview`,
      fullAccessApiKey.key,
    );
    const response = await PREVIEW(request, {
      params: Promise.resolve({ emailId: email.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.html).toContain("{{unknown_variable}}");
  });

  test("requires read:emails scope", async () => {
    const noReadKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:emails"],
    });

    const email = await prisma.email.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Scope Test",
        type: "AUTOMATION",
      },
    });

    const request = get(
      `/marketing-emails/${email.id}/preview`,
      noReadKey.key,
    );
    const response = await PREVIEW(request, {
      params: Promise.resolve({ emailId: email.id }),
    });

    expect([401, 403]).toContain(response.status);
  });
});

describe("GET /api/v1/marketing-emails/[emailId]/stats", () => {
  test("returns zero stats for email with no events", async () => {
    const email = await prisma.email.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Stats No Events",
        type: "AUTOMATION",
      },
    });

    const request = get(
      `/marketing-emails/${email.id}/stats`,
      fullAccessApiKey.key,
    );
    const response = await STATS(request, {
      params: Promise.resolve({ emailId: email.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.object).toBe("marketing_email_stats");
    expect(data.totalSent).toBe(0);
    expect(data.totalDelivered).toBe(0);
    expect(data.totalOpened).toBe(0);
    expect(data.totalClicked).toBe(0);
    expect(data.totalBounced).toBe(0);
    expect(data.totalComplained).toBe(0);
    expect(data.openRate).toBe(0);
    expect(data.clickRate).toBe(0);
  });

  test("returns stats with event counts for email used by a form", async () => {
    const email = await prisma.email.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Stats With Events",
        type: "AUTOMATION",
      },
    });

    const form = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Stats Test Form",
        type: "SIGN_UP",
        display: "INLINE_EMBED",
        status: "DRAFT",
        version: 1,
        doubleOptInEmailId: email.id,
        fieldMapping: {} as never,
      },
    });

    await prisma.event.createMany({
      data: [
        {
          type: "Queued",
          broadcastId: `doi-${form.id}`,
          workspaceId: testWorkspace.id,
          recipient: "user@example.com",
        },
        {
          type: "Delivery",
          broadcastId: `doi-${form.id}`,
          workspaceId: testWorkspace.id,
          recipient: "user@example.com",
        },
        {
          type: "Open",
          broadcastId: `doi-${form.id}`,
          workspaceId: testWorkspace.id,
          recipient: "user@example.com",
        },
        {
          type: "Bounce",
          broadcastId: `doi-${form.id}`,
          workspaceId: testWorkspace.id,
          recipient: "bounced@example.com",
        },
      ],
    });

    const request = get(
      `/marketing-emails/${email.id}/stats`,
      fullAccessApiKey.key,
    );
    const response = await STATS(request, {
      params: Promise.resolve({ emailId: email.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalSent).toBe(1);
    expect(data.totalDelivered).toBe(1);
    expect(data.totalOpened).toBe(1);
    expect(data.totalBounced).toBe(1);
    expect(data.openRate).toBe(1);
    expect(data.clickRate).toBe(0);
    expect(data.usedByForms.length).toBe(1);
    expect(data.usedByForms[0].id).toBe(form.id);
    expect(data.usedByForms[0].name).toBe("Stats Test Form");
  });

  test("computes open and click rates correctly", async () => {
    const email = await prisma.email.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Stats Rates",
        type: "AUTOMATION",
      },
    });

    const form = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Rates Form",
        type: "SIGN_UP",
        display: "INLINE_EMBED",
        status: "DRAFT",
        version: 1,
        doubleOptInEmailId: email.id,
        fieldMapping: {} as never,
      },
    });

    await prisma.event.createMany({
      data: [
        { type: "Queued", broadcastId: `doi-${form.id}`, workspaceId: testWorkspace.id, recipient: "a@example.com" },
        { type: "Delivery", broadcastId: `doi-${form.id}`, workspaceId: testWorkspace.id, recipient: "a@example.com" },
        { type: "Delivery", broadcastId: `doi-${form.id}`, workspaceId: testWorkspace.id, recipient: "b@example.com" },
        { type: "Delivery", broadcastId: `doi-${form.id}`, workspaceId: testWorkspace.id, recipient: "c@example.com" },
        { type: "Open", broadcastId: `doi-${form.id}`, workspaceId: testWorkspace.id, recipient: "a@example.com" },
        { type: "Open", broadcastId: `doi-${form.id}`, workspaceId: testWorkspace.id, recipient: "b@example.com" },
        { type: "Click", broadcastId: `doi-${form.id}`, workspaceId: testWorkspace.id, recipient: "a@example.com" },
      ],
    });

    const request = get(
      `/marketing-emails/${email.id}/stats`,
      fullAccessApiKey.key,
    );
    const response = await STATS(request, {
      params: Promise.resolve({ emailId: email.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalDelivered).toBe(3);
    expect(data.totalOpened).toBe(2);
    expect(data.totalClicked).toBe(1);
    expect(data.openRate).toBeCloseTo(0.667, 2);
    expect(data.clickRate).toBeCloseTo(0.333, 2);
  });

  test("returns 404 for non-existent email", async () => {
    const request = get(
      "/marketing-emails/nonexistent/stats",
      fullAccessApiKey.key,
    );
    const response = await STATS(request, {
      params: Promise.resolve({ emailId: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  test("requires read:emails scope", async () => {
    const noReadKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["write:emails"],
    });

    const email = await prisma.email.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Stats Scope",
        type: "AUTOMATION",
      },
    });

    const request = get(
      `/marketing-emails/${email.id}/stats`,
      noReadKey.key,
    );
    const response = await STATS(request, {
      params: Promise.resolve({ emailId: email.id }),
    });

    expect([401, 403]).toContain(response.status);
  });
});

describe("POST /api/v1/marketing-emails - compliance validation", () => {
  test("rejects HTML missing unsubscribe_url (marketing compliance)", async () => {
    const htmlMissingUnsub = `<html><body><p>Content</p><footer>{{business_address}}<br><a href="{{terms_url}}">Terms</a> | <a href="{{privacy_url}}">Privacy</a></footer></body></html>`;

    const request = post(
      "/marketing-emails",
      {
        name: "Missing Unsub",
        subject: "Test",
        html: htmlMissingUnsub,
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.message).toMatch(/unsubscribe/i);
  });

  test("rejects HTML missing terms_url (marketing compliance)", async () => {
    const htmlMissingTerms = `<html><body><p>Content</p><footer>{{business_address}}<br><a href="{{unsubscribe_url}}">Unsub</a> | <a href="{{privacy_url}}">Privacy</a></footer></body></html>`;

    const request = post(
      "/marketing-emails",
      {
        name: "Missing Terms",
        subject: "Test",
        html: htmlMissingTerms,
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  test("rejects HTML missing privacy_url (marketing compliance)", async () => {
    const htmlMissingPrivacy = `<html><body><p>Content</p><footer>{{business_address}}<br><a href="{{unsubscribe_url}}">Unsub</a> | <a href="{{terms_url}}">Terms</a></footer></body></html>`;

    const request = post(
      "/marketing-emails",
      {
        name: "Missing Privacy",
        subject: "Test",
        html: htmlMissingPrivacy,
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

describe("PUT /api/v1/marketing-emails/[emailId] - compliance validation", () => {
  test("rejects update with non-compliant HTML", async () => {
    const email = await prisma.email.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Update Compliance",
        type: "AUTOMATION",
      },
    });

    const request = put(
      `/marketing-emails/${email.id}`,
      {
        html: "<p>No compliance vars</p>",
      },
      fullAccessApiKey.key,
    );

    const response = await PUT(request, {
      params: Promise.resolve({ emailId: email.id }),
    });

    expect(response.status).toBe(400);
  });

  test("clears HTML content when html is set to null", async () => {
    const email = await prisma.email.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Clear HTML",
        type: "AUTOMATION",
        htmlContent: `<p>Has content</p><footer>${COMPLIANCE_FOOTER}</footer>`,
        textContent: "Has content",
      },
    });

    const request = put(
      `/marketing-emails/${email.id}`,
      { html: null },
      fullAccessApiKey.key,
    );

    const response = await PUT(request, {
      params: Promise.resolve({ emailId: email.id }),
    });

    expect(response.status).toBe(200);

    const updated = await prisma.email.findUnique({
      where: { id: email.id },
    });
    expect(updated?.htmlContent).toBeNull();
    expect(updated?.textContent).toBeNull();
  });
});
