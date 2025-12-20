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
import type { verifyDnsRecords } from "@/lib/sending-domains/dns";
import {
  cleanupWorkspace,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils";

const { mockVerifyDnsRecords, mockQueuePush } = vi.hoisted(() => ({
  mockVerifyDnsRecords: vi.fn<typeof verifyDnsRecords>(),
  mockQueuePush: vi.fn(),
}));

vi.mock("@/lib/sending-domains/dns", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/sending-domains/dns")>();
  return {
    ...actual,
    verifyDnsRecords: mockVerifyDnsRecords,
  };
});

vi.mock("@/lib/queue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queue")>();
  return {
    ...actual,
    queue: () => ({
      push: mockQueuePush,
    }),
  };
});

import { checkVerification } from "@/jobs/sending-domains/check-verification";

let testWorkspace: TestWorkspace;
let testDomainId: string;

async function createTestDomainInDb(
  overrides: Partial<{
    dkimVerifiedAt: Date | null;
    returnPathDomainVerifiedAt: Date | null;
    trackingDomainVerifiedAt: Date | null;
    dmarcVerifiedAt: Date | null;
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
      trackingSubDomain: "e",
      trackingDomainCnameValue: "e.kbmta.net",
      dmarcReportingCode: "abcdefghij",
      dkimVerifiedAt: overrides.dkimVerifiedAt ?? null,
      returnPathDomainVerifiedAt: overrides.returnPathDomainVerifiedAt ?? null,
      trackingDomainVerifiedAt: overrides.trackingDomainVerifiedAt ?? null,
      dmarcVerifiedAt: overrides.dmarcVerifiedAt ?? null,
    },
  });
  testDomainId = domain.id;
  return domain;
}

function unverifiedDnsResult() {
  return {
    dkim: { configured: false, expected: "", found: [] as string[] },
    returnPath: { configured: false, expected: "", found: [] as string[] },
    tracking: { configured: false, expected: "", found: [] as string[] },
    dmarc: { configured: false, expected: "", found: [] as string[] },
    allVerified: false,
  };
}

function verifiedDnsResult() {
  return {
    dkim: { configured: true, expected: "test", found: ["test"] },
    returnPath: { configured: true, expected: "test", found: ["test"] },
    tracking: { configured: true, expected: "test", found: ["test"] },
    dmarc: { configured: true, expected: "test", found: ["test"] },
    allVerified: true,
  };
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyDnsRecords.mockResolvedValue(unverifiedDnsResult());
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

describe("check-verification job", () => {
  test("should skip check if domain is already fully verified", async () => {
    const now = new Date();
    await createTestDomainInDb({
      dkimVerifiedAt: now,
      returnPathDomainVerifiedAt: now,
      trackingDomainVerifiedAt: now,
      dmarcVerifiedAt: now,
    });

    await checkVerification({ domainId: testDomainId, attempt: 1 }, "job-1");

    expect(mockVerifyDnsRecords).not.toHaveBeenCalled();
    expect(mockQueuePush).not.toHaveBeenCalled();
  });

  test("should stop if domain not found", async () => {
    await checkVerification(
      { domainId: "non-existent-id", attempt: 1 },
      "job-2",
    );

    expect(mockVerifyDnsRecords).not.toHaveBeenCalled();
    expect(mockQueuePush).not.toHaveBeenCalled();
  });

  test("should update verification timestamps when records are verified", async () => {
    await createTestDomainInDb();

    mockVerifyDnsRecords.mockResolvedValue({
      ...unverifiedDnsResult(),
      dkim: { configured: true, expected: "test", found: ["test"] },
    });

    await checkVerification({ domainId: testDomainId, attempt: 1 }, "job-3");

    const updatedDomain = await prisma.sendingDomain.findUnique({
      where: { id: testDomainId },
    });

    expect(updatedDomain?.dkimVerifiedAt).not.toBeNull();
    expect(updatedDomain?.returnPathDomainVerifiedAt).toBeNull();
    expect(updatedDomain?.trackingDomainVerifiedAt).toBeNull();
    expect(updatedDomain?.dmarcVerifiedAt).toBeNull();
    expect(updatedDomain?.recordsLastVerifiedAt).not.toBeNull();
  });

  test("should re-dispatch job if not fully verified and under max attempts", async () => {
    await createTestDomainInDb();

    await checkVerification({ domainId: testDomainId, attempt: 1 }, "job-4");

    expect(mockQueuePush).toHaveBeenCalledWith(
      "check-verification",
      { domainId: testDomainId, attempt: 2 },
      { delay: 5 * 60 * 1000 },
    );
  });

  test("should not re-dispatch if fully verified", async () => {
    await createTestDomainInDb();

    mockVerifyDnsRecords.mockResolvedValue(verifiedDnsResult());

    await checkVerification({ domainId: testDomainId, attempt: 1 }, "job-5");

    expect(mockQueuePush).not.toHaveBeenCalled();

    const updatedDomain = await prisma.sendingDomain.findUnique({
      where: { id: testDomainId },
    });

    expect(updatedDomain?.dkimVerifiedAt).not.toBeNull();
    expect(updatedDomain?.returnPathDomainVerifiedAt).not.toBeNull();
    expect(updatedDomain?.trackingDomainVerifiedAt).not.toBeNull();
    expect(updatedDomain?.dmarcVerifiedAt).not.toBeNull();
  });

  test("should stop after max attempts (8)", async () => {
    await createTestDomainInDb();

    await checkVerification({ domainId: testDomainId, attempt: 8 }, "job-6");

    expect(mockVerifyDnsRecords).toHaveBeenCalled();
    expect(mockQueuePush).not.toHaveBeenCalled();
  });

  test("should increment attempt number on re-dispatch", async () => {
    await createTestDomainInDb();

    await checkVerification({ domainId: testDomainId, attempt: 3 }, "job-7");

    expect(mockQueuePush).toHaveBeenCalledWith(
      "check-verification",
      { domainId: testDomainId, attempt: 4 },
      { delay: 5 * 60 * 1000 },
    );
  });

  test("should verify all record types and update accordingly", async () => {
    await createTestDomainInDb();

    mockVerifyDnsRecords.mockResolvedValue({
      ...unverifiedDnsResult(),
      dkim: { configured: true, expected: "test", found: ["test"] },
    });

    await checkVerification({ domainId: testDomainId, attempt: 1 }, "job-8a");

    let domain = await prisma.sendingDomain.findUnique({
      where: { id: testDomainId },
    });
    expect(domain?.dkimVerifiedAt).not.toBeNull();
    expect(domain?.returnPathDomainVerifiedAt).toBeNull();

    mockVerifyDnsRecords.mockResolvedValue({
      ...unverifiedDnsResult(),
      dkim: { configured: true, expected: "test", found: ["test"] },
      returnPath: { configured: true, expected: "test", found: ["test"] },
    });

    await checkVerification({ domainId: testDomainId, attempt: 2 }, "job-8b");

    domain = await prisma.sendingDomain.findUnique({
      where: { id: testDomainId },
    });
    expect(domain?.dkimVerifiedAt).not.toBeNull();
    expect(domain?.returnPathDomainVerifiedAt).not.toBeNull();
    expect(domain?.trackingDomainVerifiedAt).toBeNull();
  });

  test("should not overwrite existing verification timestamps", async () => {
    const existingDate = new Date("2024-01-01");
    await createTestDomainInDb({
      dkimVerifiedAt: existingDate,
    });

    mockVerifyDnsRecords.mockResolvedValue({
      ...unverifiedDnsResult(),
      dkim: { configured: true, expected: "test", found: ["test"] },
    });

    await checkVerification({ domainId: testDomainId, attempt: 1 }, "job-9");

    const domain = await prisma.sendingDomain.findUnique({
      where: { id: testDomainId },
    });

    expect(domain?.dkimVerifiedAt?.toISOString()).toBe(
      existingDate.toISOString(),
    );
  });
});
