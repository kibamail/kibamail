/**
 * Tests for Renew Expiring SSL Job
 *
 * Tests the scheduled job that finds certificates expiring within 30 days
 * and triggers renewal for each.
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

const { mockQueuePushBulk } = vi.hoisted(() => ({
  mockQueuePushBulk: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/queue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queue")>();
  return {
    ...actual,
    queue: () => ({
      pushBulk: mockQueuePushBulk,
    }),
  };
});

import { renewExpiringSsl } from "@/jobs/sending-domains/renew-expiring-ssl";

let testWorkspace: TestWorkspace;
const createdDomainIds: string[] = [];

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function createTestDomain(
  overrides: {
    trackingDomainSslVerifiedAt?: Date | null;
    trackingDomainVerifiedAt?: Date | null;
  } = {},
) {
  // Use 'in' check to distinguish between "not provided" and "explicitly set to null"
  // The ?? operator would treat explicit null as nullish and use the default
  const trackingDomainVerifiedAt =
    "trackingDomainVerifiedAt" in overrides
      ? overrides.trackingDomainVerifiedAt
      : new Date();

  const trackingDomainSslVerifiedAt =
    "trackingDomainSslVerifiedAt" in overrides
      ? overrides.trackingDomainSslVerifiedAt
      : null;

  const domain = await prisma.sendingDomain.create({
    data: {
      workspaceId: testWorkspace.id,
      name: `test-${Date.now()}-${Math.random().toString(36).slice(2)}.example.com`,
      dkimSubDomain: "kibamail._domainkey",
      dkimPublicKey: "test-public-key",
      dkimPrivateKey: "test-private-key",
      returnPathSubDomain: "kb",
      returnPathDomainCnameValue: "mail.kbmta.net",
      trackingSubDomain: "e",
      trackingDomainCnameValue: "e.kbmta.net",
      dmarcReportingCode: "abcdefghij",
      trackingDomainVerifiedAt,
      trackingDomainSslVerifiedAt,
    },
  });
  createdDomainIds.push(domain.id);
  return domain;
}

// Calculate threshold for cleanup
const RENEWAL_THRESHOLD_DAYS = 60;

beforeAll(async () => {
  testWorkspace = createTestWorkspace();

  // Clean up any pre-existing domains that would interfere with tests
  // This ensures test isolation even if previous test runs left data behind
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - RENEWAL_THRESHOLD_DAYS);

  await prisma.sendingDomain.deleteMany({
    where: {
      trackingDomainSslVerifiedAt: {
        not: null,
        lt: thresholdDate,
      },
      trackingDomainVerifiedAt: {
        not: null,
      },
    },
  });
});

beforeEach(async () => {
  vi.clearAllMocks();

  // Clean up test workspace domains before each test for isolation
  await prisma.sendingDomain.deleteMany({
    where: { workspaceId: testWorkspace.id },
  });
});

afterEach(async () => {
  for (const id of createdDomainIds) {
    await prisma.sendingDomain.delete({ where: { id } }).catch(() => {});
  }
  createdDomainIds.length = 0;
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
  vi.restoreAllMocks();
});

describe("renew-expiring-ssl job", () => {
  describe("certificate discovery", () => {
    test("should not queue any jobs when no certificates exist", async () => {
      await renewExpiringSsl({} as never, "job-1");

      expect(mockQueuePushBulk).not.toHaveBeenCalled();
    });

    test("should not queue renewal for certificates issued less than 60 days ago", async () => {
      // Certificate issued 30 days ago - should NOT be renewed
      await createTestDomain({
        trackingDomainSslVerifiedAt: daysAgo(30),
      });

      await renewExpiringSsl({} as never, "job-2");

      expect(mockQueuePushBulk).not.toHaveBeenCalled();
    });

    test("should not queue renewal for certificates issued at the 60 day boundary", async () => {
      // Certificate issued 59 days ago - firmly within the "should not renew" window
      // Using 59 instead of exactly 60 to avoid timing issues between domain creation and job execution
      await createTestDomain({
        trackingDomainSslVerifiedAt: daysAgo(59),
      });

      await renewExpiringSsl({} as never, "job-3");

      expect(mockQueuePushBulk).not.toHaveBeenCalled();
    });

    test("should queue renewal for certificates issued more than 60 days ago", async () => {
      // Certificate issued 61 days ago - should be renewed
      const domain = await createTestDomain({
        trackingDomainSslVerifiedAt: daysAgo(61),
      });

      await renewExpiringSsl({} as never, "job-4");

      expect(mockQueuePushBulk).toHaveBeenCalledTimes(1);
      expect(mockQueuePushBulk).toHaveBeenCalledWith([
        {
          name: "issue-tracking-ssl",
          data: { domainId: domain.id },
        },
      ]);
    });

    test("should queue renewal for very old certificates", async () => {
      // Certificate issued 85 days ago - definitely should be renewed
      const domain = await createTestDomain({
        trackingDomainSslVerifiedAt: daysAgo(85),
      });

      await renewExpiringSsl({} as never, "job-5");

      expect(mockQueuePushBulk).toHaveBeenCalledWith([
        {
          name: "issue-tracking-ssl",
          data: { domainId: domain.id },
        },
      ]);
    });
  });

  describe("filtering conditions", () => {
    test("should not queue renewal if tracking DNS is not verified", async () => {
      // Certificate old enough for renewal but DNS not verified
      await createTestDomain({
        trackingDomainSslVerifiedAt: daysAgo(70),
        trackingDomainVerifiedAt: null,
      });

      await renewExpiringSsl({} as never, "job-6");

      expect(mockQueuePushBulk).not.toHaveBeenCalled();
    });

    test("should not queue renewal for domains without SSL certificates", async () => {
      // Domain with verified DNS but no SSL certificate
      await createTestDomain({
        trackingDomainSslVerifiedAt: null,
        trackingDomainVerifiedAt: new Date(),
      });

      await renewExpiringSsl({} as never, "job-7");

      expect(mockQueuePushBulk).not.toHaveBeenCalled();
    });
  });

  describe("bulk processing", () => {
    test("should queue multiple renewals in a single batch", async () => {
      // Create 3 domains needing renewal
      const domain1 = await createTestDomain({
        trackingDomainSslVerifiedAt: daysAgo(65),
      });
      const domain2 = await createTestDomain({
        trackingDomainSslVerifiedAt: daysAgo(75),
      });
      const domain3 = await createTestDomain({
        trackingDomainSslVerifiedAt: daysAgo(85),
      });

      await renewExpiringSsl({} as never, "job-8");

      expect(mockQueuePushBulk).toHaveBeenCalledTimes(1);
      const jobs = mockQueuePushBulk.mock.calls[0][0];
      expect(jobs).toHaveLength(3);
      expect(jobs).toEqual(
        expect.arrayContaining([
          { name: "issue-tracking-ssl", data: { domainId: domain1.id } },
          { name: "issue-tracking-ssl", data: { domainId: domain2.id } },
          { name: "issue-tracking-ssl", data: { domainId: domain3.id } },
        ]),
      );
    });

    test("should only queue renewals for domains meeting all criteria", async () => {
      // Domain needing renewal (old cert, DNS verified)
      const needsRenewal = await createTestDomain({
        trackingDomainSslVerifiedAt: daysAgo(70),
        trackingDomainVerifiedAt: new Date(),
      });

      // Domain with old cert but DNS not verified - should NOT be renewed
      await createTestDomain({
        trackingDomainSslVerifiedAt: daysAgo(70),
        trackingDomainVerifiedAt: null,
      });

      // Domain with recent cert - should NOT be renewed
      await createTestDomain({
        trackingDomainSslVerifiedAt: daysAgo(30),
        trackingDomainVerifiedAt: new Date(),
      });

      // Domain without SSL cert - should NOT be renewed
      await createTestDomain({
        trackingDomainSslVerifiedAt: null,
        trackingDomainVerifiedAt: new Date(),
      });

      await renewExpiringSsl({} as never, "job-9");

      expect(mockQueuePushBulk).toHaveBeenCalledTimes(1);
      const jobs = mockQueuePushBulk.mock.calls[0][0];
      expect(jobs).toHaveLength(1);
      expect(jobs[0]).toEqual({
        name: "issue-tracking-ssl",
        data: { domainId: needsRenewal.id },
      });
    });
  });
});
