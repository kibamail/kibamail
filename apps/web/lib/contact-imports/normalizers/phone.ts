import {
  type CountryCode,
  ParseError,
  parsePhoneNumberWithError,
} from "libphonenumber-js";
import type { NormalizationResult } from "@/lib/contact-imports/types";

export function normalizePhone(
  value: string,
  countryHint?: string,
): NormalizationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { success: false, reason: "Empty phone number" };
  }

  try {
    const defaultCountry = countryHint as CountryCode | undefined;
    const phoneNumber = parsePhoneNumberWithError(trimmed, defaultCountry);

    if (!phoneNumber.isValid()) {
      return { success: false, reason: "Invalid phone number" };
    }

    return { success: true, value: phoneNumber.format("E.164") };
  } catch (error) {
    if (error instanceof ParseError) {
      return { success: false, reason: `Phone parse error: ${error.message}` };
    }
    return { success: false, reason: "Failed to parse phone number" };
  }
}
