/**
 * Tests for DKIM key pair generation and private-key encryption
 *
 * DKIM private keys are stored encrypted at rest. A regression in the key
 * generation, PEM cleanup, or AES-GCM encryption round-trip would either
 * break email signing or — worse — silently store keys that can't be
 * decrypted to actually sign outgoing mail.
 */

import { describe, expect, test } from "vitest";
import {
  decrypt,
  generateDkimKeyPair,
  generateDkimSubdomain,
} from "@/lib/sending-domains/dkim";

const TEST_APP_KEY = "dkim-test-app-key-that-is-32+chars-long";

describe("generateDkimSubdomain", () => {
  test("returns the canonical DKIM selector subdomain", () => {
    expect(generateDkimSubdomain()).toBe("kibamail._domainkey");
  });
});

describe("generateDkimKeyPair", () => {
  test("returns valid PEM-formatted public and private keys", () => {
    const pair = generateDkimKeyPair(TEST_APP_KEY);

    expect(pair.publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----/);
    expect(pair.publicKey.trim()).toMatch(/-----END PUBLIC KEY-----$/);

    expect(pair.privateKey).toMatch(/^-----BEGIN PRIVATE KEY-----/);
    expect(pair.privateKey.trim()).toMatch(/-----END PRIVATE KEY-----$/);
  });

  test("cleaned keys strip PEM headers, footers, and newlines", () => {
    const pair = generateDkimKeyPair(TEST_APP_KEY);

    expect(pair.cleaned.publicKey).not.toContain("-----BEGIN");
    expect(pair.cleaned.publicKey).not.toContain("-----END");
    expect(pair.cleaned.publicKey).not.toContain("\n");
    expect(pair.cleaned.publicKey.length).toBeGreaterThan(0);

    expect(pair.cleaned.privateKey).not.toContain("-----BEGIN");
    expect(pair.cleaned.privateKey).not.toContain("-----END");
    expect(pair.cleaned.privateKey).not.toContain("\n");
    expect(pair.cleaned.privateKey.length).toBeGreaterThan(0);
  });

  test("encrypted private key round-trips back to the raw private key", () => {
    const pair = generateDkimKeyPair(TEST_APP_KEY);

    const decrypted = decrypt(pair.encrypted.privateKey, TEST_APP_KEY);

    expect(decrypted).toBe(pair.privateKey);
  });

  test("encrypted private key is not stored in plaintext or base64-of-plaintext", () => {
    const pair = generateDkimKeyPair(TEST_APP_KEY);

    expect(pair.encrypted.privateKey).not.toContain("BEGIN PRIVATE KEY");
    expect(
      Buffer.from(pair.encrypted.privateKey, "base64").toString("utf8"),
    ).not.toContain("BEGIN PRIVATE KEY");
  });

  test("decrypt throws when given the wrong app key", () => {
    const pair = generateDkimKeyPair(TEST_APP_KEY);

    expect(() =>
      decrypt(pair.encrypted.privateKey, "wrong-key-also-32+chars-long-xxxx"),
    ).toThrow();
  });

  test("each invocation produces a fresh key pair", () => {
    const a = generateDkimKeyPair(TEST_APP_KEY);
    const b = generateDkimKeyPair(TEST_APP_KEY);

    expect(a.publicKey).not.toBe(b.publicKey);
    expect(a.privateKey).not.toBe(b.privateKey);
    // Random IV per encryption ⇒ ciphertexts must differ even with identical keys.
    expect(a.encrypted.privateKey).not.toBe(b.encrypted.privateKey);
  });
});

describe("decrypt", () => {
  test("throws on tampered ciphertext (auth-tag failure)", () => {
    const pair = generateDkimKeyPair(TEST_APP_KEY);

    const tampered = Buffer.from(pair.encrypted.privateKey, "base64");
    // Flip a bit in the auth-tag region (bytes 16..32).
    tampered[20] ^= 0xff;

    expect(() => decrypt(tampered.toString("base64"), TEST_APP_KEY)).toThrow();
  });

  test("throws on truncated ciphertext", () => {
    const pair = generateDkimKeyPair(TEST_APP_KEY);
    const truncated = pair.encrypted.privateKey.slice(0, 16);

    expect(() => decrypt(truncated, TEST_APP_KEY)).toThrow();
  });
});
