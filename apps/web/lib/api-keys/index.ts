/**
 * API Key Utilities
 *
 * Functions for generating, hashing, validating, and managing API keys.
 */

import { createHash, randomBytes } from "crypto";
import { API_KEY_CONFIG } from "@/config/api";

/**
 * Generate a new API key
 *
 * Creates a random API key with the configured prefix.
 *
 * @returns Object containing the full key and its preview
 *
 * @example
 * ```ts
 * const { key, preview } = generateApiKey()
 * // key: "sk_a1b2c3d4e5f6..."
 * // preview: "sk_a1b2c3d4..."
 * ```
 */
export function generateApiKey(): { key: string; preview: string } {
  const random = randomBytes(API_KEY_CONFIG.RANDOM_BYTES).toString("hex");
  const key = `${API_KEY_CONFIG.PREFIX}_${random}`;

  // Preview: prefix + first 8 chars of random + "..."
  const preview = `${API_KEY_CONFIG.PREFIX}_${random.substring(0, 8)}...`;

  return { key, preview };
}

/**
 * Hash an API key
 *
 * Creates a SHA-256 hash of the API key for secure storage.
 * The original key should never be stored in the database.
 *
 * @param key - The API key to hash
 * @returns SHA-256 hash of the key
 *
 * @example
 * ```ts
 * const hash = hashApiKey("sk_abc123...")
 * // hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
 * ```
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Validate API key format
 *
 * Checks if the provided string matches the expected API key format.
 *
 * @param key - The key to validate
 * @returns True if key format is valid
 *
 * @example
 * ```ts
 * validateApiKeyFormat("sk_abc123") // true
 * validateApiKeyFormat("invalid") // false
 * validateApiKeyFormat("pk_abc123") // false (wrong prefix)
 * ```
 */
export function validateApiKeyFormat(key: string): boolean {
  // Check if key starts with the correct prefix
  if (!key.startsWith(`${API_KEY_CONFIG.PREFIX}_`)) {
    return false;
  }

  // Extract the random part (after prefix and underscore)
  const randomPart = key.substring(API_KEY_CONFIG.PREFIX.length + 1);

  // Check if random part is hex and has correct length
  // 24 bytes = 48 hex characters
  const expectedLength = API_KEY_CONFIG.RANDOM_BYTES * 2;
  if (randomPart.length !== expectedLength) {
    return false;
  }

  // Check if it's valid hex
  return /^[0-9a-f]+$/.test(randomPart);
}

/**
 * Mask an API key for display
 *
 * Shows only the prefix and first few characters, masking the rest.
 *
 * @param key - The API key to mask
 * @param visibleChars - Number of characters to show after prefix (default: 8)
 * @returns Masked key
 *
 * @example
 * ```ts
 * maskApiKey("sk_abc123def456ghi789") // "sk_abc123de..."
 * ```
 */
export function maskApiKey(key: string, visibleChars: number = 8): string {
  const prefix = `${API_KEY_CONFIG.PREFIX}_`;
  if (!key.startsWith(prefix)) {
    return key; // Return as-is if format is unexpected
  }

  const randomPart = key.substring(prefix.length);
  return `${prefix}${randomPart.substring(0, visibleChars)}...`;
}
