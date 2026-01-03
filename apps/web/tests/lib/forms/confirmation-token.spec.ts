import { describe, it, expect } from "vitest";
import { generateConfirmationToken } from "@/lib/forms/submission-handlers";

describe("generateConfirmationToken", () => {
  it("should generate a 64-character hex string", () => {
    const token = generateConfirmationToken();

    expect(typeof token).toBe("string");
    expect(token.length).toBe(64);
    // Verify it's a valid hex string
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should generate unique tokens on each call", () => {
    const token1 = generateConfirmationToken();
    const token2 = generateConfirmationToken();
    const token3 = generateConfirmationToken();

    expect(token1).not.toBe(token2);
    expect(token2).not.toBe(token3);
    expect(token1).not.toBe(token3);
  });

  it("should generate cryptographically secure tokens", () => {
    // Generate multiple tokens and ensure they have good entropy
    const tokens = new Set<string>();
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      tokens.add(generateConfirmationToken());
    }

    // All tokens should be unique
    expect(tokens.size).toBe(iterations);
  });
});
