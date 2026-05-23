/**
 * Tests for Email Parser
 *
 * Verifies RFC822 parsing for inbound messages: header extraction,
 * address parsing, attachment classification (inline vs regular), and
 * the small helpers used elsewhere for splitting "Name <addr>" headers.
 *
 * Inbox feature relies on these parsing primitives — bad parsing leaks
 * raw RFC822 strings into conversation records.
 */

import { describe, expect, it } from "vitest";
import {
  extractDisplayName,
  extractEmailAddress,
  parseEmail,
} from "@/lib/email/parser";

const buildEmail = (overrides: Partial<Record<string, string>> = {}): string => {
  const headers: Record<string, string> = {
    From: '"Jane Sender" <jane@sender.example>',
    To: '"John Recipient" <john@recipient.example>',
    Subject: "Hello there",
    Date: "Tue, 12 Mar 2024 10:00:00 +0000",
    "Message-ID": "<unique-msg-1@sender.example>",
    "Content-Type": "text/plain; charset=utf-8",
    ...overrides,
  };
  const headerLines = Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\r\n");
  return `${headerLines}\r\n\r\nThis is the plain-text body.\r\n`;
};

describe("parseEmail", () => {
  it("extracts subject and addresses from a basic email", async () => {
    const result = await parseEmail(buildEmail());
    expect(result.subject).toBe("Hello there");
    expect(result.fromEmail).toBe("jane@sender.example");
    expect(result.fromName).toBe("Jane Sender");
    expect(result.toEmail).toBe("john@recipient.example");
    expect(result.toName).toBe("John Recipient");
  });

  it("extracts plain text body", async () => {
    const result = await parseEmail(buildEmail());
    expect(result.textBody).toContain("This is the plain-text body.");
  });

  it("extracts Message-ID header", async () => {
    const result = await parseEmail(buildEmail());
    expect(result.messageId).toBe("<unique-msg-1@sender.example>");
  });

  it("extracts Date header as a Date instance", async () => {
    const result = await parseEmail(buildEmail());
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date?.getUTCFullYear()).toBe(2024);
  });

  it("falls back to (No Subject) when subject header is missing", async () => {
    const raw = buildEmail();
    const noSubject = raw.replace(/Subject: .*\r\n/, "");
    const result = await parseEmail(noSubject);
    expect(result.subject).toBe("(No Subject)");
  });

  it("returns empty strings for missing from/to addresses", async () => {
    const raw = [
      "Subject: ghost",
      "Date: Tue, 12 Mar 2024 10:00:00 +0000",
      "",
      "body",
      "",
    ].join("\r\n");
    const result = await parseEmail(raw);
    expect(result.fromEmail).toBe("");
    expect(result.toEmail).toBe("");
  });

  it("parses In-Reply-To and References headers", async () => {
    const raw = buildEmail({
      "In-Reply-To": "<original@sender.example>",
      References: "<thread-root@sender.example> <prev@sender.example>",
    });
    const result = await parseEmail(raw);
    expect(result.inReplyTo).toBe("<original@sender.example>");
    expect(result.references).toContain("<thread-root@sender.example>");
    expect(result.references).toContain("<prev@sender.example>");
  });

  it("joins references into a single space-separated string", async () => {
    const raw = buildEmail({
      References: "<a@x.example> <b@x.example> <c@x.example>",
    });
    const result = await parseEmail(raw);
    expect(typeof result.references).toBe("string");
    expect(result.references?.split(/\s+/)).toHaveLength(3);
  });

  it("returns empty attachments array when there are none", async () => {
    const result = await parseEmail(buildEmail());
    expect(Array.isArray(result.attachments)).toBe(true);
    expect(result.attachments).toHaveLength(0);
  });

  it("parses MIME multipart with HTML body and an attachment", async () => {
    const boundary = "BOUNDARY42";
    const attachmentBytes = Buffer.from("hello-bytes").toString("base64");
    const raw = [
      'From: "Jane" <jane@sender.example>',
      'To: "John" <john@recipient.example>',
      "Subject: With attachment",
      "Date: Tue, 12 Mar 2024 10:00:00 +0000",
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      "<p>Hi <strong>there</strong></p>",
      "",
      `--${boundary}`,
      'Content-Type: text/plain; name="note.txt"',
      "Content-Transfer-Encoding: base64",
      'Content-Disposition: attachment; filename="note.txt"',
      "",
      attachmentBytes,
      "",
      `--${boundary}--`,
      "",
    ].join("\r\n");

    const result = await parseEmail(raw);
    expect(result.htmlBody).toContain("<strong>there</strong>");
    expect(result.attachments).toHaveLength(1);
    const att = result.attachments[0];
    expect(att.filename).toBe("note.txt");
    expect(att.isInline).toBe(false);
    expect(att.contentType).toBe("text/plain");
    expect(att.content.toString()).toBe("hello-bytes");
    expect(att.size).toBeGreaterThan(0);
  });

  it("marks inline attachments with isInline=true and strips Content-ID brackets", async () => {
    const boundary = "INLINE99";
    const attachmentBytes = Buffer.from("png-bytes").toString("base64");
    const raw = [
      'From: "Jane" <jane@sender.example>',
      'To: "John" <john@recipient.example>',
      "Subject: Inline image",
      "Date: Tue, 12 Mar 2024 10:00:00 +0000",
      "MIME-Version: 1.0",
      `Content-Type: multipart/related; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      '<p><img src="cid:logo123" /></p>',
      "",
      `--${boundary}`,
      'Content-Type: image/png; name="logo.png"',
      "Content-Transfer-Encoding: base64",
      'Content-Disposition: inline; filename="logo.png"',
      "Content-ID: <logo123>",
      "",
      attachmentBytes,
      "",
      `--${boundary}--`,
      "",
    ].join("\r\n");

    const result = await parseEmail(raw);
    expect(result.attachments).toHaveLength(1);
    const att = result.attachments[0];
    expect(att.isInline).toBe(true);
    expect(att.contentId).toBe("logo123");
    expect(att.contentType).toBe("image/png");
  });

  it("uses 'unnamed' as filename when attachment has no filename", async () => {
    const boundary = "NOFILE1";
    const raw = [
      'From: "Jane" <jane@sender.example>',
      'To: "John" <john@recipient.example>',
      "Subject: No filename",
      "Date: Tue, 12 Mar 2024 10:00:00 +0000",
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain",
      "",
      "Body text",
      "",
      `--${boundary}`,
      "Content-Type: application/octet-stream",
      "Content-Transfer-Encoding: base64",
      "Content-Disposition: attachment",
      "",
      Buffer.from("opaque").toString("base64"),
      "",
      `--${boundary}--`,
      "",
    ].join("\r\n");

    const result = await parseEmail(raw);
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].filename).toBe("unnamed");
  });

  it("accepts a Buffer input as well as a string", async () => {
    const result = await parseEmail(Buffer.from(buildEmail()));
    expect(result.fromEmail).toBe("jane@sender.example");
  });
});

describe("extractEmailAddress", () => {
  it("extracts the address from a Name <addr> string", () => {
    expect(extractEmailAddress('"John Doe" <john@example.com>')).toBe(
      "john@example.com",
    );
  });

  it("extracts the address from an unquoted Name <addr> string", () => {
    expect(extractEmailAddress("John Doe <john@example.com>")).toBe(
      "john@example.com",
    );
  });

  it("returns a bare address unchanged", () => {
    expect(extractEmailAddress("john@example.com")).toBe("john@example.com");
  });

  it("trims surrounding whitespace from a bare address", () => {
    expect(extractEmailAddress("  john@example.com  ")).toBe(
      "john@example.com",
    );
  });

  it("handles addresses with plus-tags", () => {
    expect(extractEmailAddress("Jane <jane+filter@example.com>")).toBe(
      "jane+filter@example.com",
    );
  });
});

describe("extractDisplayName", () => {
  it("extracts the display name from Name <addr>", () => {
    expect(extractDisplayName("John Doe <john@example.com>")).toBe("John Doe");
  });

  it("strips surrounding double quotes around the display name", () => {
    expect(extractDisplayName('"John Doe" <john@example.com>')).toBe(
      "John Doe",
    );
  });

  it("strips surrounding single quotes around the display name", () => {
    expect(extractDisplayName("'John Doe' <john@example.com>")).toBe(
      "John Doe",
    );
  });

  it("returns undefined when only a bare address is given", () => {
    expect(extractDisplayName("john@example.com")).toBeUndefined();
  });

  it("trims whitespace from the display name", () => {
    expect(extractDisplayName("   John Doe    <john@example.com>")).toBe(
      "John Doe",
    );
  });
});
