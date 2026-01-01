/**
 * Integration tests for Sending Domain Creation (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/domains - Create new sending domain
 */

import { POST } from "@/app/(main)/api/v1/domains/route";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  cleanupWorkspace,
  post,
  apiRequest,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";
import { ErrorType, ErrorCode } from "@/lib/api/error-codes";
import { createSign, createVerify } from "node:crypto";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/sending-domains/dkim";
import { env } from "@/env/schema";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

/**
 * Setup: Create a test workspace and API keys for authentication
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

/**
 * Cleanup: Delete test data
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("POST /api/v1/domains", () => {
  test("should create a new sending domain with valid name", async () => {
    const domainData = {
      name: "test-create.example.com",
    };
    const request = post("/domains", domainData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("sending_domain");
    expect(responseData.id).toBeDefined();
    expect(responseData.name).toBe("test-create.example.com");
    expect(responseData.dkimVerified).toBe(false);
    expect(responseData.returnPathVerified).toBe(false);
    expect(responseData.trackingVerified).toBe(false);
    expect(responseData.openTrackingEnabled).toBe(false);
    expect(responseData.clickTrackingEnabled).toBe(false);
    expect(responseData.dnsRecords).toBeDefined();
    expect(responseData.dnsRecords.dkim).toBeDefined();
    expect(responseData.dnsRecords.dkim.type).toBe("TXT");
    expect(responseData.dnsRecords.returnPath).toBeDefined();
    expect(responseData.dnsRecords.returnPath.type).toBe("CNAME");
    expect(responseData.dnsRecords.tracking).toBeDefined();
    expect(responseData.dnsRecords.tracking.type).toBe("CNAME");
    expect(responseData.createdAt).toBeDefined();
  });

  test("should generate valid DKIM key pair that can sign and verify", async () => {
    const domainData = {
      name: "test-dkim.example.com",
    };
    const request = post("/domains", domainData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);

    // Fetch the domain from DB to get the encrypted private key
    const domain = await prisma.sendingDomain.findUnique({
      where: { id: responseData.id },
    });

    expect(domain).not.toBeNull();
    expect(domain!.dkimPrivateKey).toBeDefined();
    expect(domain!.dkimPublicKey).toBeDefined();

    // Decrypt the private key
    const privateKey = decrypt(domain!.dkimPrivateKey, env.APP_KEY);

    // Test signing and verifying
    const message = "Test message for DKIM signing";
    const sign = createSign("RSA-SHA256");
    sign.update(message);
    const signature = sign.sign(privateKey, "base64");

    const verify = createVerify("RSA-SHA256");
    verify.update(message);
    const isValid = verify.verify(domain!.dkimPublicKey, signature, "base64");

    expect(isValid).toBe(true);
  });

  test("should generate unique DKIM subdomain with timestamp format", async () => {
    const domainData = {
      name: "test-subdomain.example.com",
    };
    const request = post("/domains", domainData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);

    // DKIM hostname should match format: kibamail._domainkey.domain
    const dkimHostname = responseData.dnsRecords.dkim.hostname;
    expect(dkimHostname).toBe("kibamail._domainkey.test-subdomain.example.com");
  });

  test("should lowercase domain name", async () => {
    const domainData = {
      name: "TEST-UPPERCASE.EXAMPLE.COM",
    };
    const request = post("/domains", domainData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.name).toBe("test-uppercase.example.com");
  });

  test("should reject duplicate domain name in same workspace", async () => {
    const domainData = {
      name: "test-duplicate.example.com",
    };

    // Create first domain
    const request1 = post("/domains", domainData, fullAccessApiKey.key);
    const response1 = await POST(request1);
    expect(response1.status).toBe(201);

    // Try to create duplicate
    const request2 = post("/domains", domainData, fullAccessApiKey.key);
    const response2 = await POST(request2);
    const responseData = await response2.json();

    expect(response2.status).toBe(409);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.SENDING_DOMAIN_ALREADY_EXISTS);
  });

  test("should allow same domain name in different workspaces", async () => {
    const domainData = {
      name: "test-multiworkspace.example.com",
    };

    // Create in first workspace
    const request1 = post("/domains", domainData, fullAccessApiKey.key);
    const response1 = await POST(request1);
    expect(response1.status).toBe(201);

    // Create second workspace and API key
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    // Create same domain in second workspace
    const request2 = post("/domains", domainData, otherApiKey.key);
    const response2 = await POST(request2);
    expect(response2.status).toBe(201);

    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should reject request with missing Authorization header", async () => {
    const domainData = { name: "test.example.com" };
    const request = apiRequest("/domains").method("POST").body(domainData).build();

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.MISSING_AUTHORIZATION_HEADER);
  });

  test("should reject request without write:domains scope", async () => {
    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:domains"],
    });

    const domainData = { name: "test-scope.example.com" };
    const request = post("/domains", domainData, readOnlyKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });

  test("should reject domain with empty name", async () => {
    const domainData = {
      name: "",
    };
    const request = post("/domains", domainData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  test("should reject domain with invalid format", async () => {
    const domainData = {
      name: "not-a-valid-domain",
    };
    const request = post("/domains", domainData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  test("should reject domain with name exceeding max length", async () => {
    const domainData = {
      name: "a".repeat(101) + ".example.com",
    };
    const request = post("/domains", domainData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(422);
    expect(responseData.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(responseData.error.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  test("should accept valid subdomain formats", async () => {
    const validDomains = [
      "sub.example.com",
      "mail.sub.example.com",
      "test-domain.example.co.uk",
    ];

    for (const domain of validDomains) {
      const domainData = { name: domain };
      const request = post("/domains", domainData, fullAccessApiKey.key);

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.name).toBe(domain);
    }
  });
});
