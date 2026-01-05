/**
 * Tests for Internal Retry SSL Endpoint
 *
 * Tests POST /api/internal/v1/domains/:domainId/retry-ssl
 * Used by frontend to retry failed SSL certificate issuance.
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
import {
  cleanupWorkspace,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils";

// Create the mock function using vi.hoisted so it's available for vi.mock
const { mockQueuePush, mockSession } = vi.hoisted(() => ({
  mockQueuePush: vi.fn(),
  mockSession: {
    currentOrganization: { id: "" },
  },
}));

// Mock the queue module to verify SSL job is dispatched
vi.mock("@/lib/queue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queue")>();
  return {
    ...actual,
    queue: () => ({
      push: mockQueuePush,
    }),
  };
});

// Mock the session
vi.mock("@/lib/auth/get-session", () => ({
  getSession: async () => mockSession,
}));

// Mock Next.js revalidatePath to prevent ISR-related errors in tests
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { POST } from "@/app/(main)/api/internal/v1/domains/[domainId]/retry-ssl/route";

let testWorkspace: TestWorkspace;
let testDomainId: string;

function createRequest(domainId: string): NextRequest {
  const url = `http://localhost:3000/api/internal/v1/domains/${domainId}/retry-ssl`;
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
}

async function createTestDomain(options: {
  trackingVerified?: boolean;
  sslStatus?: string | null;
  sslError?: string | null;
}) {
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
      trackingDomainVerifiedAt: options.trackingVerified ? new Date() : null,
      sslIssuanceStatus: options.sslStatus ?? null,
      sslIssuanceError: options.sslError ?? null,
    },
  });
  testDomainId = domain.id;
  return domain;
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  mockSession.currentOrganization = { id: testWorkspace.id };
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

describe("POST /api/internal/v1/domains/:domainId/retry-ssl", () => {
  describe("successful retry", () => {
    test("should queue SSL issuance job when domain has failed status", async () => {
      const domain = await createTestDomain({
        trackingVerified: true,
        sslStatus: "failed",
        sslError: "Previous error",
      });

      const request = createRequest(domain.id);
      const params = Promise.resolve({ domainId: domain.id });

      const response = await POST(request, { params });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.object).toBe("sending_domain");
      expect(body.sslStatus).toBe("pending");
      expect(body.sslError).toBeNull();

      // Verify job was queued
      expect(mockQueuePush).toHaveBeenCalledWith("issue-tracking-ssl", {
        domainId: domain.id,
      });
    });

    test("should update database status to pending", async () => {
      const domain = await createTestDomain({
        trackingVerified: true,
        sslStatus: "failed",
        sslError: "Certificate expired",
      });

      const request = createRequest(domain.id);
      const params = Promise.resolve({ domainId: domain.id });

      await POST(request, { params });

      // Verify database was updated
      const updatedDomain = await prisma.sendingDomain.findUnique({
        where: { id: domain.id },
      });
      expect(updatedDomain?.sslIssuanceStatus).toBe("pending");
      expect(updatedDomain?.sslIssuanceError).toBeNull();
    });

    test("should allow retry when status is completed", async () => {
      const domain = await createTestDomain({
        trackingVerified: true,
        sslStatus: "completed",
      });

      const request = createRequest(domain.id);
      const params = Promise.resolve({ domainId: domain.id });

      const response = await POST(request, { params });

      expect(response.status).toBe(200);
      expect(mockQueuePush).toHaveBeenCalledWith("issue-tracking-ssl", {
        domainId: domain.id,
      });
    });
  });

  describe("validation errors", () => {
    test("should return 400 if tracking DNS is not verified", async () => {
      const domain = await createTestDomain({
        trackingVerified: false,
        sslStatus: "failed",
      });

      const request = createRequest(domain.id);
      const params = Promise.resolve({ domainId: domain.id });

      const response = await POST(request, { params });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeDefined();
      expect(mockQueuePush).not.toHaveBeenCalled();
    });

    test("should return 400 if SSL issuance is already in progress", async () => {
      const domain = await createTestDomain({
        trackingVerified: true,
        sslStatus: "in_progress",
      });

      const request = createRequest(domain.id);
      const params = Promise.resolve({ domainId: domain.id });

      const response = await POST(request, { params });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeDefined();
      expect(mockQueuePush).not.toHaveBeenCalled();
    });

    test("should return 404 for non-existent domain", async () => {
      const request = createRequest("non-existent-id");
      const params = Promise.resolve({ domainId: "non-existent-id" });

      const response = await POST(request, { params });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBeDefined();
    });
  });

  describe("workspace isolation", () => {
    test("should not allow retry for domain in different workspace", async () => {
      // Create domain in a different workspace
      const otherWorkspace = createTestWorkspace();
      const domain = await prisma.sendingDomain.create({
        data: {
          workspaceId: otherWorkspace.id,
          name: `other-${Date.now()}.example.com`,
          dkimSubDomain: "kibamail._domainkey",
          dkimPublicKey: "test-public-key",
          dkimPrivateKey: "test-private-key",
          returnPathSubDomain: "kb",
          returnPathDomainCnameValue: "mail.kbmta.net",
          trackingSubDomain: "e",
          trackingDomainCnameValue: "e.kbmta.net",
          dmarcReportingCode: "abcdefghij",
          trackingDomainVerifiedAt: new Date(),
          sslIssuanceStatus: "failed",
        },
      });

      try {
        const request = createRequest(domain.id);
        const params = Promise.resolve({ domainId: domain.id });

        const response = await POST(request, { params });
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body.error).toBeDefined();
        expect(mockQueuePush).not.toHaveBeenCalled();
      } finally {
        await prisma.sendingDomain.delete({ where: { id: domain.id } });
        await cleanupWorkspace(otherWorkspace.id);
      }
    });
  });

  describe("response format", () => {
    test("should return complete domain information after retry", async () => {
      const domain = await createTestDomain({
        trackingVerified: true,
        sslStatus: "failed",
      });

      const request = createRequest(domain.id);
      const params = Promise.resolve({ domainId: domain.id });

      const response = await POST(request, { params });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        object: "sending_domain",
        id: domain.id,
        sslStatus: "pending",
        sslError: null,
        dkimVerified: false,
        returnPathVerified: false,
        trackingVerified: true,
        dmarcVerified: false,
      });
      expect(body.dnsRecords).toBeDefined();
      expect(body.dnsRecords.dkim).toBeDefined();
      expect(body.dnsRecords.returnPath).toBeDefined();
      expect(body.dnsRecords.tracking).toBeDefined();
      expect(body.dnsRecords.dmarc).toBeDefined();
    });
  });
});
