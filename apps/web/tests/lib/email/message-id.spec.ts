/**
 * Tests for Message-ID generation
 *
 * Message-IDs are the primary key for email-event correlation: bounces,
 * complaints, opens, and clicks all reference back to this ID. Two emails
 * sharing an ID would silently merge their event streams.
 */

import { describe, expect, test } from "vitest";
import { generateMessageIdForDomain } from "@/lib/email/message-id";

describe("generateMessageIdForDomain", () => {
  test("returns an internal id and an RFC-5322 Message-ID header value", () => {
    const { id, messageId } = generateMessageIdForDomain("example.com");

    // Internal tracking id
    expect(id).toMatch(/^es_[0-9a-z]+_[0-9a-f]{24}$/);

    // RFC-5322 Message-ID: <unique-id@domain>
    expect(messageId).toBe(`<${id}@example.com>`);
    expect(messageId.startsWith("<")).toBe(true);
    expect(messageId.endsWith(">")).toBe(true);
  });

  test("embeds the domain verbatim in the Message-ID", () => {
    const { messageId } = generateMessageIdForDomain("mail.tenant.kibamail.io");

    expect(messageId.endsWith("@mail.tenant.kibamail.io>")).toBe(true);
  });

  test("produces unique ids across many invocations for the same domain", () => {
    const ids = new Set<string>();
    const messageIds = new Set<string>();

    for (let i = 0; i < 1000; i++) {
      const { id, messageId } = generateMessageIdForDomain("example.com");
      ids.add(id);
      messageIds.add(messageId);
    }

    // 24 hex chars of randomness (12 bytes) ⇒ no collisions in 1k draws.
    expect(ids.size).toBe(1000);
    expect(messageIds.size).toBe(1000);
  });

  test("random suffix is exactly 12 bytes (24 hex chars)", () => {
    const { id } = generateMessageIdForDomain("example.com");
    const random = id.split("_")[2];

    expect(random).toHaveLength(24);
    expect(random).toMatch(/^[0-9a-f]+$/);
  });
});
