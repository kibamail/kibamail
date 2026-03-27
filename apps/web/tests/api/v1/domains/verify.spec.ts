/**
 * Integration tests for Sending Domain DNS Verification (External API)
 *
 * Tests the actual Next.js route handlers for:
 * - POST /api/v1/domains/[domainId]/verify - Verify DNS configuration
 */

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { ErrorCode } from "@/lib/api/error-codes";
import { prisma } from "@/lib/db";
import type { verifyDnsRecords } from "@/lib/sending-domains/dns";
import {
  apiRequest,
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  createTestWorkspace,
  post,
  type TestWorkspace,
} from "@/tests/utils";

// Create the mock function using vi.hoisted so it's available for vi.mock
const { mockVerifyDnsRecords, mockQueuePush } = vi.hoisted(() => ({
  mockVerifyDnsRecords: vi.fn<typeof verifyDnsRecords>(),
  mockQueuePush: vi.fn(),
}));

// Mock the dns module to intercept verifyDnsRecords
vi.mock("@/lib/sending-domains/dns", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/sending-domains/dns")>();
  return {
    ...actual,
    verifyDnsRecords: mockVerifyDnsRecords,
  };
});

// Mock the queue module to verify SSL job is dispatched
vi.mock("@/lib/queue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queue")>();
  return {
    ...actual,
    queue: (_queueName: string) => ({
      push: mockQueuePush,
    }),
  };
});

// Import after mock setup
import { POST as VerifyPOST } from "@/app/(main)/api/v1/domains/[domainId]/verify/route";
import { POST as CreatePOST } from "@/app/(main)/api/v1/domains/route";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

/**
 * Helper to create a test sending domain
 */
async function createTestDomain(apiKey: CreatedApiKey, name: string) {
  const domainData = { name };
  const request = post("/domains", domainData, apiKey.key);
  const response = await CreatePOST(request);
  return await response.json();
}

/**
 * Setup: Create a test workspace and API keys for authentication
 */
beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

/**
 * Reset mocks before each test
 */
beforeEach(() => {
  vi.clearAllMocks();
  // Reset to default - all records unverified
  mockVerifyDnsRecords.mockResolvedValue({
    dkim: { configured: false, expected: "", found: [] },
    returnPath: { configured: false, expected: "", found: [] },
    tracking: { configured: false, expected: "", found: [] },
    dmarc: { configured: false, expected: "", found: [] },
    allVerified: false,
  });
});

/**
 * Cleanup: Delete test data and reset mocks
 */
afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
  vi.restoreAllMocks();
});

describe("POST /api/v1/domains/[domainId]/verify", () => {
  test("should verify domain and return verification status", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "verify-test.example.com",
    );

    const request = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await VerifyPOST(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("sending_domain");
    expect(responseData.id).toBe(createdDomain.id);
    expect(responseData.verification).toBeDefined();
    expect(responseData.verification.dkim).toBeDefined();
    expect(responseData.verification.returnPath).toBeDefined();
    expect(responseData.verification.tracking).toBeDefined();
    expect(responseData.verification.allVerified).toBeDefined();
  });

  test("should mark DKIM as verified when TXT record is correct", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "dkim-verify.example.com",
    );

    const expectedDkimValue = createdDomain.dnsRecords.dkim.value;

    // Mock verifyDnsRecords to return DKIM as verified
    mockVerifyDnsRecords.mockResolvedValue({
      dkim: {
        configured: true,
        expected: expectedDkimValue,
        found: [expectedDkimValue],
      },
      returnPath: { configured: false, expected: "", found: [] },
      tracking: { configured: false, expected: "", found: [] },
      dmarc: { configured: false, expected: "", found: [] },
      allVerified: false,
    });

    const request = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await VerifyPOST(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.dkimVerified).toBe(true);
    expect(responseData.verification.dkim.configured).toBe(true);
    expect(responseData.verification.dkim.found).toContain(expectedDkimValue);
  });

  test("should mark return path as verified when CNAME is correct", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "returnpath-verify.example.com",
    );

    const expectedReturnPathValue = createdDomain.dnsRecords.returnPath.value;

    // Mock verifyDnsRecords to return return path as verified
    mockVerifyDnsRecords.mockResolvedValue({
      dkim: { configured: false, expected: "", found: [] },
      returnPath: {
        configured: true,
        expected: expectedReturnPathValue,
        found: [expectedReturnPathValue],
      },
      tracking: { configured: false, expected: "", found: [] },
      dmarc: { configured: false, expected: "", found: [] },
      allVerified: false,
    });

    const request = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await VerifyPOST(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.returnPathVerified).toBe(true);
    expect(responseData.verification.returnPath.configured).toBe(true);
  });

  test("should mark tracking as verified when CNAME is correct", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "tracking-verify.example.com",
    );

    const expectedTrackingValue = createdDomain.dnsRecords.tracking.value;

    // Mock verifyDnsRecords to return tracking as verified
    mockVerifyDnsRecords.mockResolvedValue({
      dkim: { configured: false, expected: "", found: [] },
      returnPath: { configured: false, expected: "", found: [] },
      tracking: {
        configured: true,
        expected: expectedTrackingValue,
        found: [expectedTrackingValue],
      },
      dmarc: { configured: false, expected: "", found: [] },
      allVerified: false,
    });

    const request = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await VerifyPOST(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.trackingVerified).toBe(true);
    expect(responseData.verification.tracking.configured).toBe(true);
  });

  test("should mark all records verified when all DNS is correct", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "all-verify.example.com",
    );

    const expectedDkimValue = createdDomain.dnsRecords.dkim.value;
    const expectedReturnPathValue = createdDomain.dnsRecords.returnPath.value;
    const expectedTrackingValue = createdDomain.dnsRecords.tracking.value;

    // Mock verifyDnsRecords to return all verified
    mockVerifyDnsRecords.mockResolvedValue({
      dkim: {
        configured: true,
        expected: expectedDkimValue,
        found: [expectedDkimValue],
      },
      returnPath: {
        configured: true,
        expected: expectedReturnPathValue,
        found: [expectedReturnPathValue],
      },
      tracking: {
        configured: true,
        expected: expectedTrackingValue,
        found: [expectedTrackingValue],
      },
      dmarc: { configured: true, expected: "", found: [] },
      allVerified: true,
    });

    const request = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await VerifyPOST(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.dkimVerified).toBe(true);
    expect(responseData.returnPathVerified).toBe(true);
    expect(responseData.trackingVerified).toBe(true);
    expect(responseData.verification.allVerified).toBe(true);
  });

  test("should not re-verify already verified records", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "no-reverify.example.com",
    );

    const expectedDkimValue = createdDomain.dnsRecords.dkim.value;

    // First verification - DKIM verified
    mockVerifyDnsRecords.mockResolvedValue({
      dkim: {
        configured: true,
        expected: expectedDkimValue,
        found: [expectedDkimValue],
      },
      returnPath: { configured: false, expected: "", found: [] },
      tracking: { configured: false, expected: "", found: [] },
      dmarc: { configured: false, expected: "", found: [] },
      allVerified: false,
    });

    const request1 = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const response1 = await VerifyPOST(request1, {
      params: Promise.resolve({ domainId: createdDomain.id }),
    });
    const data1 = await response1.json();
    expect(data1.dkimVerified).toBe(true);

    // Second verification - DNS now returns nothing, but dkimVerified should still be true
    mockVerifyDnsRecords.mockResolvedValue({
      dkim: { configured: false, expected: expectedDkimValue, found: [] },
      returnPath: { configured: false, expected: "", found: [] },
      tracking: { configured: false, expected: "", found: [] },
      dmarc: { configured: false, expected: "", found: [] },
      allVerified: false,
    });

    const request2 = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const response2 = await VerifyPOST(request2, {
      params: Promise.resolve({ domainId: createdDomain.id }),
    });
    const data2 = await response2.json();

    // dkimVerified should still be true since it was already verified
    expect(data2.dkimVerified).toBe(true);
    // But verification.dkim.configured should be false since DNS no longer has the record
    expect(data2.verification.dkim.configured).toBe(false);
  });

  test("should return expected values for unverified records", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "unverified.example.com",
    );

    const expectedDkimValue = createdDomain.dnsRecords.dkim.value;

    mockVerifyDnsRecords.mockResolvedValue({
      dkim: { configured: false, expected: expectedDkimValue, found: [] },
      returnPath: { configured: false, expected: "", found: [] },
      tracking: { configured: false, expected: "", found: [] },
      dmarc: { configured: false, expected: "", found: [] },
      allVerified: false,
    });

    const request = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await VerifyPOST(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.verification.dkim.configured).toBe(false);
    expect(responseData.verification.dkim.expected).toBe(expectedDkimValue);
    expect(responseData.verification.dkim.found).toEqual([]);
    expect(responseData.verification.returnPath.configured).toBe(false);
    expect(responseData.verification.tracking.configured).toBe(false);
    expect(responseData.verification.dmarc.configured).toBe(false);
    expect(responseData.verification.allVerified).toBe(false);
  });

  test("should return 404 for non-existent domain", async () => {
    const request = apiRequest("/domains/non_existent_id/verify")
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const params = Promise.resolve({ domainId: "non_existent_id" });

    const response = await VerifyPOST(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.SENDING_DOMAIN_NOT_FOUND);
  });

  test("should reject request without update:domains scope", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "scope-verify.example.com",
    );
    const readOnlyApiKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:domains"],
    });

    const request = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(readOnlyApiKey.key)
      .build();
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await VerifyPOST(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });

  test("should not verify domain from different workspace", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "workspace-verify.example.com",
    );

    // Create different workspace
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const request = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(otherApiKey.key)
      .build();
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await VerifyPOST(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.code).toBe(ErrorCode.SENDING_DOMAIN_NOT_FOUND);

    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should handle DNS resolution errors gracefully", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "dns-error.example.com",
    );

    // Mock verifyDnsRecords to return all unverified (simulating error handling)
    mockVerifyDnsRecords.mockResolvedValue({
      dkim: { configured: false, expected: "", found: [] },
      returnPath: { configured: false, expected: "", found: [] },
      tracking: { configured: false, expected: "", found: [] },
      dmarc: { configured: false, expected: "", found: [] },
      allVerified: false,
    });

    const request = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await VerifyPOST(request, { params });
    const responseData = await response.json();

    // Should handle errors gracefully and return unverified status
    expect(response.status).toBe(200);
    expect(responseData.verification.dkim.configured).toBe(false);
    expect(responseData.verification.returnPath.configured).toBe(false);
    expect(responseData.verification.tracking.configured).toBe(false);
  });

  test("should queue SSL certificate issuance when tracking domain is newly verified", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "ssl-trigger.example.com",
    );

    const expectedTrackingValue = createdDomain.dnsRecords.tracking.value;

    // Mock verifyDnsRecords to return tracking as verified
    mockVerifyDnsRecords.mockResolvedValue({
      dkim: { configured: false, expected: "", found: [] },
      returnPath: { configured: false, expected: "", found: [] },
      tracking: {
        configured: true,
        expected: expectedTrackingValue,
        found: [expectedTrackingValue],
      },
      dmarc: { configured: false, expected: "", found: [] },
      allVerified: false,
    });

    // Clear any previous calls from domain creation
    mockQueuePush.mockClear();

    const request = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await VerifyPOST(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.trackingVerified).toBe(true);

    // Verify SSL issuance job was queued
    expect(mockQueuePush).toHaveBeenCalledWith("issue-tracking-ssl", {
      domainId: createdDomain.id,
    });
  });

  test("should not queue SSL certificate issuance when SSL is already in progress", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "ssl-in-progress.example.com",
    );

    const expectedTrackingValue = createdDomain.dnsRecords.tracking.value;

    // First verification - tracking becomes verified, SSL queued
    mockVerifyDnsRecords.mockResolvedValue({
      dkim: { configured: false, expected: "", found: [] },
      returnPath: { configured: false, expected: "", found: [] },
      tracking: {
        configured: true,
        expected: expectedTrackingValue,
        found: [expectedTrackingValue],
      },
      dmarc: { configured: false, expected: "", found: [] },
      allVerified: false,
    });

    const request1 = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    await VerifyPOST(request1, {
      params: Promise.resolve({ domainId: createdDomain.id }),
    });

    // Simulate SSL job starting - set status to in_progress
    await prisma.sendingDomain.update({
      where: { id: createdDomain.id },
      data: { sslIssuanceStatus: "in_progress" },
    });

    // Clear calls after first verification
    mockQueuePush.mockClear();

    // Second verification - SSL is in progress, should not re-queue
    const request2 = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const response2 = await VerifyPOST(request2, {
      params: Promise.resolve({ domainId: createdDomain.id }),
    });
    const data2 = await response2.json();

    expect(response2.status).toBe(200);
    expect(data2.trackingVerified).toBe(true);

    // SSL issuance should NOT be queued when already in progress
    expect(mockQueuePush).not.toHaveBeenCalledWith("issue-tracking-ssl", {
      domainId: createdDomain.id,
    });
  });

  test("should not queue SSL certificate issuance when SSL is already completed", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "ssl-completed.example.com",
    );

    const expectedTrackingValue = createdDomain.dnsRecords.tracking.value;

    // Set tracking as verified and SSL as completed
    await prisma.sendingDomain.update({
      where: { id: createdDomain.id },
      data: {
        trackingDomainVerifiedAt: new Date(),
        sslIssuanceStatus: "completed",
      },
    });

    mockVerifyDnsRecords.mockResolvedValue({
      dkim: { configured: false, expected: "", found: [] },
      returnPath: { configured: false, expected: "", found: [] },
      tracking: {
        configured: true,
        expected: expectedTrackingValue,
        found: [expectedTrackingValue],
      },
      dmarc: { configured: false, expected: "", found: [] },
      allVerified: false,
    });

    mockQueuePush.mockClear();

    const request = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const response = await VerifyPOST(request, {
      params: Promise.resolve({ domainId: createdDomain.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.trackingVerified).toBe(true);

    // SSL issuance should NOT be queued when already completed
    expect(mockQueuePush).not.toHaveBeenCalledWith("issue-tracking-ssl", {
      domainId: createdDomain.id,
    });
  });

  test("should queue SSL certificate issuance when SSL previously failed", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "ssl-retry-failed.example.com",
    );

    const expectedTrackingValue = createdDomain.dnsRecords.tracking.value;

    // Set tracking as verified but SSL as failed
    await prisma.sendingDomain.update({
      where: { id: createdDomain.id },
      data: {
        trackingDomainVerifiedAt: new Date(),
        sslIssuanceStatus: "failed",
        sslIssuanceError: "Previous failure",
      },
    });

    mockVerifyDnsRecords.mockResolvedValue({
      dkim: { configured: false, expected: "", found: [] },
      returnPath: { configured: false, expected: "", found: [] },
      tracking: {
        configured: true,
        expected: expectedTrackingValue,
        found: [expectedTrackingValue],
      },
      dmarc: { configured: false, expected: "", found: [] },
      allVerified: false,
    });

    mockQueuePush.mockClear();

    const request = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const response = await VerifyPOST(request, {
      params: Promise.resolve({ domainId: createdDomain.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.trackingVerified).toBe(true);

    // SSL issuance SHOULD be queued when previous attempt failed
    expect(mockQueuePush).toHaveBeenCalledWith("issue-tracking-ssl", {
      domainId: createdDomain.id,
    });
  });

  test("should not queue SSL certificate issuance when tracking domain is not verified", async () => {
    const createdDomain = await createTestDomain(
      fullAccessApiKey,
      "ssl-not-verified.example.com",
    );

    // Mock verifyDnsRecords to return tracking as NOT verified
    mockVerifyDnsRecords.mockResolvedValue({
      dkim: { configured: false, expected: "", found: [] },
      returnPath: { configured: false, expected: "", found: [] },
      tracking: { configured: false, expected: "", found: [] },
      dmarc: { configured: false, expected: "", found: [] },
      allVerified: false,
    });

    // Clear any previous calls from domain creation
    mockQueuePush.mockClear();

    const request = apiRequest(`/domains/${createdDomain.id}/verify`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const params = Promise.resolve({ domainId: createdDomain.id });

    const response = await VerifyPOST(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.trackingVerified).toBe(false);

    // SSL issuance should NOT be queued
    expect(mockQueuePush).not.toHaveBeenCalledWith("issue-tracking-ssl", {
      domainId: createdDomain.id,
    });
  });
});
