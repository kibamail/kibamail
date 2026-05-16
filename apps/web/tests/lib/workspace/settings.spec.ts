/**
 * Tests for Workspace Settings Helpers
 *
 * Pure-function coverage for formatBusinessAddress and buildComplianceVariables.
 * resolveWorkspaceSettings is intentionally not tested here because it requires
 * a real Prisma client and is exercised via integration paths.
 */

import { describe, expect, test } from "vitest";
import {
  KIBAMAIL_DEFAULTS,
  buildComplianceVariables,
  formatBusinessAddress,
  type WorkspaceSettingsData,
} from "@/lib/workspace/settings";

const baseSettings: WorkspaceSettingsData = {
  companyName: "Acme Inc.",
  streetAddress: "123 Main St",
  city: "Springfield",
  state: "IL",
  zipCode: "62701",
  country: "United States",
  termsUrl: "https://acme.test/terms",
  privacyUrl: "https://acme.test/privacy",
};

describe("formatBusinessAddress", () => {
  test("joins all parts when state and zip are present", () => {
    expect(formatBusinessAddress(baseSettings)).toBe(
      [
        "Acme Inc.",
        "123 Main St",
        "Springfield, IL 62701",
        "United States",
      ].join("\n"),
    );
  });

  test("omits state but keeps zip when state is null", () => {
    const formatted = formatBusinessAddress({
      ...baseSettings,
      state: null,
    });

    expect(formatted).toBe(
      ["Acme Inc.", "123 Main St", "Springfield, 62701", "United States"].join(
        "\n",
      ),
    );
  });

  test("omits zip but keeps state when zip is null", () => {
    const formatted = formatBusinessAddress({
      ...baseSettings,
      zipCode: null,
    });

    // `${state} ${zip ?? ""}`.trim() drops the trailing space so the state stays.
    expect(formatted).toBe(
      ["Acme Inc.", "123 Main St", "Springfield, IL", "United States"].join(
        "\n",
      ),
    );
  });

  test("uses only city when both state and zip are null", () => {
    const formatted = formatBusinessAddress({
      ...baseSettings,
      state: null,
      zipCode: null,
    });

    expect(formatted).toBe(
      ["Acme Inc.", "123 Main St", "Springfield", "United States"].join("\n"),
    );
  });

  test("preserves provided city even when state and zip are empty strings", () => {
    const formatted = formatBusinessAddress({
      ...baseSettings,
      state: "",
      zipCode: "",
    });

    // An empty zip ("") trimmed against an empty state still yields a falsy
    // value, but the city must remain.
    expect(formatted).toContain("Springfield");
    expect(formatted.split("\n")[0]).toBe("Acme Inc.");
    expect(formatted.split("\n").at(-1)).toBe("United States");
  });

  test("formats Kibamail defaults without throwing", () => {
    const formatted = formatBusinessAddress(KIBAMAIL_DEFAULTS);
    expect(formatted).toContain(KIBAMAIL_DEFAULTS.companyName);
    expect(formatted).toContain(KIBAMAIL_DEFAULTS.streetAddress);
    expect(formatted).toContain(KIBAMAIL_DEFAULTS.city);
    expect(formatted).toContain(KIBAMAIL_DEFAULTS.country);
  });
});

describe("buildComplianceVariables", () => {
  test("returns business_address, terms_url, privacy_url from settings", () => {
    expect(buildComplianceVariables(baseSettings)).toEqual({
      business_address: formatBusinessAddress(baseSettings),
      terms_url: "https://acme.test/terms",
      privacy_url: "https://acme.test/privacy",
    });
  });

  test("includes Kibamail default URLs", () => {
    const vars = buildComplianceVariables(KIBAMAIL_DEFAULTS);
    expect(vars.terms_url).toBe(KIBAMAIL_DEFAULTS.termsUrl);
    expect(vars.privacy_url).toBe(KIBAMAIL_DEFAULTS.privacyUrl);
  });
});

describe("KIBAMAIL_DEFAULTS", () => {
  test("has non-empty values for every required field", () => {
    for (const value of Object.values(KIBAMAIL_DEFAULTS)) {
      expect(value).toBeTruthy();
    }
  });

  test("terms and privacy URLs are absolute https links", () => {
    expect(KIBAMAIL_DEFAULTS.termsUrl).toMatch(/^https:\/\//);
    expect(KIBAMAIL_DEFAULTS.privacyUrl).toMatch(/^https:\/\//);
  });
});
