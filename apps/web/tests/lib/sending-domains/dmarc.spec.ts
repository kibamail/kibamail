/**
 * Tests for DMARC utilities
 *
 * DMARC policies and reporting codes drive deliverability and bounce/abuse
 * reporting routing. A regression in either function silently breaks DMARC
 * monitoring for every customer-managed sending domain.
 */

import { describe, expect, test } from "vitest";
import {
  buildDmarcPolicy,
  generateDmarcReportingCode,
} from "@/lib/sending-domains/dmarc";

describe("generateDmarcReportingCode", () => {
  test("returns a 10-character lowercase alphabetic string", () => {
    const code = generateDmarcReportingCode();

    expect(code).toHaveLength(10);
    expect(code).toMatch(/^[a-z]{10}$/);
  });

  test("produces unique codes across invocations", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      codes.add(generateDmarcReportingCode());
    }

    // 50 random 10-char codes should never collide in practice
    expect(codes.size).toBe(50);
  });
});

describe("buildDmarcPolicy", () => {
  test("embeds the reporting code into the rua mailto", () => {
    const policy = buildDmarcPolicy("abcdefghij");

    expect(policy).toContain("rua=mailto:re+abcdefghij@dmarc.kbmta.net");
  });

  test("includes required DMARC1 directives", () => {
    const policy = buildDmarcPolicy("xxxxxxxxxx");

    expect(policy.startsWith("v=DMARC1;")).toBe(true);
    expect(policy).toContain("p=none");
    expect(policy).toContain("pct=100");
    expect(policy).toContain("sp=none");
    expect(policy).toContain("aspf=r");
  });

  test("produces deterministic output for the same code", () => {
    expect(buildDmarcPolicy("samecode00")).toBe(
      buildDmarcPolicy("samecode00"),
    );
  });

  test("interpolates an empty code without inserting extra separators", () => {
    // Defensive: confirms no accidental fallback like "undefined" leaks in.
    const policy = buildDmarcPolicy("");

    expect(policy).toContain("rua=mailto:re+@dmarc.kbmta.net");
    expect(policy).not.toContain("undefined");
    expect(policy).not.toContain("null");
  });
});
