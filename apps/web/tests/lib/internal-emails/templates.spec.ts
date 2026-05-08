/**
 * Tests for the Logto email template registry.
 *
 * LogtoEmailTemplates is the contract this app exposes to Logto's email
 * connector. If the registry drifts out of sync — wrong type-key, missing
 * variable, mis-flagged hasVerificationCode — Logto will request a template
 * we cannot render and authentication / invitation flows break in
 * production. These tests pin the relationships between the keys the type
 * union, the registry record, and the verification / invitation buckets.
 */

import { describe, expect, test } from "vitest";
import {
  InvitationLinkTemplates,
  LogtoEmailTemplates,
  LogtoEmailTemplateType,
  VerificationCodeTemplates,
} from "@/lib/internal-emails/templates";

describe("LogtoEmailTemplateType", () => {
  test("values match their keys (so the string we receive from Logto matches our type)", () => {
    for (const key of Object.keys(LogtoEmailTemplateType) as Array<
      keyof typeof LogtoEmailTemplateType
    >) {
      expect(LogtoEmailTemplateType[key]).toBe(key);
    }
  });
});

describe("LogtoEmailTemplates registry", () => {
  test("has a config entry for every template type", () => {
    for (const type of Object.values(LogtoEmailTemplateType)) {
      expect(LogtoEmailTemplates[type]).toBeDefined();
      expect(LogtoEmailTemplates[type].type).toBe(type);
    }
  });

  test("each config exposes non-empty description, purpose, and variables", () => {
    for (const cfg of Object.values(LogtoEmailTemplates)) {
      expect(cfg.description).toBeTruthy();
      expect(cfg.purpose).toBeTruthy();
      expect(Array.isArray(cfg.variables)).toBe(true);
      expect(cfg.variables.length).toBeGreaterThan(0);
    }
  });

  test("hasVerificationCode and hasInvitationLink are mutually exclusive", () => {
    for (const cfg of Object.values(LogtoEmailTemplates)) {
      expect(cfg.hasVerificationCode && cfg.hasInvitationLink).toBe(false);
    }
  });

  test("every verification template declares a 'code' variable", () => {
    for (const cfg of Object.values(LogtoEmailTemplates)) {
      if (cfg.hasVerificationCode) {
        expect(cfg.variables).toContain("code");
      }
    }
  });

  test("every invitation template declares a 'link' variable", () => {
    for (const cfg of Object.values(LogtoEmailTemplates)) {
      if (cfg.hasInvitationLink) {
        expect(cfg.variables).toContain("link");
      }
    }
  });
});

describe("VerificationCodeTemplates / InvitationLinkTemplates buckets", () => {
  test("VerificationCodeTemplates exactly matches templates flagged hasVerificationCode", () => {
    const expected = Object.values(LogtoEmailTemplates)
      .filter((cfg) => cfg.hasVerificationCode)
      .map((cfg) => cfg.type)
      .sort();
    expect([...VerificationCodeTemplates].sort()).toEqual(expected);
  });

  test("InvitationLinkTemplates exactly matches templates flagged hasInvitationLink", () => {
    const expected = Object.values(LogtoEmailTemplates)
      .filter((cfg) => cfg.hasInvitationLink)
      .map((cfg) => cfg.type)
      .sort();
    expect([...InvitationLinkTemplates].sort()).toEqual(expected);
  });

  test("OrganizationInvitation is the only invitation-link template today", () => {
    expect(InvitationLinkTemplates).toEqual([
      LogtoEmailTemplateType.OrganizationInvitation,
    ]);
  });

  test("every template type appears in exactly one bucket", () => {
    const all = Object.values(LogtoEmailTemplateType);
    const allBucketed = new Set([
      ...VerificationCodeTemplates,
      ...InvitationLinkTemplates,
    ]);
    expect(allBucketed.size).toBe(all.length);
    for (const type of all) {
      expect(allBucketed.has(type)).toBe(true);
    }
    // Mutually exclusive: union size = sum of sizes.
    expect(
      VerificationCodeTemplates.length + InvitationLinkTemplates.length,
    ).toBe(all.length);
  });
});
