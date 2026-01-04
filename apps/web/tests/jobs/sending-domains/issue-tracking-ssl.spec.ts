/**
 * Tests for Issue Tracking SSL Job
 *
 * Tests SSL certificate issuance via ACME protocol.
 * Mocks the ACME tool to avoid real Let's Encrypt interactions.
 */

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
import { decrypt } from "@/lib/encryption";
import {
  cleanupWorkspace,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils";

// Use vi.hoisted to ensure mocks are available before module loading
const { mockAcmeTool } = vi.hoisted(() => ({
  mockAcmeTool: {
    setAccountKey: vi.fn().mockReturnThis(),
    forDomain: vi.fn().mockReturnThis(),
    issueCertificate: vi.fn(),
  },
}));

vi.mock("@/lib/ssl/acme", () => ({
  createAcmeTool: () => mockAcmeTool,
}));

// Mock env to provide ACME_ACCOUNT_KEY
vi.mock("@/env/schema", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/env/schema")>();
  return {
    ...actual,
    env: {
      ...actual.env,
      ACME_ACCOUNT_KEY: Buffer.from("test-acme-account-key").toString("base64"),
    },
  };
});

import { issueTrackingSsl } from "@/jobs/sending-domains/issue-tracking-ssl";

let testWorkspace: TestWorkspace;
let testDomainId: string;

async function createTestDomainInDb(
  overrides: Partial<{
    trackingDomainVerifiedAt: Date | null;
    trackingDomainSslVerifiedAt: Date | null;
    trackingSubDomain: string;
  }> = {},
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
      trackingSubDomain: overrides.trackingSubDomain ?? "e",
      trackingDomainCnameValue: "e.kbmta.net",
      dmarcReportingCode: "abcdefghij",
      // Use 'in' operator to check if key exists (allows explicit null)
      trackingDomainVerifiedAt:
        "trackingDomainVerifiedAt" in overrides
          ? overrides.trackingDomainVerifiedAt
          : new Date(),
      trackingDomainSslVerifiedAt:
        "trackingDomainSslVerifiedAt" in overrides
          ? overrides.trackingDomainSslVerifiedAt
          : null,
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
  mockAcmeTool.setAccountKey.mockReturnThis();
  mockAcmeTool.forDomain.mockReturnThis();
  // Provide a default mock return value to prevent destructuring errors
  mockAcmeTool.issueCertificate.mockResolvedValue({
    certificate:
      "-----BEGIN CERTIFICATE-----\nDEFAULT\n-----END CERTIFICATE-----",
    privateKey: Buffer.from("default-private-key"),
  });
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

describe("issue-tracking-ssl job", () => {
  describe("precondition checks", () => {
    test("should skip if domain not found", async () => {
      await issueTrackingSsl({ domainId: "non-existent-id" }, "job-1");

      expect(mockAcmeTool.issueCertificate).not.toHaveBeenCalled();
    });

    test("should skip if tracking DNS not verified", async () => {
      await createTestDomainInDb({
        trackingDomainVerifiedAt: null,
      });

      await issueTrackingSsl({ domainId: testDomainId }, "job-2");

      expect(mockAcmeTool.issueCertificate).not.toHaveBeenCalled();
    });

    test("should skip if SSL already issued", async () => {
      await createTestDomainInDb({
        trackingDomainVerifiedAt: new Date(),
        trackingDomainSslVerifiedAt: new Date(),
      });

      await issueTrackingSsl({ domainId: testDomainId }, "job-3");

      expect(mockAcmeTool.issueCertificate).not.toHaveBeenCalled();
    });
  });

  describe("certificate issuance", () => {
    test("should use ACME account key from environment", async () => {
      await createTestDomainInDb();

      mockAcmeTool.issueCertificate.mockResolvedValue({
        certificate:
          "-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----",
        privateKey: Buffer.from("private-key"),
      });

      await issueTrackingSsl({ domainId: testDomainId }, "job-4");

      expect(mockAcmeTool.setAccountKey).toHaveBeenCalledWith(
        expect.any(Buffer),
      );
    });

    test("should issue certificate for tracking domain", async () => {
      const domain = await createTestDomainInDb({
        trackingSubDomain: "e",
      });

      const expectedTrackingDomain = `e.${domain.name}`;

      mockAcmeTool.issueCertificate.mockResolvedValue({
        certificate:
          "-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----",
        privateKey: Buffer.from("private-key"),
      });

      await issueTrackingSsl({ domainId: testDomainId }, "job-5");

      expect(mockAcmeTool.forDomain).toHaveBeenCalledWith(
        expectedTrackingDomain,
      );
      expect(mockAcmeTool.issueCertificate).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
      );
    });

    test("should store challenge token during issuance", async () => {
      await createTestDomainInDb();

      mockAcmeTool.issueCertificate.mockImplementation(
        async (createFn, removeFn) => {
          // Simulate ACME challenge
          await createFn("test-token-123", "test-key-auth-456");

          // Verify challenge was stored
          const domainWithChallenge = await prisma.sendingDomain.findUnique({
            where: { id: testDomainId },
          });
          expect(domainWithChallenge?.trackingSslChallengeToken).toBe(
            "test-token-123",
          );
          expect(domainWithChallenge?.trackingSslChallengeAuth).toBeDefined();
          if (domainWithChallenge?.trackingSslChallengeAuth) {
            expect(decrypt(domainWithChallenge.trackingSslChallengeAuth)).toBe(
              "test-key-auth-456",
            );
          }

          // Simulate challenge completion
          await removeFn("test-token-123");

          // Verify challenge was cleared
          const domainAfterRemove = await prisma.sendingDomain.findUnique({
            where: { id: testDomainId },
          });
          expect(domainAfterRemove?.trackingSslChallengeToken).toBeNull();
          expect(domainAfterRemove?.trackingSslChallengeAuth).toBeNull();

          return {
            certificate:
              "-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----",
            privateKey: Buffer.from("private-key"),
          };
        },
      );

      await issueTrackingSsl({ domainId: testDomainId }, "job-6");
    });

    test("should store certificate and private key after successful issuance", async () => {
      await createTestDomainInDb();

      const certificate =
        "-----BEGIN CERTIFICATE-----\nABC123XYZ\n-----END CERTIFICATE-----";
      const privateKey = Buffer.from("super-secret-private-key");

      mockAcmeTool.issueCertificate.mockResolvedValue({
        certificate,
        privateKey,
      });

      await issueTrackingSsl({ domainId: testDomainId }, "job-7");

      const updatedDomain = await prisma.sendingDomain.findUnique({
        where: { id: testDomainId },
      });

      // Certificate and key should be stored encrypted
      expect(updatedDomain?.trackingSslCertKey).toBeDefined();
      expect(updatedDomain?.trackingSslCertSecret).toBeDefined();
      expect(updatedDomain?.trackingDomainSslVerifiedAt).toBeDefined();

      // Verify they can be decrypted
      if (
        updatedDomain?.trackingSslCertKey &&
        updatedDomain?.trackingSslCertSecret
      ) {
        expect(decrypt(updatedDomain.trackingSslCertKey)).toBe(certificate);
        expect(decrypt(updatedDomain.trackingSslCertSecret)).toBe(
          privateKey.toString("utf-8"),
        );
      }

      // Challenge data should be cleared
      expect(updatedDomain?.trackingSslChallengeToken).toBeNull();
      expect(updatedDomain?.trackingSslChallengeAuth).toBeNull();
    });

    test("should update trackingDomainSslVerifiedAt timestamp", async () => {
      await createTestDomainInDb();

      mockAcmeTool.issueCertificate.mockResolvedValue({
        certificate: "cert",
        privateKey: Buffer.from("key"),
      });

      const beforeTime = new Date();

      await issueTrackingSsl({ domainId: testDomainId }, "job-8");

      const afterTime = new Date();

      const updatedDomain = await prisma.sendingDomain.findUnique({
        where: { id: testDomainId },
      });

      expect(updatedDomain?.trackingDomainSslVerifiedAt).toBeDefined();
      expect(
        updatedDomain?.trackingDomainSslVerifiedAt?.getTime(),
      ).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(
        updatedDomain?.trackingDomainSslVerifiedAt?.getTime(),
      ).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe("error handling", () => {
    test("should clear challenge data on failure", async () => {
      await createTestDomainInDb();

      // Simulate a challenge being stored, then failure
      mockAcmeTool.issueCertificate.mockImplementation(async (createFn) => {
        await createFn("test-token", "test-key-auth");
        throw new Error("ACME authorization failed");
      });

      await expect(
        issueTrackingSsl({ domainId: testDomainId }, "job-9"),
      ).rejects.toThrow("ACME authorization failed");

      // Challenge data should be cleared despite failure
      const domain = await prisma.sendingDomain.findUnique({
        where: { id: testDomainId },
      });

      expect(domain?.trackingSslChallengeToken).toBeNull();
      expect(domain?.trackingSslChallengeAuth).toBeNull();

      // SSL should not be marked as verified
      expect(domain?.trackingDomainSslVerifiedAt).toBeNull();
    });

    test("should propagate ACME errors", async () => {
      await createTestDomainInDb();

      mockAcmeTool.issueCertificate.mockRejectedValue(
        new Error("Rate limit exceeded"),
      );

      await expect(
        issueTrackingSsl({ domainId: testDomainId }, "job-10"),
      ).rejects.toThrow("Rate limit exceeded");
    });
  });
});
