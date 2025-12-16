/**
 * DKIM Key Pair Generation
 *
 * Generates RSA key pairs for DKIM email signing.
 * Uses 1024-bit RSA keys (standard for DKIM).
 */

import {
  createCipheriv,
  createDecipheriv,
  generateKeyPairSync,
  randomBytes,
} from "node:crypto";

/**
 * Clean up PEM key by removing headers/footers and joining lines
 */
function cleanupKey(key: string): string {
  const lines = key.split("\n");
  lines.shift(); // remove "-----BEGIN ... KEY-----"
  lines.pop(); // remove empty line at end
  lines.pop(); // remove "-----END ... KEY-----"
  return lines.join("");
}

/**
 * Encrypt a string using AES-256-GCM
 */
export function encrypt(plaintext: string, appKey: string): string {
  const key = Buffer.from(appKey.slice(0, 32).padEnd(32, "0"));
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
 */
export function decrypt(ciphertext: string, appKey: string): string {
  const key = Buffer.from(appKey.slice(0, 32).padEnd(32, "0"));
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

/**
 * Generate DKIM RSA key pair
 *
 * @returns Object containing public key (raw), private key (raw and encrypted)
 */
export function generateDkimKeyPair(appKey: string) {
  const keyPair = generateKeyPairSync("rsa", {
    modulusLength: 1024,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    cleaned: {
      publicKey: cleanupKey(keyPair.publicKey),
      privateKey: cleanupKey(keyPair.privateKey),
    },
    encrypted: {
      privateKey: encrypt(keyPair.privateKey, appKey),
    },
  };
}

/**
 * Generate DKIM subdomain
 * Format: kibamail._domainkey
 */
export function generateDkimSubdomain(): string {
  return "kibamail._domainkey";
}
