/**
 * Integration tests for Send Transactional Email Endpoint (External API)
 *
 * Tests actual Next.js route handlers for:
 * - POST /api/v1/emails/send - Send transactional email
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST } from "@/app/(main)/api/v1/emails/send/route";
import { ErrorCode, ErrorType } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import {
  cleanupWorkspace,
  createFullAccessApiKey,
  createApiKeyWithoutSmtpSend,
  createTestWorkspace,
  post,
  type CreatedApiKey,
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

async function createVerifiedSendingDomain(
  workspaceId: string,
  name: string,
) {
  const domain = await prisma.sendingDomain.create({
    data: {
      workspaceId,
      name,
      dkimSubDomain: "kibamail._domainkey",
      dkimPublicKey: "test-public-key",
      dkimPrivateKey: "test-private-key",
      returnPathSubDomain: "kb",
      returnPathDomainCnameValue: "mail.kbmta.net",
      trackingSubDomain: "e",
      trackingDomainCnameValue: "e.kbmta.net",
      dmarcReportingCode: "abcdefghij",
      dkimVerifiedAt: new Date(),
      returnPathDomainVerifiedAt: new Date(),
      openTrackingEnabled: true,
      clickTrackingEnabled: true,
      inboxEnabled: false,
    },
  });

  return domain;
}

describe("POST /api/v1/emails/send", () => {
  test("should send transactional email with valid data", async () => {
    const domainName = `transactional-${Date.now()}.kibamail.xyz`;
    const domain = await createVerifiedSendingDomain(testWorkspace.id, domainName);

    const request = post(
      "/emails/send",
      {
        from: `info@${domainName}`,
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML content</p>",
        text: "Test text content",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("email");
    expect(responseData.id).toBeDefined();
    expect(typeof responseData.id).toBe("string");
  });

  test("should auto-generate text body if not provided", async () => {
    const domainName = `transactional-${Date.now()}.kibamail.xyz`;
    const domain = await createVerifiedSendingDomain(testWorkspace.id, domainName);

    const request = post(
      "/emails/send",
      {
        from: `info@${domainName}`,
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML content</p>",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("email");
    expect(responseData.id).toBeDefined();
  });

  test("should send to multiple recipients", async () => {
    const domainName = `transactional-${Date.now()}.kibamail.xyz`;
    const domain = await createVerifiedSendingDomain(testWorkspace.id, domainName);

    const request = post(
      "/emails/send",
      {
        from: `info@${domainName}`,
        to: ["recipient1@example.com", "recipient2@example.com", "recipient3@example.com"],
        subject: "Test Subject",
        html: "<p>Test HTML content</p>",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("email");
    expect(responseData.id).toBeDefined();
  });

  test("should auto-create sender identity if not exists", async () => {
    const domainName = `transactional-${Date.now()}.kibamail.xyz`;
    const domain = await createVerifiedSendingDomain(testWorkspace.id, domainName);

    const request = post(
      "/emails/send",
      {
        from: `new-sender@${domainName}`,
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML content</p>",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);

    const senderIdentity = await prisma.senderIdentity.findFirst({
      where: {
        workspaceId: testWorkspace.id,
        sendingDomainId: domain.id,
        email: "new-sender",
      },
    });

    expect(senderIdentity).toBeDefined();
    expect(senderIdentity?.email).toBe("new-sender");
  });

  test("should reject unverified sending domain", async () => {
    const domainName = `transactional-${Date.now()}.kibamail.xyz`;
    const domain = await prisma.sendingDomain.create({
      data: {
        workspaceId: testWorkspace.id,
        name: domainName,
        dkimSubDomain: "kibamail._domainkey",
        dkimPublicKey: "test-public-key",
        dkimPrivateKey: "test-private-key",
        returnPathSubDomain: "kb",
        returnPathDomainCnameValue: "mail.kbmta.net",
        trackingSubDomain: "e",
        trackingDomainCnameValue: "e.kbmta.net",
        dmarcReportingCode: "abcdefghij",
        dkimVerifiedAt: null,
        returnPathDomainVerifiedAt: null,
      },
    });

    const request = post(
      "/emails/send",
      {
        from: `info@${domainName}`,
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML content</p>",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.SENDING_DOMAIN_NOT_VERIFIED);
  });

  test("should reject sending domain not found", async () => {
    const request = post(
      "/emails/send",
      {
        from: "info@nonexistent-domain.com",
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML content</p>",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.SENDING_DOMAIN_NOT_FOUND);
  });

  test("should reject invalid email format for from", async () => {
    const request = post(
      "/emails/send",
      {
        from: "invalid-email",
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML content</p>",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
  });

  test("should reject invalid email format for to", async () => {
    const domainName = `transactional-${Date.now()}.kibamail.xyz`;
    const domain = await createVerifiedSendingDomain(testWorkspace.id, domainName);

    const request = post(
      "/emails/send",
      {
        from: `info@${domainName}`,
        to: "invalid-email",
        subject: "Test Subject",
        html: "<p>Test HTML content</p>",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
  });

  test("should reject missing required field", async () => {
    const request = post(
      "/emails/send",
      {
        from: "info@example.com",
        to: "recipient@example.com",
        html: "<p>Test HTML content</p>",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
  });

  test("should reject empty recipient array", async () => {
    const domainName = `transactional-${Date.now()}.kibamail.xyz`;
    const domain = await createVerifiedSendingDomain(testWorkspace.id, domainName);

    const request = post(
      "/emails/send",
      {
        from: `info@${domainName}`,
        to: [],
        subject: "Test Subject",
        html: "<p>Test HTML content</p>",
      },
      fullAccessApiKey.key,
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
  });

  test("should reject API key without smtp:send scope", async () => {
    const readOnlyApiKey = await createApiKeyWithoutSmtpSend(testWorkspace.id);

    const domainName = `transactional-${Date.now()}.kibamail.xyz`;
    const domain = await createVerifiedSendingDomain(testWorkspace.id, domainName);

    const request = post(
      "/emails/send",
      {
        from: `info@${domainName}`,
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML content</p>",
      },
      readOnlyApiKey.key,
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBeDefined();
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });
});
