/**
 * Internal SSL Certificate Endpoint
 *
 * REST endpoint: /api/internal/v1/ssl-certificates/:hostname
 *
 * Returns the SSL certificate and private key for a tracking domain.
 * Used by the OpenResty sidecar for dynamic TLS termination.
 *
 * Authentication: Internal Service Key (Bearer token)
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/requests";
import { withServiceAuth } from "@/lib/api/service-auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

/**
 * GET /api/internal/v1/ssl-certificates/:hostname
 *
 * Returns the certificate and private key for a tracking hostname.
 * The hostname should be the full tracking domain (e.g., e.customerdomain.com).
 *
 * @example
 * ```bash
 * curl -H "Authorization: Bearer $INTERNAL_SERVICE_KEY" \
 *   http://localhost:3000/api/internal/v1/ssl-certificates/e.example.com
 * ```
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hostname: string }> },
) {
  const { hostname } = await params;

  return withErrorHandling(request, () =>
    withServiceAuth(request, async () => {
      // Parse the hostname to extract subdomain and domain
      // e.g., "e.customerdomain.com" -> subdomain: "e", domain: "customerdomain.com"
      const parts = hostname.split(".");
      if (parts.length < 3) {
        return NextResponse.json(
          { error: "Invalid hostname format" },
          { status: 400 },
        );
      }

      const trackingSubDomain = parts[0];
      const domainName = parts.slice(1).join(".");

      // Find the domain with matching tracking subdomain and domain name
      const domain = await prisma.sendingDomain.findFirst({
        where: {
          name: domainName,
          trackingSubDomain: trackingSubDomain,
          trackingDomainSslVerifiedAt: { not: null },
        },
        select: {
          id: true,
          trackingSslCertKey: true,
          trackingSslCertSecret: true,
          trackingDomainSslVerifiedAt: true,
        },
      });

      if (!domain) {
        return NextResponse.json(
          { error: "Certificate not found" },
          { status: 404 },
        );
      }

      if (!domain.trackingSslCertKey || !domain.trackingSslCertSecret) {
        return NextResponse.json(
          { error: "Certificate not issued" },
          { status: 404 },
        );
      }

      // Decrypt the certificate and private key
      const certificate = decrypt(domain.trackingSslCertKey);
      const privateKey = decrypt(domain.trackingSslCertSecret);

      return NextResponse.json({
        certificate,
        privateKey,
        expiresAt: domain.trackingDomainSslVerifiedAt
          ? new Date(
              domain.trackingDomainSslVerifiedAt.getTime() +
                90 * 24 * 60 * 60 * 1000,
            ).toISOString()
          : null,
      });
    }),
  );
}
