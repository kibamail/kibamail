/**
 * Tests for ACME Certificate Tool
 *
 * Tests Let's Encrypt certificate provisioning functionality.
 * Uses mocked acme-client to avoid real ACME interactions.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Use vi.hoisted to ensure mocks are available before module loading
const { mockClientInstance, mockForge } = vi.hoisted(() => {
  const mockClientInstance = {
    auto: vi.fn(),
  };

  const mockForge = {
    createCsr: vi.fn(),
  };

  return { mockClientInstance, mockForge };
});

vi.mock("acme-client", () => {
  // Create a proper class mock that can be instantiated
  class MockClient {
    auto = mockClientInstance.auto;
  }

  return {
    Client: MockClient,
    forge: mockForge,
  };
});

// Alias for cleaner test code
const mockClient = mockClientInstance;

import { AcmeCertificateTool, createAcmeTool } from "@/lib/ssl/acme";

describe("AcmeCertificateTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("forDomain", () => {
    test("should set domain and return self for chaining", () => {
      const tool = createAcmeTool();
      const result = tool.forDomain("example.com");

      expect(result).toBe(tool);
    });
  });

  describe("setAccountKey", () => {
    test("should set account key from Buffer and return self", () => {
      const tool = createAcmeTool();
      const accountKey = Buffer.from("test-key");
      const result = tool.setAccountKey(accountKey);

      expect(result).toBe(tool);
    });

    test("should set account key from string and return self", () => {
      const tool = createAcmeTool();
      const result = tool.setAccountKey("test-key-string");

      expect(result).toBe(tool);
    });
  });

  describe("client", () => {
    test("should throw if account key not set", () => {
      const tool = createAcmeTool();

      expect(() => tool.client()).toThrow(
        "Account key not set. Call setAccountKey() first."
      );
    });

    test("should return ACME client when account key is set", () => {
      const tool = createAcmeTool();
      tool.setAccountKey(Buffer.from("test-key"));

      const client = tool.client();

      expect(client).toBeDefined();
    });
  });

  describe("createCsr", () => {
    test("should throw if domain not set", async () => {
      const tool = createAcmeTool();

      await expect(tool.createCsr()).rejects.toThrow(
        "Domain not set. Call forDomain() first."
      );
    });

    test("should create CSR for the domain", async () => {
      const privateKey = Buffer.from("private-key");
      const csr = Buffer.from("csr-data");
      mockForge.createCsr.mockResolvedValue([privateKey, csr]);

      const tool = createAcmeTool().forDomain("e.example.com");
      const result = await tool.createCsr();

      expect(mockForge.createCsr).toHaveBeenCalledWith({
        commonName: "e.example.com",
      });
      expect(result).toEqual([privateKey, csr]);
    });
  });

  describe("issueCertificate", () => {
    test("should throw if domain not set", async () => {
      const tool = createAcmeTool().setAccountKey(Buffer.from("key"));

      await expect(
        tool.issueCertificate(
          async () => {},
          async () => {}
        )
      ).rejects.toThrow("Domain not set. Call forDomain() first.");
    });

    test("should throw if account key not set", async () => {
      const tool = createAcmeTool().forDomain("example.com");

      await expect(
        tool.issueCertificate(
          async () => {},
          async () => {}
        )
      ).rejects.toThrow("Account key not set. Call setAccountKey() first.");
    });

    test("should issue certificate using ACME auto flow", async () => {
      const privateKey = Buffer.from("domain-private-key");
      const csr = Buffer.from("domain-csr");
      const certificate =
        "-----BEGIN CERTIFICATE-----\nABC123\n-----END CERTIFICATE-----";

      mockForge.createCsr.mockResolvedValue([privateKey, csr]);
      mockClient.auto.mockResolvedValue(certificate);

      const onChallengeCreate = vi.fn();
      const onChallengeRemove = vi.fn();

      const tool = createAcmeTool()
        .forDomain("e.example.com")
        .setAccountKey(Buffer.from("account-key"));

      const result = await tool.issueCertificate(
        onChallengeCreate,
        onChallengeRemove
      );

      expect(result.certificate).toBe(certificate);
      expect(result.privateKey).toEqual(privateKey);
      expect(mockClient.auto).toHaveBeenCalledWith({
        csr,
        termsOfServiceAgreed: true,
        skipChallengeVerification: true,
        email: expect.any(String),
        challengeCreateFn: expect.any(Function),
        challengeRemoveFn: expect.any(Function),
      });
    });

    test("should call challenge callbacks during certificate issuance", async () => {
      const privateKey = Buffer.from("domain-private-key");
      const csr = Buffer.from("domain-csr");
      const certificate =
        "-----BEGIN CERTIFICATE-----\nABC123\n-----END CERTIFICATE-----";

      mockForge.createCsr.mockResolvedValue([privateKey, csr]);

      mockClient.auto.mockImplementation(
        async (opts: {
          challengeCreateFn: (
            authz: { identifier: { value: string } },
            challenge: { token: string; type: string },
            keyAuth: string
          ) => Promise<void>;
          challengeRemoveFn: (
            authz: { identifier: { value: string } },
            challenge: { token: string; type: string },
            keyAuth: string
          ) => Promise<void>;
        }) => {
          // Simulate ACME calling the challenge functions
          const authz = { identifier: { value: "e.example.com" } };
          const challenge = { token: "challenge-token-123", type: "http-01" };
          const keyAuth = "challenge-token-123.thumbprint";

          await opts.challengeCreateFn(authz, challenge, keyAuth);
          await opts.challengeRemoveFn(authz, challenge, keyAuth);

          return certificate;
        }
      );

      const onChallengeCreate = vi.fn();
      const onChallengeRemove = vi.fn();

      const tool = createAcmeTool()
        .forDomain("e.example.com")
        .setAccountKey(Buffer.from("account-key"));

      await tool.issueCertificate(onChallengeCreate, onChallengeRemove);

      expect(onChallengeCreate).toHaveBeenCalledWith(
        "challenge-token-123",
        "challenge-token-123.thumbprint"
      );
      expect(onChallengeRemove).toHaveBeenCalledWith("challenge-token-123");
    });

    test("should propagate errors from ACME client", async () => {
      const privateKey = Buffer.from("domain-private-key");
      const csr = Buffer.from("domain-csr");

      mockForge.createCsr.mockResolvedValue([privateKey, csr]);
      mockClient.auto.mockRejectedValue(new Error("ACME authorization failed"));

      const tool = createAcmeTool()
        .forDomain("e.example.com")
        .setAccountKey(Buffer.from("account-key"));

      await expect(
        tool.issueCertificate(
          async () => {},
          async () => {}
        )
      ).rejects.toThrow("ACME authorization failed");
    });
  });

  describe("createAcmeTool", () => {
    test("should create a new AcmeCertificateTool instance", () => {
      const tool = createAcmeTool();

      expect(tool).toBeInstanceOf(AcmeCertificateTool);
    });
  });
});
