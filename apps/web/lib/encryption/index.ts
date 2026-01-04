/**
 * Encryption Utilities
 *
 * Provides AES-256-GCM encryption for sensitive data storage.
 * Used for: DKIM private keys, SSL certificates, ACME credentials.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/env/schema";

/**
 * Derive a 32-byte key from the APP_KEY
 */
function deriveKey(appKey: string): Buffer {
  return Buffer.from(appKey.slice(0, 32).padEnd(32, "0"));
}

/**
 * Encrypt a string using AES-256-GCM
 *
 * Format: base64(iv + authTag + encryptedData)
 *
 * @param plaintext - The string to encrypt
 * @param appKey - Optional key override (defaults to env.APP_KEY)
 * @returns Encrypted string in base64 format
 */
export function encrypt(plaintext: string, appKey?: string): string {
  const key = deriveKey(appKey ?? env.APP_KEY);
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  // Combine iv + authTag + encrypted data
  return Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, "base64"),
  ]).toString("base64");
}

/**
 * Decrypt a string using AES-256-GCM
 *
 * @param ciphertext - The encrypted string in base64 format
 * @param appKey - Optional key override (defaults to env.APP_KEY)
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails (tampered or wrong key)
 */
export function decrypt(ciphertext: string, appKey?: string): string {
  const key = deriveKey(appKey ?? env.APP_KEY);
  const data = Buffer.from(ciphertext, "base64");

  const iv = data.subarray(0, 16);
  const authTag = data.subarray(16, 32);
  const encrypted = data.subarray(32);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}
