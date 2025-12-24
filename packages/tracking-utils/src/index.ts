/**
 * Tracking Utilities Package
 *
 * Shared utilities for encoding/decoding tracking payloads.
 * Used by both the web app (for generating URLs) and the tracking server (for decoding).
 */

import { createHmac } from "crypto";

/**
 * Create a signer function with a specific secret key
 */
export function createSigner(secretKey: string) {
  return function signData(data: string): string {
    const hmac = createHmac("sha256", secretKey);
    hmac.update(data);
    return hmac.digest("base64url");
  };
}

/**
 * Sign data with HMAC-SHA256
 *
 * @param data - Data to sign
 * @param secretKey - Secret key for HMAC
 * @returns Base64URL-encoded signature
 */
export function signData(data: string, secretKey: string): string {
  const hmac = createHmac("sha256", secretKey);
  hmac.update(data);
  return hmac.digest("base64url");
}

/**
 * Tracking payload for click/open tracking
 */
export interface TrackingPayload {
  id: string;
  url?: string;
}

/**
 * Encode a tracking payload (for click/open tracking)
 *
 * @param emailSendId - Unique ID for this email send
 * @param originalUrl - Optional original URL (for click tracking)
 * @param secretKey - Secret key for signing
 * @returns Encoded and signed payload
 */
export function encodeTrackingPayload(
  emailSendId: string,
  originalUrl: string | undefined,
  secretKey: string
): string {
  const payload = originalUrl
    ? JSON.stringify({ id: emailSendId, url: originalUrl })
    : JSON.stringify({ id: emailSendId });

  const signature = signData(payload, secretKey);
  const encodedPayload = Buffer.from(payload).toString("base64url");

  return `${encodedPayload}.${signature}`;
}

/**
 * Decode and verify a tracking payload
 *
 * @param encoded - The encoded tracking payload
 * @param secretKey - Secret key for verification
 * @returns Decoded payload or null if invalid/tampered
 */
export function decodeTrackingPayload(
  encoded: string,
  secretKey: string
): TrackingPayload | null {
  const parts = encoded.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;

  try {
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const expectedSignature = signData(payload, secretKey);

    if (signature !== expectedSignature) {
      return null;
    }

    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Encode an image URL for proxying
 *
 * Uses minimal encoding: base64url(url).signature
 *
 * @param imageUrl - Original image URL
 * @param secretKey - Secret key for signing
 * @returns Encoded and signed payload
 */
export function encodeImageUrl(imageUrl: string, secretKey: string): string {
  const encoded = Buffer.from(imageUrl).toString("base64url");
  const signature = signData(imageUrl, secretKey);
  return `${encoded}.${signature}`;
}

/**
 * Decode and verify an image URL payload
 *
 * @param encoded - The encoded image payload
 * @param secretKey - Secret key for verification
 * @returns Original image URL or null if invalid/tampered
 */
export function decodeImageUrl(
  encoded: string,
  secretKey: string
): string | null {
  const parts = encoded.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedUrl, signature] = parts;

  try {
    const url = Buffer.from(encodedUrl, "base64url").toString("utf8");
    const expectedSignature = signData(url, secretKey);

    if (signature !== expectedSignature) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}
