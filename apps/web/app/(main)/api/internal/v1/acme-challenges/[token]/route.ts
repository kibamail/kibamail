/**
 * Internal ACME Challenge Endpoint
 *
 * REST endpoint: /api/internal/v1/acme-challenges/:token
 *
 * Returns the ACME challenge key authorization for a given token.
 * Used by the tracking server to respond to Let's Encrypt HTTP-01 challenges.
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
 * GET /api/internal/v1/acme-challenges/:token
 *
 * Returns the key authorization for an ACME challenge token.
 *
 * @example
 * ```bash
 * curl -H "Authorization: Bearer $INTERNAL_SERVICE_KEY" \
 *   http://localhost:3000/api/internal/v1/acme-challenges/abc123token
 * ```
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  return withErrorHandling(request, () =>
    withServiceAuth(request, async () => {
      // Find the domain with this challenge token
      const domain = await prisma.sendingDomain.findFirst({
        where: {
          trackingSslChallengeToken: token,
        },
        select: {
          id: true,
          trackingSslChallengeAuth: true,
        },
      });

      if (!domain || !domain.trackingSslChallengeAuth) {
        return NextResponse.json(
          { error: "Challenge not found" },
          { status: 404 },
        );
      }

      // Decrypt the key authorization
      const keyAuthorization = decrypt(domain.trackingSslChallengeAuth);

      return NextResponse.json({
        keyAuthorization,
      });
    }),
  );
}
