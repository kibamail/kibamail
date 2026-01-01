/**
 * Internal Tenant Endpoint - Handler
 *
 * Returns tenant data for internal services (e.g., email-agent).
 * Includes sending domains with decrypted DKIM keys and API key hashes.
 */

import { env } from "@/env/schema";
import { ErrorCode } from "@/lib/api/error-codes";
import { NotFoundError } from "@/lib/api/errors";
import { responseOk } from "@/lib/api/responses";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/sending-domains/dkim";

/**
 * Response type for sending domain data
 */
interface SendingDomainResponse {
  id: string;
  name: string;
  dkimSubDomain: string;
  dkimPublicKey: string;
  dkimPrivateKey: string; // Decrypted
  dkimVerifiedAt: string | null;
  returnPathSubDomain: string;
  returnPathDomainVerifiedAt: string | null;
  trackingSubDomain: string;
  trackingDomainVerifiedAt: string | null;
  dmarcReportingCode: string;
  dmarcVerifiedAt: string | null;
  openTrackingEnabled: boolean;
  clickTrackingEnabled: boolean;
}

/**
 * Response type for API key data
 */
interface ApiKeyResponse {
  id: string;
  keyHash: string;
  scopes: string[];
}

/**
 * Response type for the tenant endpoint
 */
interface TenantResponse {
  id: string;
  sendingDomains: SendingDomainResponse[];
  apiKeys: ApiKeyResponse[];
}

/**
 * GET /api/internal/v1/tenants/:tenantId
 *
 * Returns tenant data including:
 * - Sending domains with decrypted DKIM private keys
 * - API key hashes for authentication validation
 *
 * Used by email-agent to:
 * - Sign emails with tenant DKIM keys
 * - Validate SMTP credentials
 * - Validate listener domains for bounces
 */
export async function getTenant(tenantId: string) {
  // Fetch tenant's sending domains
  const sendingDomains = await prisma.sendingDomain.findMany({
    where: { workspaceId: tenantId },
    select: {
      id: true,
      name: true,
      dkimSubDomain: true,
      dkimPublicKey: true,
      dkimPrivateKey: true,
      dkimVerifiedAt: true,
      returnPathSubDomain: true,
      returnPathDomainVerifiedAt: true,
      trackingSubDomain: true,
      trackingDomainVerifiedAt: true,
      dmarcReportingCode: true,
      dmarcVerifiedAt: true,
      openTrackingEnabled: true,
      clickTrackingEnabled: true,
    },
  });

  // Fetch tenant's API keys
  const apiKeys = await prisma.apiKey.findMany({
    where: { workspaceId: tenantId },
    select: {
      id: true,
      keyHash: true,
      scopes: true,
    },
  });

  // If no domains and no API keys, tenant doesn't exist or has no data
  if (sendingDomains.length === 0 && apiKeys.length === 0) {
    // Check if workspace exists by looking for any data
    const hasAnyData = await prisma.sendingDomain.findFirst({
      where: { workspaceId: tenantId },
      select: { id: true },
    });

    // We'll return empty arrays if tenant has no data yet
    // This is valid - tenant might be newly created
  }

  // Decrypt DKIM private keys and format response
  const formattedDomains: SendingDomainResponse[] = sendingDomains.map(
    (domain) => {
      let decryptedPrivateKey = "";

      // Only decrypt if we have an encrypted key
      if (domain.dkimPrivateKey) {
        try {
          decryptedPrivateKey = decrypt(domain.dkimPrivateKey, env.APP_KEY);
        } catch {
          // Log error but don't fail - domain might have invalid key
          console.error(
            `Failed to decrypt DKIM key for domain ${domain.name}`,
          );
        }
      }

      return {
        id: domain.id,
        name: domain.name,
        dkimSubDomain: domain.dkimSubDomain,
        dkimPublicKey: domain.dkimPublicKey,
        dkimPrivateKey: decryptedPrivateKey,
        dkimVerifiedAt: domain.dkimVerifiedAt?.toISOString() ?? null,
        returnPathSubDomain: domain.returnPathSubDomain,
        returnPathDomainVerifiedAt:
          domain.returnPathDomainVerifiedAt?.toISOString() ?? null,
        trackingSubDomain: domain.trackingSubDomain,
        trackingDomainVerifiedAt:
          domain.trackingDomainVerifiedAt?.toISOString() ?? null,
        dmarcReportingCode: domain.dmarcReportingCode,
        dmarcVerifiedAt: domain.dmarcVerifiedAt?.toISOString() ?? null,
        openTrackingEnabled: domain.openTrackingEnabled,
        clickTrackingEnabled: domain.clickTrackingEnabled,
      };
    },
  );

  // Format API keys response
  const formattedApiKeys: ApiKeyResponse[] = apiKeys.map((key) => ({
    id: key.id,
    keyHash: key.keyHash,
    scopes: Array.isArray(key.scopes) ? (key.scopes as string[]) : [],
  }));

  const response: TenantResponse = {
    id: tenantId,
    sendingDomains: formattedDomains,
    apiKeys: formattedApiKeys,
  };

  return responseOk(response, "tenant");
}

/**
 * GET /api/internal/v1/tenants/by-domain/:domain
 *
 * Find tenant by sending domain name.
 * Used by email-agent to look up DKIM keys by domain.
 */
export async function getTenantByDomain(domainName: string) {
  const sendingDomain = await prisma.sendingDomain.findFirst({
    where: { name: domainName },
    select: {
      workspaceId: true,
      id: true,
      name: true,
      dkimSubDomain: true,
      dkimPublicKey: true,
      dkimPrivateKey: true,
      dkimVerifiedAt: true,
      returnPathSubDomain: true,
      returnPathDomainVerifiedAt: true,
      trackingSubDomain: true,
      trackingDomainVerifiedAt: true,
      dmarcReportingCode: true,
      dmarcVerifiedAt: true,
      openTrackingEnabled: true,
      clickTrackingEnabled: true,
    },
  });

  if (!sendingDomain) {
    throw new NotFoundError(
      `Domain "${domainName}" not found`,
      ErrorCode.SENDING_DOMAIN_NOT_FOUND,
    );
  }

  // Decrypt DKIM private key
  let decryptedPrivateKey = "";
  if (sendingDomain.dkimPrivateKey) {
    try {
      decryptedPrivateKey = decrypt(sendingDomain.dkimPrivateKey, env.APP_KEY);
    } catch {
      console.error(
        `Failed to decrypt DKIM key for domain ${sendingDomain.name}`,
      );
    }
  }

  const response = {
    workspaceId: sendingDomain.workspaceId,
    domain: {
      id: sendingDomain.id,
      name: sendingDomain.name,
      dkimSubDomain: sendingDomain.dkimSubDomain,
      dkimPublicKey: sendingDomain.dkimPublicKey,
      dkimPrivateKey: decryptedPrivateKey,
      dkimVerifiedAt: sendingDomain.dkimVerifiedAt?.toISOString() ?? null,
      returnPathSubDomain: sendingDomain.returnPathSubDomain,
      returnPathDomainVerifiedAt:
        sendingDomain.returnPathDomainVerifiedAt?.toISOString() ?? null,
      trackingSubDomain: sendingDomain.trackingSubDomain,
      trackingDomainVerifiedAt:
        sendingDomain.trackingDomainVerifiedAt?.toISOString() ?? null,
      dmarcReportingCode: sendingDomain.dmarcReportingCode,
      dmarcVerifiedAt: sendingDomain.dmarcVerifiedAt?.toISOString() ?? null,
      openTrackingEnabled: sendingDomain.openTrackingEnabled,
      clickTrackingEnabled: sendingDomain.clickTrackingEnabled,
    },
  };

  return responseOk(response, "tenant_domain");
}

/**
 * GET /api/internal/v1/tenants/by-bounce-domain/:domain
 *
 * Validate if a bounce domain belongs to a tenant.
 * Bounce domain format: kb.<tenant-domain>
 * Example: kb.hq.kibamail.xyz -> validates tenant owns hq.kibamail.xyz
 */
export async function validateBounceDomain(bounceDomain: string) {
  // Extract tenant domain from bounce domain
  // Format: kb.<tenant-domain> or <subdomain>.<tenant-domain>
  // We need to find which sending domain this bounce domain belongs to

  // Try to find a sending domain where the bounce domain matches the pattern
  // kb.<domain-name> where domain-name is the sending domain
  const sendingDomains = await prisma.sendingDomain.findMany({
    select: {
      workspaceId: true,
      name: true,
      returnPathSubDomain: true,
    },
  });

  // Check if any sending domain matches this bounce domain
  for (const domain of sendingDomains) {
    const expectedBounceDomain = `${domain.returnPathSubDomain}.${domain.name}`;
    if (bounceDomain === expectedBounceDomain) {
      return responseOk(
        {
          valid: true,
          workspaceId: domain.workspaceId,
          sendingDomain: domain.name,
        },
        "bounce_domain_validation",
      );
    }
  }

  throw new NotFoundError(
    `Bounce domain "${bounceDomain}" not recognized`,
    ErrorCode.SENDING_DOMAIN_NOT_FOUND,
  );
}

/**
 * GET /api/internal/v1/tenants/by-dmarc-code/:code
 *
 * Find tenant by DMARC reporting code.
 * Used to route DMARC aggregate reports to the correct tenant.
 */
export async function getTenantByDmarcCode(dmarcCode: string) {
  const sendingDomain = await prisma.sendingDomain.findFirst({
    where: { dmarcReportingCode: dmarcCode },
    select: {
      workspaceId: true,
      id: true,
      name: true,
    },
  });

  if (!sendingDomain) {
    throw new NotFoundError(
      `DMARC code "${dmarcCode}" not found`,
      ErrorCode.SENDING_DOMAIN_NOT_FOUND,
    );
  }

  return responseOk(
    {
      workspaceId: sendingDomain.workspaceId,
      domainId: sendingDomain.id,
      domainName: sendingDomain.name,
    },
    "dmarc_code_lookup",
  );
}

/**
 * POST /api/internal/v1/tenants/validate-api-key
 *
 * Validate an API key hash and return associated tenant info.
 * Used by email-agent to validate SMTP credentials.
 */
export async function validateApiKey(keyHash: string, requiredScopes?: string[]) {
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      workspaceId: true,
      scopes: true,
    },
  });

  if (!apiKey) {
    throw new NotFoundError(
      "API key not found",
      ErrorCode.INVALID_API_KEY,
    );
  }

  const scopes = Array.isArray(apiKey.scopes) ? (apiKey.scopes as string[]) : [];

  // Check required scopes if specified
  if (requiredScopes && requiredScopes.length > 0) {
    const hasAllScopes = requiredScopes.every((scope) => scopes.includes(scope));
    if (!hasAllScopes) {
      return responseOk(
        {
          valid: false,
          reason: "insufficient_scopes",
          workspaceId: apiKey.workspaceId,
        },
        "api_key_validation",
      );
    }
  }

  // Update lastUsedAt (fire and forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Ignore errors - this is non-critical
    });

  return responseOk(
    {
      valid: true,
      workspaceId: apiKey.workspaceId,
      scopes,
    },
    "api_key_validation",
  );
}
