/**
 * DNS Configuration and Verification
 *
 * Utilities for generating DNS record values and verifying DNS configuration.
 * Note: This module uses Node.js dns module and should only be imported in server code.
 */

import dns from "node:dns/promises";
import { buildDmarcPolicy } from "./dmarc";

/**
 * DNS configuration for sending domains
 */
export const DNS_CONFIG = {
  bounceHost: "mail.kbmta.net",
  bounceSubdomain: "kb",
  trackingHost: "e.kbmta.net",
  trackingSubdomain: "e",
  dmarcSubdomain: "_dmarc",
  /** MX host for inbox-enabled domains */
  inboxMxHost: process.env.INBOX_MX_HOST || "mail.kbmta.net",
  /** MX priority for inbox */
  inboxMxPriority: 10,
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
function getDkimRecord(
  domain: string,
  dkimSubdomain: string,
  publicKey: string,
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
function getReturnPathRecord(domain: string, subdomain: string) {
  return {
    type: "CNAME" as const,
    hostname: `${subdomain}.${domain}`,
    value: DNS_CONFIG.bounceHost,
  };
}

/**
 * Get Tracking DNS record configuration
 */
function getTrackingRecord(domain: string, subdomain: string) {
  return {
    type: "CNAME" as const,
    hostname: `${subdomain}.${domain}`,
    value: DNS_CONFIG.trackingHost,
  };
}

/**
 * Get DMARC DNS record configuration
 */
function getDmarcRecord(domain: string, reportingCode: string) {
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
    mx: getInboxMxRecord(domain),
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
      Array.isArray(record) ? record.join("") : record,
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
  const _expectedReturnPath = getReturnPathRecord(domain, returnPathSubdomain);
  const _expectedTracking = getTrackingRecord(domain, trackingSubdomain);
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

/**
 * MX verification result
 */
export interface MxVerificationResult {
  configured: boolean;
  expected: string;
  found: Array<{ priority: number; exchange: string }>;
}

/**
 * Verify MX record for inbox-enabled domain
 *
 * Checks if the domain has an MX record pointing to our MTA.
 * The MX record should have the expected exchange host.
 *
 * @param domain - The domain to verify
 * @returns MX verification result
 */
export async function verifyInboxMxRecord(
  domain: string,
): Promise<MxVerificationResult> {
  const expectedMx = DNS_CONFIG.inboxMxHost;

  try {
    const mxRecords = await dns.resolveMx(domain);

    // Check if any MX record matches our expected host
    // We accept both exact match and subdomain match (e.g., mta.kibamail.com matches *.kibamail.com)
    const configured = mxRecords.some((mx) => {
      const exchange = mx.exchange.toLowerCase();
      const expected = expectedMx.toLowerCase();
      return (
        exchange === expected ||
        exchange === `${expected}.` ||
        exchange.endsWith(`.${expected}`) ||
        exchange.endsWith(`.${expected}.`)
      );
    });

    return {
      configured,
      expected: expectedMx,
      found: mxRecords,
    };
  } catch {
    return {
      configured: false,
      expected: expectedMx,
      found: [],
    };
  }
}

/**
 * Get the MX hostname for a domain.
 * For MX records, the hostname is the subdomain portion of the domain.
 *
 * Example:
 * - domain: "kakari.kibamail.xyz" -> hostname: "kakari"
 * - domain: "kibamail.xyz" -> hostname: "@"
 */
function getMxHostname(domainName: string): string {
  const parts = domainName.split(".");
  if (parts.length <= 2) {
    // Root domain, use @
    return "@";
  }
  // Get all parts except the last two (the root domain)
  return parts.slice(0, -2).join(".");
}

/**
 * Get MX record configuration for inbox-enabled domain
 *
 * Returns the MX record that users should add to their DNS.
 */
export function getInboxMxRecord(domain: string) {
  return {
    type: "MX" as const,
    hostname: getMxHostname(domain),
    priority: DNS_CONFIG.inboxMxPriority,
    value: DNS_CONFIG.inboxMxHost,
  };
}
