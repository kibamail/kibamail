/**
 * Tests for Check Tracking DNS Job
 *
 * Tests CNAME verification for customer tracking domains.
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
import {
  cleanupWorkspace,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils";

// Use vi.hoisted to ensure mocks are available before module loading
const { mockResolveCname, mockQueuePush } = vi.hoisted(() => ({
  mockResolveCname: vi.fn(),
  mockQueuePush: vi.fn(),
}));

vi.mock("node:dns", () => ({
  promises: {
    resolveCname: mockResolveCname,
  },
}));

vi.mock("@/lib/queue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queue")>();
  return {
    ...actual,
    queue: () => ({
      push: mockQueuePush,
    }),
  };
});

import { checkTrackingDns } from "@/jobs/sending-domains/check-tracking-dns";

let testWorkspace: TestWorkspace;
let testDomainId: string;

async function createTestDomainInDb(
  overrides: Partial<{
    trackingDomainVerifiedAt: Date | null;
    trackingSubDomain: string;
    trackingDomainCnameValue: string;
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
      trackingDomainCnameValue:
        overrides.trackingDomainCnameValue ?? "e.kbmta.net",
      dmarcReportingCode: "abcdefghij",
      trackingDomainVerifiedAt: overrides.trackingDomainVerifiedAt ?? null,
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
  mockResolveCname.mockReset();
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

describe("check-tracking-dns job", () => {
  describe("domain lookup", () => {
    test("should skip if domain not found", async () => {
      await checkTrackingDns({ domainId: "non-existent-id" }, "job-1");

      expect(mockResolveCname).not.toHaveBeenCalled();
      expect(mockQueuePush).not.toHaveBeenCalled();
    });
  });

  describe("DNS verification", () => {
    test("should verify CNAME and update domain when correctly configured", async () => {
      const domain = await createTestDomainInDb();
      const trackingDomain = `${domain.trackingSubDomain}.${domain.name}`;

      mockResolveCname.mockResolvedValue(["e.kbmta.net"]);

      await checkTrackingDns({ domainId: testDomainId }, "job-2");

      expect(mockResolveCname).toHaveBeenCalledWith(trackingDomain);

      const updatedDomain = await prisma.sendingDomain.findUnique({
        where: { id: testDomainId },
      });

      expect(updatedDomain?.trackingDomainVerifiedAt).not.toBeNull();
    });

    test("should queue SSL issuance job after DNS verification", async () => {
      await createTestDomainInDb();
      mockResolveCname.mockResolvedValue(["e.kbmta.net"]);

      await checkTrackingDns({ domainId: testDomainId }, "job-3");

      expect(mockQueuePush).toHaveBeenCalledWith("issue-tracking-ssl", {
        domainId: testDomainId,
      });
    });

    test("should accept CNAME with trailing subdomain", async () => {
      const _domain = await createTestDomainInDb({
        trackingDomainCnameValue: "e.kbmta.net",
      });

      // CNAME might have additional subdomain prefix
      mockResolveCname.mockResolvedValue(["something.e.kbmta.net"]);

      await checkTrackingDns({ domainId: testDomainId }, "job-4");

      const updatedDomain = await prisma.sendingDomain.findUnique({
        where: { id: testDomainId },
      });

      expect(updatedDomain?.trackingDomainVerifiedAt).not.toBeNull();
    });

    test("should be case-insensitive for CNAME matching", async () => {
      await createTestDomainInDb({
        trackingDomainCnameValue: "e.kbmta.net",
      });

      mockResolveCname.mockResolvedValue(["E.KBMTA.NET"]);

      await checkTrackingDns({ domainId: testDomainId }, "job-5");

      const updatedDomain = await prisma.sendingDomain.findUnique({
        where: { id: testDomainId },
      });

      expect(updatedDomain?.trackingDomainVerifiedAt).not.toBeNull();
    });
  });

  describe("retry logic", () => {
    test("should retry if CNAME not found (ENOTFOUND)", async () => {
      await createTestDomainInDb();

      const error = new Error("ENOTFOUND") as NodeJS.ErrnoException;
      error.code = "ENOTFOUND";
      mockResolveCname.mockRejectedValue(error);

      await checkTrackingDns({ domainId: testDomainId, attempt: 1 }, "job-6");

      expect(mockQueuePush).toHaveBeenCalledWith(
        "check-tracking-dns",
        { domainId: testDomainId, attempt: 2 },
        { delay: 30 * 1000 },
      );
    });

    test("should retry if CNAME not found (ENODATA)", async () => {
      await createTestDomainInDb();

      const error = new Error("ENODATA") as NodeJS.ErrnoException;
      error.code = "ENODATA";
      mockResolveCname.mockRejectedValue(error);

      await checkTrackingDns({ domainId: testDomainId, attempt: 1 }, "job-7");

      expect(mockQueuePush).toHaveBeenCalledWith(
        "check-tracking-dns",
        { domainId: testDomainId, attempt: 2 },
        { delay: 30 * 1000 },
      );
    });

    test("should retry if CNAME does not match expected target", async () => {
      await createTestDomainInDb();

      mockResolveCname.mockResolvedValue(["wrong.target.com"]);

      await checkTrackingDns({ domainId: testDomainId, attempt: 1 }, "job-8");

      expect(mockQueuePush).toHaveBeenCalledWith(
        "check-tracking-dns",
        { domainId: testDomainId, attempt: 2 },
        { delay: 30 * 1000 },
      );

      const updatedDomain = await prisma.sendingDomain.findUnique({
        where: { id: testDomainId },
      });

      expect(updatedDomain?.trackingDomainVerifiedAt).toBeNull();
    });

    test("should stop retrying after max attempts (20)", async () => {
      await createTestDomainInDb();

      const error = new Error("ENOTFOUND") as NodeJS.ErrnoException;
      error.code = "ENOTFOUND";
      mockResolveCname.mockRejectedValue(error);

      await checkTrackingDns({ domainId: testDomainId, attempt: 20 }, "job-9");

      // Should not schedule another retry
      expect(mockQueuePush).not.toHaveBeenCalled();
    });

    test("should increment attempt number on retry", async () => {
      await createTestDomainInDb();

      const error = new Error("ENODATA") as NodeJS.ErrnoException;
      error.code = "ENODATA";
      mockResolveCname.mockRejectedValue(error);

      await checkTrackingDns({ domainId: testDomainId, attempt: 5 }, "job-10");

      expect(mockQueuePush).toHaveBeenCalledWith(
        "check-tracking-dns",
        { domainId: testDomainId, attempt: 6 },
        expect.any(Object),
      );
    });

    test("should default attempt to 1 if not provided", async () => {
      await createTestDomainInDb();

      const error = new Error("ENODATA") as NodeJS.ErrnoException;
      error.code = "ENODATA";
      mockResolveCname.mockRejectedValue(error);

      await checkTrackingDns({ domainId: testDomainId }, "job-11");

      expect(mockQueuePush).toHaveBeenCalledWith(
        "check-tracking-dns",
        { domainId: testDomainId, attempt: 2 },
        expect.any(Object),
      );
    });
  });

  describe("error handling", () => {
    test("should throw on unexpected DNS errors", async () => {
      await createTestDomainInDb();

      const error = new Error(
        "DNS server unreachable",
      ) as NodeJS.ErrnoException;
      error.code = "ECONNREFUSED";
      mockResolveCname.mockRejectedValue(error);

      await expect(
        checkTrackingDns({ domainId: testDomainId }, "job-12"),
      ).rejects.toThrow("DNS server unreachable");
    });
  });

  describe("multiple CNAME records", () => {
    test("should verify if any CNAME matches expected target", async () => {
      await createTestDomainInDb();

      // Multiple CNAMEs, one matches
      mockResolveCname.mockResolvedValue([
        "other.domain.com",
        "e.kbmta.net",
        "another.domain.com",
      ]);

      await checkTrackingDns({ domainId: testDomainId }, "job-13");

      const updatedDomain = await prisma.sendingDomain.findUnique({
        where: { id: testDomainId },
      });

      expect(updatedDomain?.trackingDomainVerifiedAt).not.toBeNull();
    });
  });
});
