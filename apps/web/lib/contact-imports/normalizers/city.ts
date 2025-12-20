import type { NormalizationResult } from "../types";

const MAX_CITY_LENGTH = 100;

function capitalizeWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function toTitleCase(str: string): string {
  const minorWords = new Set([
    "de",
    "del",
    "la",
    "las",
    "los",
    "el",
    "van",
    "von",
    "der",
    "den",
    "of",
    "the",
  ]);

  const words = str.toLowerCase().split(/\s+/);

  return words
    .map((word, wordIndex) => {
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) => capitalizeWord(part))
          .join("-");
      }

      if (word.includes("'")) {
        return word
          .split("'")
          .map((part) => capitalizeWord(part))
          .join("'");
      }

      if (wordIndex > 0 && minorWords.has(word)) {
        return word;
      }

      return capitalizeWord(word);
    })
    .join(" ");
}

export function normalizeCity(value: string): NormalizationResult {
  const trimmed = value.trim().replace(/\s+/g, " ");

  if (!trimmed) {
    return { success: false, reason: "Empty city value" };
  }

  if (trimmed.length > MAX_CITY_LENGTH) {
    return { success: false, reason: `City name too long (max ${MAX_CITY_LENGTH} chars)` };
  }

  if (/^\d+$/.test(trimmed)) {
    return { success: false, reason: "City cannot be only numbers" };
  }

  const normalized = toTitleCase(trimmed);

  return { success: true, value: normalized };
}
