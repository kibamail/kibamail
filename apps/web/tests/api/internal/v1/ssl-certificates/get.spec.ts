/**
 * Tests for Internal SSL Certificates Endpoint
 *
 * Tests GET /api/internal/v1/ssl-certificates/:hostname
 * Used by OpenResty sidecar to fetch SSL certificates for TLS termination.
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

vi.mock("@/env/schema", () => ({
  env: {
    INTERNAL_SERVICE_KEY: "test-internal-service-key-32chars!",
    APP_KEY: "test-app-key-that-is-32-chars-long",
  },
}));

import { GET } from "@/app/(main)/api/internal/v1/ssl-certificates/[hostname]/route";

const VALID_SERVICE_KEY = "test-internal-service-key-32chars!";

let testWorkspace: TestWorkspace;
let testDomainId: string;

function createRequest(
  hostname: string,
  options?: { serviceKey?: string | null },
): NextRequest {
  const url = `http://localhost:3000/api/internal/v1/ssl-certificates/${hostname}`;
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

async function createTestDomainWithCert(
  domainName: string,
  trackingSubDomain: string,
  certificate: string,
  privateKey: string,
) {
  const domain = await prisma.sendingDomain.create({
    data: {
      workspaceId: testWorkspace.id,
      name: domainName,
      dkimSubDomain: "kibamail._domainkey",
      dkimPublicKey: "test-public-key",
      dkimPrivateKey: "test-private-key",
      returnPathSubDomain: "kb",
      returnPathDomainCnameValue: "mail.kbmta.net",
      trackingSubDomain: trackingSubDomain,
      trackingDomainCnameValue: "e.kbmta.net",
      dmarcReportingCode: "abcdefghij",
      trackingDomainVerifiedAt: new Date(),
      trackingDomainSslVerifiedAt: new Date(),
      trackingSslCertKey: encrypt(certificate),
      trackingSslCertSecret: encrypt(privateKey),
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

describe("GET /api/internal/v1/ssl-certificates/:hostname", () => {
  describe("authentication", () => {
    test("should reject request without Authorization header", async () => {
      const request = createRequest("e.example.com", { serviceKey: null });
      const params = Promise.resolve({ hostname: "e.example.com" });

      const response = await GET(request, { params });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test("should reject request with invalid service key", async () => {
      const request = createRequest("e.example.com", {
        serviceKey: "wrong-key",
      });
      const params = Promise.resolve({ hostname: "e.example.com" });

      const response = await GET(request, { params });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test("should accept request with valid service key", async () => {
      const certificate =
        "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----";
      const privateKey =
        "-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----";
      await createTestDomainWithCert(
        "example.com",
        "e",
        certificate,
        privateKey,
      );

      const request = createRequest("e.example.com");
      const params = Promise.resolve({ hostname: "e.example.com" });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });
  });

  describe("hostname validation", () => {
    test("should return 400 for invalid hostname format", async () => {
      const request = createRequest("invalid");
      const params = Promise.resolve({ hostname: "invalid" });

      const response = await GET(request, { params });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("Invalid hostname");
    });

    test("should return 400 for two-part hostname", async () => {
      const request = createRequest("example.com");
      const params = Promise.resolve({ hostname: "example.com" });

      const response = await GET(request, { params });

      expect(response.status).toBe(400);
    });
  });

  describe("certificate lookup", () => {
    test("should return certificate and private key for valid hostname", async () => {
      const certificate =
        "-----BEGIN CERTIFICATE-----\nABC123\n-----END CERTIFICATE-----";
      const privateKey =
        "-----BEGIN PRIVATE KEY-----\nXYZ789\n-----END PRIVATE KEY-----";
      await createTestDomainWithCert(
        "example.com",
        "e",
        certificate,
        privateKey,
      );

      const request = createRequest("e.example.com");
      const params = Promise.resolve({ hostname: "e.example.com" });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.certificate).toBe(certificate);
      expect(body.privateKey).toBe(privateKey);
      expect(body.expiresAt).toBeDefined();
    });

    test("should return 404 for non-existent domain", async () => {
      const request = createRequest("e.nonexistent.com");
      const params = Promise.resolve({ hostname: "e.nonexistent.com" });

      const response = await GET(request, { params });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test("should return 404 for domain without SSL cert", async () => {
      const domain = await prisma.sendingDomain.create({
        data: {
          workspaceId: testWorkspace.id,
          name: "nocert.com",
          dkimSubDomain: "kibamail._domainkey",
          dkimPublicKey: "test-public-key",
          dkimPrivateKey: "test-private-key",
          returnPathSubDomain: "kb",
          returnPathDomainCnameValue: "mail.kbmta.net",
          trackingSubDomain: "e",
          trackingDomainCnameValue: "e.kbmta.net",
          dmarcReportingCode: "abcdefghij",
          trackingDomainVerifiedAt: new Date(),
          trackingDomainSslVerifiedAt: null,
        },
      });
      testDomainId = domain.id;

      const request = createRequest("e.nocert.com");
      const params = Promise.resolve({ hostname: "e.nocert.com" });

      const response = await GET(request, { params });

      expect(response.status).toBe(404);
    });

    test("should match tracking subdomain correctly", async () => {
      const certificate =
        "-----BEGIN CERTIFICATE-----\nCUSTOM\n-----END CERTIFICATE-----";
      const privateKey =
        "-----BEGIN PRIVATE KEY-----\nCUSTOM\n-----END PRIVATE KEY-----";
      await createTestDomainWithCert(
        "example.com",
        "track",
        certificate,
        privateKey,
      );

      const request = createRequest("track.example.com");
      const params = Promise.resolve({ hostname: "track.example.com" });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.certificate).toBe(certificate);
    });

    test("should handle subdomains in domain name", async () => {
      const certificate =
        "-----BEGIN CERTIFICATE-----\nSUB\n-----END CERTIFICATE-----";
      const privateKey =
        "-----BEGIN PRIVATE KEY-----\nSUB\n-----END PRIVATE KEY-----";
      await createTestDomainWithCert(
        "mail.example.com",
        "e",
        certificate,
        privateKey,
      );

      const request = createRequest("e.mail.example.com");
      const params = Promise.resolve({ hostname: "e.mail.example.com" });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.certificate).toBe(certificate);
    });
  });

  describe("decryption", () => {
    test("should decrypt stored certificate and private key", async () => {
      const certificate =
        "-----BEGIN CERTIFICATE-----\nENCRYPTED_TEST\n-----END CERTIFICATE-----";
      const privateKey =
        "-----BEGIN PRIVATE KEY-----\nENCRYPTED_TEST\n-----END PRIVATE KEY-----";
      await createTestDomainWithCert(
        "decrypt.com",
        "e",
        certificate,
        privateKey,
      );

      const domain = await prisma.sendingDomain.findFirst({
        where: { name: "decrypt.com" },
      });
      expect(domain).toBeDefined();
      expect(domain?.trackingSslCertKey).not.toBe(certificate);
      if (domain?.trackingSslCertKey) {
        expect(decrypt(domain.trackingSslCertKey)).toBe(certificate);
      }

      const request = createRequest("e.decrypt.com");
      const params = Promise.resolve({ hostname: "e.decrypt.com" });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.certificate).toBe(certificate);
      expect(body.privateKey).toBe(privateKey);
    });
  });

  describe("expiry calculation", () => {
    test("should return expiresAt as 90 days from SSL verification date", async () => {
      const certificate =
        "-----BEGIN CERTIFICATE-----\nEXPIRY\n-----END CERTIFICATE-----";
      const privateKey =
        "-----BEGIN PRIVATE KEY-----\nEXPIRY\n-----END PRIVATE KEY-----";
      const sslVerifiedAt = new Date("2024-01-15T00:00:00Z");

      const domain = await prisma.sendingDomain.create({
        data: {
          workspaceId: testWorkspace.id,
          name: "expiry.com",
          dkimSubDomain: "kibamail._domainkey",
          dkimPublicKey: "test-public-key",
          dkimPrivateKey: "test-private-key",
          returnPathSubDomain: "kb",
          returnPathDomainCnameValue: "mail.kbmta.net",
          trackingSubDomain: "e",
          trackingDomainCnameValue: "e.kbmta.net",
          dmarcReportingCode: "abcdefghij",
          trackingDomainVerifiedAt: new Date(),
          trackingDomainSslVerifiedAt: sslVerifiedAt,
          trackingSslCertKey: encrypt(certificate),
          trackingSslCertSecret: encrypt(privateKey),
        },
      });
      testDomainId = domain.id;

      const request = createRequest("e.expiry.com");
      const params = Promise.resolve({ hostname: "e.expiry.com" });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const body = await response.json();
      const expectedExpiry = new Date("2024-04-14T00:00:00Z");
      expect(new Date(body.expiresAt).getTime()).toBe(expectedExpiry.getTime());
    });
  });
});
