/**
 * DNS Configuration and Verification
 *
 * Utilities for generating DNS record values and verifying DNS configuration.
 * Note: This module uses Node.js dns module and should only be imported in server code.
 */

import dns from "node:dns/promises";
import { buildDmarcPolicy, generateDmarcReportingCode } from "./dmarc";

// Re-export client-safe functions for convenience
export { buildDmarcPolicy, generateDmarcReportingCode };

/**
 * DNS configuration for sending domains
 */
export const DNS_CONFIG = {
  bounceHost: "mail.kbmta.net",
  bounceSubdomain: "kb",
  trackingHost: "e.kbmta.net",
  trackingSubdomain: "e",
  dmarcSubdomain: "_dmarc",
};

/**
 * Clean up public key for DNS record
 * Removes PEM headers/footers and joins lines
 */
function cleanupPublicKey(publicKey: string): string {
  const lines = publicKey.split("\n");
  lines.shift(); // remove "-----BEGIN PUBLIC KEY-----"
  lines.pop(); // remove empty line
  lines.pop(); // remove "-----END PUBLIC KEY-----"
  return lines.join("");
}

/**
 * Get DKIM DNS record configuration
 */
export function getDkimRecord(
  domain: string,
  dkimSubdomain: string,
  publicKey: string
) {
  const cleanedKey = publicKey.includes("-----BEGIN")
    ? cleanupPublicKey(publicKey)
    : publicKey;

  return {
    type: "TXT" as const,
    hostname: `${dkimSubdomain}.${domain}`,
    value: `k=rsa;p=${cleanedKey}`,
  };
}

/**
 * Get Return Path (bounce) DNS record configuration
 */
export function getReturnPathRecord(domain: string, subdomain: string) {
  return {
    type: "CNAME" as const,
    hostname: `${subdomain}.${domain}`,
    value: DNS_CONFIG.bounceHost,
  };
}

/**
 * Get Tracking DNS record configuration
 */
export function getTrackingRecord(domain: string, subdomain: string) {
  return {
    type: "CNAME" as const,
    hostname: `${subdomain}.${domain}`,
    value: DNS_CONFIG.trackingHost,
  };
}

/**
 * Get DMARC DNS record configuration
 */
export function getDmarcRecord(domain: string, reportingCode: string) {
  return {
    type: "TXT" as const,
    hostname: `${DNS_CONFIG.dmarcSubdomain}.${domain}`,
    value: buildDmarcPolicy(reportingCode),
  };
}

/**
 * Get all DNS records for a sending domain
 */
export function getDnsRecords(
  domain: string,
  dkimSubdomain: string,
  publicKey: string,
  returnPathSubdomain: string,
  trackingSubdomain: string,
  dmarcReportingCode: string,
) {
  return {
    dkim: getDkimRecord(domain, dkimSubdomain, publicKey),
    returnPath: getReturnPathRecord(domain, returnPathSubdomain),
    tracking: getTrackingRecord(domain, trackingSubdomain),
    dmarc: getDmarcRecord(domain, dmarcReportingCode),
  };
}

/**
 * Resolve CNAME records for a hostname
 */
async function resolveCname(hostname: string): Promise<string[]> {
  try {
    return await dns.resolveCname(hostname);
  } catch {
    return [];
  }
}

/**
 * Resolve TXT records for a hostname
 */
async function resolveTxt(hostname: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(hostname);
    // TXT records may be arrays of strings that need to be joined
    return records.map((record) =>
      Array.isArray(record) ? record.join("") : record
    );
  } catch {
    return [];
  }
}

/**
 * Verification result for a single record
 */
export interface RecordVerification {
  configured: boolean;
  expected: string;
  found: string[];
}

/**
 * Full DNS verification result
 */
export interface DnsVerificationResult {
  dkim: RecordVerification;
  returnPath: RecordVerification;
  tracking: RecordVerification;
  dmarc: RecordVerification;
  allVerified: boolean;
}

/**
 * Verify DNS configuration for a sending domain
 */
export async function verifyDnsRecords(
  domain: string,
  dkimSubdomain: string,
  publicKey: string,
  returnPathSubdomain: string,
  trackingSubdomain: string,
  returnPathCnameValue: string,
  trackingCnameValue: string,
  dmarcReportingCode: string,
): Promise<DnsVerificationResult> {
  const expectedDkim = getDkimRecord(domain, dkimSubdomain, publicKey);
  const expectedReturnPath = getReturnPathRecord(domain, returnPathSubdomain);
  const expectedTracking = getTrackingRecord(domain, trackingSubdomain);
  const expectedDmarc = getDmarcRecord(domain, dmarcReportingCode);

  // Resolve all records in parallel
  const [dkimRecords, returnPathRecords, trackingRecords, dmarcRecords] =
    await Promise.all([
      resolveTxt(`${dkimSubdomain}.${domain}`),
      resolveCname(`${returnPathSubdomain}.${domain}`),
      resolveCname(`${trackingSubdomain}.${domain}`),
      resolveTxt(`${DNS_CONFIG.dmarcSubdomain}.${domain}`),
    ]);

  const dkimConfigured = dkimRecords.some(
    (record) => record === expectedDkim.value,
  );
  const returnPathConfigured = returnPathRecords.some(
    (record) => record === returnPathCnameValue,
  );
  const trackingConfigured = trackingRecords.some(
    (record) => record === trackingCnameValue,
  );
  const dmarcConfigured = dmarcRecords.some(
    (record) => record === expectedDmarc.value,
  );

  return {
    dkim: {
      configured: dkimConfigured,
      expected: expectedDkim.value,
      found: dkimRecords,
    },
    returnPath: {
      configured: returnPathConfigured,
      expected: returnPathCnameValue,
      found: returnPathRecords,
    },
    tracking: {
      configured: trackingConfigured,
      expected: trackingCnameValue,
      found: trackingRecords,
    },
    dmarc: {
      configured: dmarcConfigured,
      expected: expectedDmarc.value,
      found: dmarcRecords,
    },
    allVerified:
      dkimConfigured &&
      returnPathConfigured &&
      trackingConfigured &&
      dmarcConfigured,
  };
}
