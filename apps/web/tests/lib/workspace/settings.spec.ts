import { describe, expect, test } from "vitest";
import {
  formatBusinessAddress,
  buildComplianceVariables,
  KIBAMAIL_DEFAULTS,
  type WorkspaceSettingsData,
} from "@/lib/workspace/settings";

const FULL_SETTINGS: WorkspaceSettingsData = {
  companyName: "Acme Corp",
  streetAddress: "123 Main St",
  city: "Springfield",
  state: "IL",
  zipCode: "62704",
  country: "United States",
  termsUrl: "https://acme.com/terms",
  privacyUrl: "https://acme.com/privacy",
};

describe("formatBusinessAddress", () => {
  test("formats full address with all fields", () => {
    const result = formatBusinessAddress(FULL_SETTINGS);
    expect(result).toBe(
      "Acme Corp\n123 Main St\nSpringfield, IL 62704\nUnited States",
    );
  });

  test("formats address with null state", () => {
    const settings = { ...FULL_SETTINGS, state: null };
    const result = formatBusinessAddress(settings);
    expect(result).toBe(
      "Acme Corp\n123 Main St\nSpringfield, 62704\nUnited States",
    );
  });

  test("formats address with null state and null zipCode", () => {
    const settings = { ...FULL_SETTINGS, state: null, zipCode: null };
    const result = formatBusinessAddress(settings);
    expect(result).toBe(
      "Acme Corp\n123 Main St\nSpringfield\nUnited States",
    );
  });

  test("formats address with state but null zipCode", () => {
    const settings = { ...FULL_SETTINGS, zipCode: null };
    const result = formatBusinessAddress(settings);
    expect(result).toBe(
      "Acme Corp\n123 Main St\nSpringfield, IL\nUnited States",
    );
  });

  test("formats address when city is empty string", () => {
    const settings = { ...FULL_SETTINGS, city: "" };
    const result = formatBusinessAddress(settings);
    expect(result).toBe(
      "Acme Corp\n123 Main St\nIL 62704\nUnited States",
    );
  });

  test("uses KIBAMAIL_DEFAULTS to produce expected default address", () => {
    const result = formatBusinessAddress(KIBAMAIL_DEFAULTS);
    expect(result).toContain("Kibamail Messaging Systems Ltd");
    expect(result).toContain("63 N. Burritt Ave");
    expect(result).toContain("Buffalo");
    expect(result).toContain("WY");
    expect(result).toContain("82834");
    expect(result).toContain("United States");
  });
});

describe("buildComplianceVariables", () => {
  test("returns business_address, terms_url, and privacy_url", () => {
    const result = buildComplianceVariables(FULL_SETTINGS);
    expect(result).toHaveProperty("business_address");
    expect(result).toHaveProperty("terms_url");
    expect(result).toHaveProperty("privacy_url");
  });

  test("business_address is the formatted address", () => {
    const result = buildComplianceVariables(FULL_SETTINGS);
    expect(result.business_address).toBe(formatBusinessAddress(FULL_SETTINGS));
  });

  test("uses settings termsUrl and privacyUrl", () => {
    const result = buildComplianceVariables(FULL_SETTINGS);
    expect(result.terms_url).toBe("https://acme.com/terms");
    expect(result.privacy_url).toBe("https://acme.com/privacy");
  });

  test("uses KIBAMAIL_DEFAULTS for default URLs", () => {
    const result = buildComplianceVariables(KIBAMAIL_DEFAULTS);
    expect(result.terms_url).toBe(
      "https://kibamail.com/legal/terms-of-service",
    );
    expect(result.privacy_url).toBe(
      "https://kibamail.com/legal/privacy-policy",
    );
  });
});

describe("KIBAMAIL_DEFAULTS", () => {
  test("has all required fields", () => {
    expect(KIBAMAIL_DEFAULTS).toHaveProperty("companyName");
    expect(KIBAMAIL_DEFAULTS).toHaveProperty("streetAddress");
    expect(KIBAMAIL_DEFAULTS).toHaveProperty("city");
    expect(KIBAMAIL_DEFAULTS).toHaveProperty("country");
    expect(KIBAMAIL_DEFAULTS).toHaveProperty("termsUrl");
    expect(KIBAMAIL_DEFAULTS).toHaveProperty("privacyUrl");
  });

  test("termsUrl and privacyUrl are valid URLs", () => {
    expect(KIBAMAIL_DEFAULTS.termsUrl).toMatch(/^https:\/\//);
    expect(KIBAMAIL_DEFAULTS.privacyUrl).toMatch(/^https:\/\//);
  });
});
