/**
 * Tests for DNS record generation utilities
 *
 * These functions produce the exact DNS record values customers must publish
 * for mail authentication and inbox routing. Subtle changes (e.g. dropped PEM
 * cleanup, wrong subdomain shape, missing DMARC) silently break customer
 * deliverability without raising any error in production.
 */

import { describe, expect, test } from "vitest";
import {
  DNS_CONFIG,
  getDnsRecords,
  getInboxMxRecord,
} from "@/lib/sending-domains/dns";

// Matches Node's crypto PEM output shape: leading BEGIN line, body lines,
// trailing END line, and a final newline. The cleanup function relies on
// that trailing newline to drop the END marker correctly.
const RAW_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxxxxxxxxxxxxxxxxxxxx
yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
-----END PUBLIC KEY-----
`;

const CLEANED_PUBLIC_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxxxxxxxxxxxxxxxxxxxxyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy";

describe("getDnsRecords", () => {
  test("strips PEM headers from the DKIM public key when present", () => {
    const records = getDnsRecords(
      "example.com",
      "kibamail._domainkey",
      RAW_PUBLIC_KEY,
      "kb",
      "e",
      "abcdefghij",
    );

    expect(records.dkim).toEqual({
      type: "TXT",
      hostname: "kibamail._domainkey.example.com",
      value: `k=rsa;p=${CLEANED_PUBLIC_KEY}`,
    });
  });

  test("uses the public key as-is when already cleaned (no PEM headers)", () => {
    const records = getDnsRecords(
      "example.com",
      "kibamail._domainkey",
      CLEANED_PUBLIC_KEY,
      "kb",
      "e",
      "abcdefghij",
    );

    expect(records.dkim.value).toBe(`k=rsa;p=${CLEANED_PUBLIC_KEY}`);
  });

  test("returns CNAME records for return path and tracking", () => {
    const records = getDnsRecords(
      "example.com",
      "kibamail._domainkey",
      CLEANED_PUBLIC_KEY,
      "kb",
      "e",
      "abcdefghij",
    );

    expect(records.returnPath).toEqual({
      type: "CNAME",
      hostname: "kb.example.com",
      value: DNS_CONFIG.bounceHost,
    });
    expect(records.tracking).toEqual({
      type: "CNAME",
      hostname: "e.example.com",
      value: DNS_CONFIG.trackingHost,
    });
  });

  test("returns a DMARC TXT record under _dmarc subdomain when reporting code is provided", () => {
    const records = getDnsRecords(
      "example.com",
      "kibamail._domainkey",
      CLEANED_PUBLIC_KEY,
      "kb",
      "e",
      "abcdefghij",
    );

    expect(records.dmarc).not.toBeNull();
    expect(records.dmarc?.type).toBe("TXT");
    expect(records.dmarc?.hostname).toBe("_dmarc.example.com");
    expect(records.dmarc?.value).toContain("v=DMARC1;");
    expect(records.dmarc?.value).toContain(
      "rua=mailto:re+abcdefghij@dmarc.kbmta.net",
    );
  });

  test("returns null DMARC record when reporting code is missing", () => {
    const records = getDnsRecords(
      "example.com",
      "kibamail._domainkey",
      CLEANED_PUBLIC_KEY,
      "kb",
      "e",
      null,
    );

    expect(records.dmarc).toBeNull();
  });

  test("always includes the inbox MX record", () => {
    const records = getDnsRecords(
      "example.com",
      "kibamail._domainkey",
      CLEANED_PUBLIC_KEY,
      "kb",
      "e",
      "abcdefghij",
    );

    expect(records.mx.type).toBe("MX");
    expect(records.mx.priority).toBe(DNS_CONFIG.inboxMxPriority);
    expect(records.mx.value).toBe(DNS_CONFIG.inboxMxHost);
  });
});

describe("getInboxMxRecord", () => {
  test("returns @ as the hostname for a root (apex) domain", () => {
    expect(getInboxMxRecord("kibamail.com")).toEqual({
      type: "MX",
      hostname: "@",
      priority: DNS_CONFIG.inboxMxPriority,
      value: DNS_CONFIG.inboxMxHost,
    });
  });

  test("uses the leading label as the hostname for a one-level subdomain", () => {
    const record = getInboxMxRecord("mail.kibamail.com");

    expect(record.hostname).toBe("mail");
  });

  test("uses all leading labels for deeply nested subdomains", () => {
    const record = getInboxMxRecord("a.b.c.kibamail.com");

    expect(record.hostname).toBe("a.b.c");
  });

  test("MX priority is 10 (the configured default)", () => {
    expect(getInboxMxRecord("kibamail.com").priority).toBe(10);
  });
});
