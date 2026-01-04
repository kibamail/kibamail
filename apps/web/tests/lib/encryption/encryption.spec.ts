/**
 * Tests for Encryption Utilities
 *
 * Tests AES-256-GCM encryption and decryption functionality.
 */

import { describe, expect, test } from "vitest";
import { decrypt, encrypt } from "@/lib/encryption";

const TEST_APP_KEY = "test-app-key-that-is-at-least-32-chars-long";

describe("encryption utilities", () => {
  describe("encrypt", () => {
    test("should encrypt a string and return base64", () => {
      const plaintext = "Hello, World!";
      const encrypted = encrypt(plaintext, TEST_APP_KEY);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
      // Encrypted value should be base64
      expect(() => Buffer.from(encrypted, "base64")).not.toThrow();
    });

    test("should produce different ciphertext for same plaintext (random IV)", () => {
      const plaintext = "Same message";
      const encrypted1 = encrypt(plaintext, TEST_APP_KEY);
      const encrypted2 = encrypt(plaintext, TEST_APP_KEY);

      expect(encrypted1).not.toBe(encrypted2);
    });

    test("should handle empty string", () => {
      const plaintext = "";
      const encrypted = encrypt(plaintext, TEST_APP_KEY);
      const decrypted = decrypt(encrypted, TEST_APP_KEY);

      expect(decrypted).toBe(plaintext);
    });

    test("should handle unicode characters", () => {
      const plaintext = "Hello 世界 🌍 مرحبا";
      const encrypted = encrypt(plaintext, TEST_APP_KEY);
      const decrypted = decrypt(encrypted, TEST_APP_KEY);

      expect(decrypted).toBe(plaintext);
    });

    test("should handle large strings", () => {
      const plaintext = "x".repeat(10000);
      const encrypted = encrypt(plaintext, TEST_APP_KEY);
      const decrypted = decrypt(encrypted, TEST_APP_KEY);

      expect(decrypted).toBe(plaintext);
    });

    test("should handle newlines and special characters", () => {
      const plaintext = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7...
-----END PRIVATE KEY-----`;
      const encrypted = encrypt(plaintext, TEST_APP_KEY);
      const decrypted = decrypt(encrypted, TEST_APP_KEY);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe("decrypt", () => {
    test("should decrypt encrypted text correctly", () => {
      const plaintext = "Secret message";
      const encrypted = encrypt(plaintext, TEST_APP_KEY);
      const decrypted = decrypt(encrypted, TEST_APP_KEY);

      expect(decrypted).toBe(plaintext);
    });

    test("should throw on tampered ciphertext", () => {
      const plaintext = "Secret message";
      const encrypted = encrypt(plaintext, TEST_APP_KEY);

      // Tamper with the ciphertext
      const tamperedData = Buffer.from(encrypted, "base64");
      tamperedData[20] ^= 0xff; // Flip some bits in the auth tag
      const tampered = tamperedData.toString("base64");

      expect(() => decrypt(tampered, TEST_APP_KEY)).toThrow();
    });

    test("should throw with wrong key", () => {
      const plaintext = "Secret message";
      const encrypted = encrypt(plaintext, TEST_APP_KEY);

      expect(() =>
        decrypt(encrypted, "wrong-key-that-is-at-least-32-chars"),
      ).toThrow();
    });

    test("should throw on invalid base64", () => {
      expect(() => decrypt("not-valid-base64!!!", TEST_APP_KEY)).toThrow();
    });

    test("should throw on truncated ciphertext", () => {
      const plaintext = "Secret message";
      const encrypted = encrypt(plaintext, TEST_APP_KEY);
      const truncated = encrypted.slice(0, 20);

      expect(() => decrypt(truncated, TEST_APP_KEY)).toThrow();
    });
  });

  describe("roundtrip", () => {
    test("should handle JSON data", () => {
      const data = {
        certificate:
          "-----BEGIN CERTIFICATE-----\nABC123\n-----END CERTIFICATE-----",
        privateKey:
          "-----BEGIN PRIVATE KEY-----\nXYZ789\n-----END PRIVATE KEY-----",
        issuedAt: "2024-01-01T00:00:00Z",
      };

      const plaintext = JSON.stringify(data);
      const encrypted = encrypt(plaintext, TEST_APP_KEY);
      const decrypted = decrypt(encrypted, TEST_APP_KEY);
      const parsed = JSON.parse(decrypted);

      expect(parsed).toEqual(data);
    });

    test("should handle PEM-formatted certificates", () => {
      const certificate = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiUMA0Gcqgsib3Dw0BAQsFADAyMTAwLgYD
VQQDDCdjYS5raWJhbWFpbC5jb20gKEtpYmFtYWlsIFRlc3QgQ0EpMB4XDTE5MDQw
NTE5NTYxN1oXDTI5MDQwMjE5NTYxN1owMjEwMC4GA1UEAwwnY2Eua2liYW1haWwu
-----END CERTIFICATE-----`;

      const encrypted = encrypt(certificate, TEST_APP_KEY);
      const decrypted = decrypt(encrypted, TEST_APP_KEY);

      expect(decrypted).toBe(certificate);
    });
  });

  describe("key derivation", () => {
    test("should use first 32 chars of key", () => {
      const key1 = "abcdefghijklmnopqrstuvwxyz123456";
      const key2 = "abcdefghijklmnopqrstuvwxyz123456-extra-stuff";

      const plaintext = "Test message";
      const encrypted = encrypt(plaintext, key1);
      const decrypted = decrypt(encrypted, key2);

      expect(decrypted).toBe(plaintext);
    });

    test("should pad short keys", () => {
      const shortKey = "short";
      const plaintext = "Test message";

      const encrypted = encrypt(plaintext, shortKey);
      const decrypted = decrypt(encrypted, shortKey);

      expect(decrypted).toBe(plaintext);
    });
  });
});
