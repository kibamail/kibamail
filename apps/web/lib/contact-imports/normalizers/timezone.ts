import type { NormalizationResult } from "../types";

const TIMEZONE_ABBREVIATIONS: Record<string, string> = {
  EST: "America/New_York",
  EDT: "America/New_York",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  MST: "America/Denver",
  MDT: "America/Denver",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  AKST: "America/Anchorage",
  AKDT: "America/Anchorage",
  HST: "Pacific/Honolulu",
  GMT: "Etc/GMT",
  UTC: "Etc/UTC",
  BST: "Europe/London",
  CET: "Europe/Paris",
  CEST: "Europe/Paris",
  EET: "Europe/Helsinki",
  EEST: "Europe/Helsinki",
  WET: "Europe/Lisbon",
  WEST: "Europe/Lisbon",
  IST: "Asia/Kolkata",
  JST: "Asia/Tokyo",
  KST: "Asia/Seoul",
  CST_CHINA: "Asia/Shanghai",
  HKT: "Asia/Hong_Kong",
  SGT: "Asia/Singapore",
  AEST: "Australia/Sydney",
  AEDT: "Australia/Sydney",
  ACST: "Australia/Adelaide",
  ACDT: "Australia/Adelaide",
  AWST: "Australia/Perth",
  NZST: "Pacific/Auckland",
  NZDT: "Pacific/Auckland",
};

const VALID_TIMEZONES = new Set(Intl.supportedValuesOf("timeZone"));

function parseUtcOffset(value: string): string | null {
  const offsetMatch = value.match(
    /^(?:UTC|GMT)\s*([+-])?(\d{1,2})(?::?(\d{2}))?$/i,
  );
  if (!offsetMatch) return null;

  const hours = Number.parseInt(offsetMatch[2], 10);
  const minutes = offsetMatch[3] ? Number.parseInt(offsetMatch[3], 10) : 0;

  if (hours > 14 || minutes > 59) return null;

  if (hours === 0 && minutes === 0) {
    return "Etc/UTC";
  }

  const sign = offsetMatch[1] === "-" ? "+" : "-";
  return `Etc/GMT${sign}${hours}`;
}

export function normalizeTimezone(value: string): NormalizationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { success: false, reason: "Empty timezone value" };
  }

  if (VALID_TIMEZONES.has(trimmed)) {
    return { success: true, value: trimmed };
  }

  const upper = trimmed.toUpperCase();
  if (TIMEZONE_ABBREVIATIONS[upper]) {
    return { success: true, value: TIMEZONE_ABBREVIATIONS[upper] };
  }

  const utcTimezone = parseUtcOffset(trimmed);
  if (utcTimezone) {
    return { success: true, value: utcTimezone };
  }

  const caseInsensitiveMatch = [...VALID_TIMEZONES].find(
    (tz) => tz.toLowerCase() === trimmed.toLowerCase(),
  );
  if (caseInsensitiveMatch) {
    return { success: true, value: caseInsensitiveMatch };
  }

  return { success: false, reason: `Unrecognized timezone: "${trimmed}"` };
}

export function isValidTimezone(timezone: string): boolean {
  return VALID_TIMEZONES.has(timezone);
}
