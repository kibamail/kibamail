/**
 * Tests for email parser address helpers
 *
 * extractEmailAddress / extractDisplayName are used to render inbox
 * conversations and to attribute messages to senders. Misparsing here
 * shows the wrong address in the UI or stores wrong contact links.
 */

import { describe, expect, test } from "vitest";
import {
  extractDisplayName,
  extractEmailAddress,
  parseEmail,
} from "@/lib/email/parser";

describe("extractEmailAddress", () => {
  test("extracts address from formatted name + bracket form", () => {
    expect(extractEmailAddress("John Doe <john@example.com>")).toBe(
      "john@example.com",
    );
  });

  test("returns input trimmed when only a bare address is given", () => {
    expect(extractEmailAddress("john@example.com")).toBe("john@example.com");
    expect(extractEmailAddress("  john@example.com  ")).toBe(
      "john@example.com",
    );
  });

  test("uses the address inside <> even with no display name", () => {
    expect(extractEmailAddress("<john@example.com>")).toBe("john@example.com");
  });

  test("returns the first <>-wrapped address when multiple are present", () => {
    // The simple regex matches the first <...> block.
    expect(
      extractEmailAddress("first <a@example.com>, second <b@example.com>"),
    ).toBe("a@example.com");
  });
});

describe("extractDisplayName", () => {
  test("returns the display name before <addr>", () => {
    expect(extractDisplayName("John Doe <john@example.com>")).toBe("John Doe");
  });

  test("returns undefined for a bare address", () => {
    expect(extractDisplayName("john@example.com")).toBeUndefined();
  });

  test("strips wrapping double quotes", () => {
    expect(extractDisplayName('"John Doe" <john@example.com>')).toBe(
      "John Doe",
    );
  });

  test("strips wrapping single quotes", () => {
    expect(extractDisplayName("'John Doe' <john@example.com>")).toBe(
      "John Doe",
    );
  });

  test("trims surrounding whitespace from the name", () => {
    expect(extractDisplayName("   John Doe    <john@example.com>")).toBe(
      "John Doe",
    );
  });
});

describe("parseEmail", () => {
  test("parses subject, from, to, body, message-id and date", async () => {
    const raw = [
      "From: Alice <alice@example.com>",
      "To: Bob <bob@example.com>",
      "Subject: Hello",
      "Message-ID: <abc123@example.com>",
      "Date: Wed, 01 Jan 2025 10:00:00 +0000",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Hi Bob, this is the body.",
      "",
    ].join("\r\n");

    const parsed = await parseEmail(raw);

    expect(parsed.subject).toBe("Hello");
    expect(parsed.fromEmail).toBe("alice@example.com");
    expect(parsed.fromName).toBe("Alice");
    expect(parsed.toEmail).toBe("bob@example.com");
    expect(parsed.toName).toBe("Bob");
    expect(parsed.textBody?.trim()).toBe("Hi Bob, this is the body.");
    expect(parsed.messageId).toBe("<abc123@example.com>");
    expect(parsed.date).toBeInstanceOf(Date);
    expect(parsed.attachments).toEqual([]);
  });

  test("falls back to '(No Subject)' when Subject header is missing", async () => {
    const raw = [
      "From: a@example.com",
      "To: b@example.com",
      "",
      "no subject body",
      "",
    ].join("\r\n");

    const parsed = await parseEmail(raw);
    expect(parsed.subject).toBe("(No Subject)");
  });

  test("normalizes References header into a single space-joined string", async () => {
    const raw = [
      "From: a@example.com",
      "To: b@example.com",
      "Subject: Re: thread",
      "In-Reply-To: <one@example.com>",
      "References: <one@example.com> <two@example.com>",
      "",
      "reply body",
      "",
    ].join("\r\n");

    const parsed = await parseEmail(raw);
    expect(parsed.inReplyTo).toBe("<one@example.com>");
    // mailparser may emit either a string or an array depending on count; the
    // util must always produce a single space-joined string.
    expect(typeof parsed.references).toBe("string");
    expect(parsed.references).toContain("<one@example.com>");
    expect(parsed.references).toContain("<two@example.com>");
    if (parsed.references) {
      // No commas, no array brackets in the joined output.
      expect(parsed.references.includes(",")).toBe(false);
    }
  });
});
