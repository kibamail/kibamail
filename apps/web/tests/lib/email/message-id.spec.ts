/**
 * Tests for Email Message-ID Generation
 *
 * Verifies the structure (RFC 5322 Message-ID format) and uniqueness of
 * the message IDs produced by generateMessageIdForDomain. Stable IDs and
 * correct host parts matter for downstream event correlation.
 */

import { describe, expect, it } from "vitest";
import { generateMessageIdForDomain } from "@/lib/email/message-id";

describe("generateMessageIdForDomain", () => {
  it("returns both an id and a messageId", () => {
    const result = generateMessageIdForDomain("example.com");
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("messageId");
    expect(typeof result.id).toBe("string");
    expect(typeof result.messageId).toBe("string");
  });

  it("id starts with the es_ prefix", () => {
    const { id } = generateMessageIdForDomain("example.com");
    expect(id.startsWith("es_")).toBe(true);
  });

  it("id has three underscore-separated segments: es_<timestamp>_<random>", () => {
    const { id } = generateMessageIdForDomain("example.com");
    const parts = id.split("_");
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe("es");
    expect(parts[1].length).toBeGreaterThan(0);
    expect(parts[2]).toMatch(/^[a-f0-9]{24}$/); // 12 bytes hex -> 24 chars
  });

  it("messageId is in RFC 5322 format <id@domain>", () => {
    const domain = "kibamail.com";
    const { id, messageId } = generateMessageIdForDomain(domain);
    expect(messageId).toBe(`<${id}@${domain}>`);
    expect(messageId.startsWith("<")).toBe(true);
    expect(messageId.endsWith(">")).toBe(true);
    expect(messageId).toContain(`@${domain}`);
  });

  it("supports subdomains in the domain field", () => {
    const { messageId } = generateMessageIdForDomain("mail.kibamail.com");
    expect(messageId).toMatch(/@mail\.kibamail\.com>$/);
  });

  it("produces unique ids across consecutive calls", () => {
    const ids = new Set<string>();
    const iterations = 200;
    for (let i = 0; i < iterations; i++) {
      ids.add(generateMessageIdForDomain("example.com").id);
    }
    expect(ids.size).toBe(iterations);
  });

  it("produces unique messageIds across consecutive calls", () => {
    const messageIds = new Set<string>();
    const iterations = 200;
    for (let i = 0; i < iterations; i++) {
      messageIds.add(generateMessageIdForDomain("example.com").messageId);
    }
    expect(messageIds.size).toBe(iterations);
  });

  it("does not include angle brackets in the bare id", () => {
    const { id } = generateMessageIdForDomain("example.com");
    expect(id).not.toContain("<");
    expect(id).not.toContain(">");
    expect(id).not.toContain("@");
  });

  it("uses base36 timestamp encoding (lowercase alphanumeric)", () => {
    const { id } = generateMessageIdForDomain("example.com");
    const timestampPart = id.split("_")[1];
    expect(timestampPart).toMatch(/^[0-9a-z]+$/);
  });

  it("timestamp segment encodes a recent time", () => {
    const before = Date.now();
    const { id } = generateMessageIdForDomain("example.com");
    const after = Date.now();
    const timestampPart = id.split("_")[1];
    const decoded = Number.parseInt(timestampPart, 36);
    // Allow a tiny clock skew window.
    expect(decoded).toBeGreaterThanOrEqual(before - 5);
    expect(decoded).toBeLessThanOrEqual(after + 5);
  });
});
