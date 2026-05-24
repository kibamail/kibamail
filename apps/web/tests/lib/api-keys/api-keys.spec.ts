import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";
import { API_KEY_CONFIG } from "@/config/api";
import { generateApiKey, hashApiKey } from "@/lib/api-keys";

describe("generateApiKey", () => {
  test("returns key with configured prefix followed by underscore", () => {
    const { key } = generateApiKey();
    expect(key.startsWith(`${API_KEY_CONFIG.PREFIX}_`)).toBe(true);
  });

  test("random portion is exactly RANDOM_BYTES*2 hex characters", () => {
    const { key } = generateApiKey();
    const randomPart = key.substring(API_KEY_CONFIG.PREFIX.length + 1);
    expect(randomPart).toHaveLength(API_KEY_CONFIG.RANDOM_BYTES * 2);
    expect(randomPart).toMatch(/^[0-9a-f]+$/);
  });

  test("preview reveals only the first 8 chars of the random portion", () => {
    const { key, preview } = generateApiKey();
    const randomPart = key.substring(API_KEY_CONFIG.PREFIX.length + 1);
    expect(preview).toBe(
      `${API_KEY_CONFIG.PREFIX}_${randomPart.substring(0, 8)}...`,
    );
    expect(preview.length).toBeLessThan(key.length);
  });

  test("generates a unique key on each invocation", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 200; i++) {
      keys.add(generateApiKey().key);
    }
    expect(keys.size).toBe(200);
  });

  test("returns matching key/preview pair", () => {
    const { key, preview } = generateApiKey();
    const previewRandom = preview.substring(
      API_KEY_CONFIG.PREFIX.length + 1,
      preview.length - 3,
    );
    expect(key.startsWith(`${API_KEY_CONFIG.PREFIX}_${previewRandom}`)).toBe(
      true,
    );
  });
});

describe("hashApiKey", () => {
  test("returns a 64-character lowercase hex string (SHA-256)", () => {
    const { key } = generateApiKey();
    const hash = hashApiKey(key);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("returns the same hash for identical inputs (deterministic)", () => {
    const { key } = generateApiKey();
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  test("returns different hashes for different inputs", () => {
    const a = generateApiKey().key;
    const b = generateApiKey().key;
    expect(hashApiKey(a)).not.toBe(hashApiKey(b));
  });

  test("matches Node's crypto SHA-256 for the same input", () => {
    const input = "kb_known_value_for_hash_test";
    const expected = createHash("sha256").update(input).digest("hex");
    expect(hashApiKey(input)).toBe(expected);
  });

  test("handles empty string input deterministically", () => {
    const expected = createHash("sha256").update("").digest("hex");
    expect(hashApiKey("")).toBe(expected);
  });
});
