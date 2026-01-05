/**
 * Internal Tenant Endpoint - Handler
 *
 * Returns tenant data for internal services (e.g., email-agent).
 * Includes sending domains with decrypted DKIM keys and API key hashes.
 */

import { env } from "@/env/schema";
import { ErrorCode } from "@/lib/api/error-codes";
import { NotFoundError } from "@/lib/api/errors";
import { internalApi } from "@/lib/api/logger";
import { responseOk } from "@/lib/api/responses";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/sending-domains/dkim";

/**
 * Response type for sending domain data
 * Uses snake_case to match email-agent Go struct expectations
 */
interface SendingDomainResponse {
  id: string;
  name: string;
  dkim_sub_domain: string;
  dkim_public_key: string;
  dkim_private_key: string; // Decrypted
  dkim_verified_at: string | null;
  return_path_sub_domain: string;
  return_path_domain: string; // Full return path domain (e.g., "kb.example.com")
  return_path_domain_verified_at: string | null;
  tracking_sub_domain: string;
  tracking_domain_verified_at: string | null;
  dmarc_reporting_code: string;
  dmarc_verified_at: string | null;
  open_tracking_enabled: boolean;
  click_tracking_enabled: boolean;
}

/**
 * Response type for API key data
 * Uses snake_case to match email-agent Go struct expectations
 */
interface ApiKeyResponse {
  id: string;
  key_hash: string;
  scopes: string[];
}

/**
 * Response type for the tenant endpoint
 * Uses snake_case to match email-agent Go struct expectations
 */
interface TenantResponse {
  id: string;
  sending_domains: SendingDomainResponse[];
  api_keys: ApiKeyResponse[];
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

  const apiKeys = await prisma.apiKey.findMany({
    where: { workspaceId: tenantId },
    select: {
      id: true,
      keyHash: true,
      scopes: true,
    },
  });

  const formattedDomains: SendingDomainResponse[] = sendingDomains.map(
    (domain) => {
      let decryptedPrivateKey = "";

      if (domain.dkimPrivateKey) {
        try {
          decryptedPrivateKey = decrypt(domain.dkimPrivateKey, env.APP_KEY);
        } catch {
          console.error(`Failed to decrypt DKIM key for domain ${domain.name}`);
        }
      }

      const returnPathDomain = domain.returnPathSubDomain
        ? `${domain.returnPathSubDomain}.${domain.name}`
        : "";

      return {
        id: domain.id,
        name: domain.name,
        dkim_sub_domain: domain.dkimSubDomain,
        dkim_public_key: domain.dkimPublicKey,
        dkim_private_key: decryptedPrivateKey,
        dkim_verified_at: domain.dkimVerifiedAt?.toISOString() ?? null,
        return_path_sub_domain: domain.returnPathSubDomain,
        return_path_domain: returnPathDomain,
        return_path_domain_verified_at:
          domain.returnPathDomainVerifiedAt?.toISOString() ?? null,
        tracking_sub_domain: domain.trackingSubDomain,
        tracking_domain_verified_at:
          domain.trackingDomainVerifiedAt?.toISOString() ?? null,
        dmarc_reporting_code: domain.dmarcReportingCode,
        dmarc_verified_at: domain.dmarcVerifiedAt?.toISOString() ?? null,
        open_tracking_enabled: domain.openTrackingEnabled,
        click_tracking_enabled: domain.clickTrackingEnabled,
      };
    },
  );

  const formattedApiKeys: ApiKeyResponse[] = apiKeys.map((key) => ({
    id: key.id,
    key_hash: key.keyHash,
    scopes: Array.isArray(key.scopes) ? (key.scopes as string[]) : [],
  }));

  const response: TenantResponse = {
    id: tenantId,
    sending_domains: formattedDomains,
    api_keys: formattedApiKeys,
  };

  return responseOk(response, "tenant");
}

/**
 * GET /api/internal/v1/tenants/by-domain/:domain
 *
 * Find tenant by sending domain name.
 * Used by email-agent to look up DKIM keys by domain.
 *
 * Returns same structure as getTenant() for compatibility with email-agent's
 * ControlPlaneTenant Go struct.
 */
export async function getTenantByDomain(domainName: string) {
  const log = internalApi.dkim(domainName);
  log.info("Searching for domain");

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
    log.info("Domain not found");
    throw new NotFoundError(
      `Domain "${domainName}" not found`,
      ErrorCode.SENDING_DOMAIN_NOT_FOUND,
    );
  }

  let decryptedPrivateKey = "";
  const hasDkimKey = !!sendingDomain.dkimPrivateKey;
  const isDkimVerified = !!sendingDomain.dkimVerifiedAt;

  if (sendingDomain.dkimPrivateKey) {
    try {
      decryptedPrivateKey = decrypt(sendingDomain.dkimPrivateKey, env.APP_KEY);
    } catch (err) {
      log.error("Failed to decrypt private key", err);
    }
  }

  const selector = sendingDomain.dkimSubDomain?.replace("._domainkey", "") || null;
  log.info("Domain found", {
    workspaceId: sendingDomain.workspaceId,
    hasDkimKey,
    isDkimVerified,
    selector,
  });

  const returnPathDomain = sendingDomain.returnPathSubDomain
    ? `${sendingDomain.returnPathSubDomain}.${sendingDomain.name}`
    : "";

  const formattedDomain: SendingDomainResponse = {
    id: sendingDomain.id,
    name: sendingDomain.name,
    dkim_sub_domain: sendingDomain.dkimSubDomain,
    dkim_public_key: sendingDomain.dkimPublicKey,
    dkim_private_key: decryptedPrivateKey,
    dkim_verified_at: sendingDomain.dkimVerifiedAt?.toISOString() ?? null,
    return_path_sub_domain: sendingDomain.returnPathSubDomain,
    return_path_domain: returnPathDomain,
    return_path_domain_verified_at:
      sendingDomain.returnPathDomainVerifiedAt?.toISOString() ?? null,
    tracking_sub_domain: sendingDomain.trackingSubDomain,
    tracking_domain_verified_at:
      sendingDomain.trackingDomainVerifiedAt?.toISOString() ?? null,
    dmarc_reporting_code: sendingDomain.dmarcReportingCode,
    dmarc_verified_at: sendingDomain.dmarcVerifiedAt?.toISOString() ?? null,
    open_tracking_enabled: sendingDomain.openTrackingEnabled,
    click_tracking_enabled: sendingDomain.clickTrackingEnabled,
  };

  const response: TenantResponse = {
    id: sendingDomain.workspaceId,
    sending_domains: [formattedDomain],
    api_keys: [],
  };

  return responseOk(response, "tenant");
}

/**
 * GET /api/internal/v1/tenants/by-bounce-domain/:domain
 *
 * Validate if a bounce domain belongs to a tenant.
 * Bounce domain format: kb.<tenant-domain>
 * Example: kb.hq.kibamail.xyz -> validates tenant owns hq.kibamail.xyz
 */
export async function validateBounceDomain(bounceDomain: string) {
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
          workspace_id: domain.workspaceId,
          sending_domain: domain.name,
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
      workspace_id: sendingDomain.workspaceId,
      domain_id: sendingDomain.id,
      domain: sendingDomain.name,
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
export async function validateApiKey(
  keyHash: string,
  requiredScopes?: string[],
) {
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      workspaceId: true,
      scopes: true,
    },
  });

  if (!apiKey) {
    throw new NotFoundError("API key not found", ErrorCode.INVALID_API_KEY);
  }

  const scopes = Array.isArray(apiKey.scopes)
    ? (apiKey.scopes as string[])
    : [];

  if (requiredScopes && requiredScopes.length > 0) {
    const hasAllScopes = requiredScopes.every((scope) =>
      scopes.includes(scope),
    );
    if (!hasAllScopes) {
      return responseOk(
        {
          valid: false,
          reason: "insufficient_scopes",
          workspace_id: apiKey.workspaceId,
        },
        "api_key_validation",
      );
    }
  }

  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return responseOk(
    {
      valid: true,
      workspace_id: apiKey.workspaceId,
      scopes,
    },
    "api_key_validation",
  );
}
