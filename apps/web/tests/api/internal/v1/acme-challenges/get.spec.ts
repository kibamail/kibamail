/**
 * Tests for Internal ACME Challenge Endpoint
 *
 * Tests GET /api/internal/v1/acme-challenges/:token
 * Used by tracking server to fetch challenge responses for Let's Encrypt.
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
import { decrypt, encrypt } from "@/lib/encryption";
import {
  cleanupWorkspace,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils";

// Mock env for INTERNAL_SERVICE_KEY
vi.mock("@/env/schema", () => ({
  env: {
    INTERNAL_SERVICE_KEY: "test-internal-service-key-32chars!",
    APP_KEY: "test-app-key-that-is-32-chars-long",
  },
}));

import { GET } from "@/app/(main)/api/internal/v1/acme-challenges/[token]/route";

const VALID_SERVICE_KEY = "test-internal-service-key-32chars!";

let testWorkspace: TestWorkspace;
let testDomainId: string;

function createRequest(
  token: string,
  options?: { serviceKey?: string | null },
): NextRequest {
  const url = `http://localhost:3000/api/internal/v1/acme-challenges/${token}`;
  const headers = new Headers();

  if (options?.serviceKey !== null) {
    headers.set(
      "Authorization",
      `Bearer ${options?.serviceKey ?? VALID_SERVICE_KEY}`,
    );
  }

  return new NextRequest(url, {
    method: "GET",
    headers,
  });
}

async function createTestDomainWithChallenge(
  challengeToken: string,
  keyAuthorization: string,
) {
  const domain = await prisma.sendingDomain.create({
    data: {
      workspaceId: testWorkspace.id,
      name: `test-${Date.now()}.example.com`,
      dkimSubDomain: "kibamail._domainkey",
      dkimPublicKey: "test-public-key",
      dkimPrivateKey: "test-private-key",
      returnPathSubDomain: "kb",
      returnPathDomainCnameValue: "mail.kbmta.net",
      trackingSubDomain: "e",
      trackingDomainCnameValue: "e.kbmta.net",
      dmarcReportingCode: "abcdefghij",
      trackingSslChallengeToken: challengeToken,
      trackingSslChallengeAuth: encrypt(keyAuthorization),
    },
  });
  testDomainId = domain.id;
  return domain;
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(async () => {
  if (testDomainId) {
    await prisma.sendingDomain
      .delete({ where: { id: testDomainId } })
      .catch(() => {});
    testDomainId = "";
  }
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
  vi.restoreAllMocks();
});

describe("GET /api/internal/v1/acme-challenges/:token", () => {
  describe("authentication", () => {
    test("should reject request without Authorization header", async () => {
      const request = createRequest("test-token", { serviceKey: null });
      const params = Promise.resolve({ token: "test-token" });

      const response = await GET(request, { params });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test("should reject request with invalid service key", async () => {
      const request = createRequest("test-token", {
        serviceKey: "wrong-key",
      });
      const params = Promise.resolve({ token: "test-token" });

      const response = await GET(request, { params });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test("should accept request with valid service key", async () => {
      await createTestDomainWithChallenge("valid-token", "key-auth-value");

      const request = createRequest("valid-token");
      const params = Promise.resolve({ token: "valid-token" });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });
  });

  describe("challenge lookup", () => {
    test("should return key authorization for valid challenge token", async () => {
      const challengeToken = "acme-challenge-token-abc123";
      const keyAuthorization = "acme-challenge-token-abc123.thumbprint-xyz789";

      await createTestDomainWithChallenge(challengeToken, keyAuthorization);

      const request = createRequest(challengeToken);
      const params = Promise.resolve({ token: challengeToken });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.keyAuthorization).toBe(keyAuthorization);
    });

    test("should return 404 for non-existent challenge token", async () => {
      const request = createRequest("non-existent-token");
      const params = Promise.resolve({ token: "non-existent-token" });

      const response = await GET(request, { params });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test("should return 404 if domain has no challenge auth stored", async () => {
      // Create domain without challenge auth
      const domain = await prisma.sendingDomain.create({
        data: {
          workspaceId: testWorkspace.id,
          name: `test-${Date.now()}.example.com`,
          dkimSubDomain: "kibamail._domainkey",
          dkimPublicKey: "test-public-key",
          dkimPrivateKey: "test-private-key",
          returnPathSubDomain: "kb",
          returnPathDomainCnameValue: "mail.kbmta.net",
          trackingSubDomain: "e",
          trackingDomainCnameValue: "e.kbmta.net",
          dmarcReportingCode: "abcdefghij",
          trackingSslChallengeToken: "token-without-auth",
          trackingSslChallengeAuth: null,
        },
      });
      testDomainId = domain.id;

      const request = createRequest("token-without-auth");
      const params = Promise.resolve({ token: "token-without-auth" });

      const response = await GET(request, { params });

      expect(response.status).toBe(404);
    });

    test("should decrypt the stored key authorization", async () => {
      const challengeToken = "decrypt-test-token";
      const keyAuthorization = "this.is.a.long.key.authorization.value";

      // Store encrypted
      await createTestDomainWithChallenge(challengeToken, keyAuthorization);

      // Verify it's stored encrypted
      const domain = await prisma.sendingDomain.findFirst({
        where: { trackingSslChallengeToken: challengeToken },
      });
      expect(domain).toBeDefined();
      expect(domain?.trackingSslChallengeAuth).not.toBe(keyAuthorization);
      if (domain?.trackingSslChallengeAuth) {
        expect(decrypt(domain.trackingSslChallengeAuth)).toBe(keyAuthorization);
      }

      // Fetch via API
      const request = createRequest(challengeToken);
      const params = Promise.resolve({ token: challengeToken });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.keyAuthorization).toBe(keyAuthorization);
    });
  });

  describe("security", () => {
    test("should only return matching domain challenge", async () => {
      // Create two domains with different tokens
      const domain1 = await prisma.sendingDomain.create({
        data: {
          workspaceId: testWorkspace.id,
          name: `test1-${Date.now()}.example.com`,
          dkimSubDomain: "kibamail._domainkey",
          dkimPublicKey: "test-public-key",
          dkimPrivateKey: "test-private-key",
          returnPathSubDomain: "kb",
          returnPathDomainCnameValue: "mail.kbmta.net",
          trackingSubDomain: "e",
          trackingDomainCnameValue: "e.kbmta.net",
          dmarcReportingCode: "abcdefghij",
          trackingSslChallengeToken: "token-domain-1",
          trackingSslChallengeAuth: encrypt("key-auth-1"),
        },
      });

      const domain2 = await prisma.sendingDomain.create({
        data: {
          workspaceId: testWorkspace.id,
          name: `test2-${Date.now()}.example.com`,
          dkimSubDomain: "kibamail._domainkey",
          dkimPublicKey: "test-public-key",
          dkimPrivateKey: "test-private-key",
          returnPathSubDomain: "kb",
          returnPathDomainCnameValue: "mail.kbmta.net",
          trackingSubDomain: "e",
          trackingDomainCnameValue: "e.kbmta.net",
          dmarcReportingCode: "abcdefghij",
          trackingSslChallengeToken: "token-domain-2",
          trackingSslChallengeAuth: encrypt("key-auth-2"),
        },
      });

      try {
        // Request token for domain 1
        const request = createRequest("token-domain-1");
        const params = Promise.resolve({ token: "token-domain-1" });

        const response = await GET(request, { params });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.keyAuthorization).toBe("key-auth-1");
      } finally {
        await prisma.sendingDomain.delete({ where: { id: domain1.id } });
        await prisma.sendingDomain.delete({ where: { id: domain2.id } });
      }
    });
  });
});
