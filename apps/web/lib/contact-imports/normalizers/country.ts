import countries from "i18n-iso-countries";
import deLocale from "i18n-iso-countries/langs/de.json";
import enLocale from "i18n-iso-countries/langs/en.json";
import esLocale from "i18n-iso-countries/langs/es.json";
import frLocale from "i18n-iso-countries/langs/fr.json";
import ptLocale from "i18n-iso-countries/langs/pt.json";
import type { NormalizationResult } from "@/lib/contact-imports/types";

countries.registerLocale(enLocale);
countries.registerLocale(deLocale);
countries.registerLocale(frLocale);
countries.registerLocale(esLocale);
countries.registerLocale(ptLocale);

const SUPPORTED_LOCALES = ["en", "de", "fr", "es", "pt"] as const;

export function normalizeCountry(value: string): NormalizationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { success: false, reason: "Empty country value" };
  }

  const upper = trimmed.toUpperCase();

  if (countries.isValid(upper)) {
    if (upper.length === 2) {
      return { success: true, value: upper };
    }

    if (upper.length === 3) {
      const alpha2 = countries.alpha3ToAlpha2(upper);
      if (alpha2) {
        return { success: true, value: alpha2 };
      }
    }

    const numericCode = Number.parseInt(upper, 10);
    if (!Number.isNaN(numericCode)) {
      const alpha2 = countries.numericToAlpha2(numericCode);
      if (alpha2) {
        return { success: true, value: alpha2 };
      }
    }
  }

  for (const locale of SUPPORTED_LOCALES) {
    const alpha2 = countries.getAlpha2Code(trimmed, locale);
    if (alpha2) {
      return { success: true, value: alpha2 };
    }
  }

  return { success: false, reason: `Unrecognized country: "${trimmed}"` };
}

export function isValidCountryCode(code: string): boolean {
  return countries.isValid(code.toUpperCase());
}
