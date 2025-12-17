/**
 * Sender Identities Collection Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/sender-identities
 *
 * Supported Methods:
 * - GET    List all sender identities
 */

import type { NextRequest } from "next/server";

import { withErrorHandling, withSession } from "@/lib/api/requests";
import { responseOk } from "@/lib/api/responses";
import { prisma } from "@/lib/db";

/**
 * Format sender identity for API response
 */
function formatSenderIdentity(
  senderIdentity: {
    id: string;
    name: string;
    email: string;
    replyToEmail: string | null;
    emailVerifiedAt: Date | null;
    createdAt: Date;
    sendingDomain: { id: string; name: string };
  },
) {
  return {
    id: senderIdentity.id,
    name: senderIdentity.name,
    email: `${senderIdentity.email}@${senderIdentity.sendingDomain.name}`,
    localPart: senderIdentity.email,
    domain: senderIdentity.sendingDomain.name,
    domainId: senderIdentity.sendingDomain.id,
    replyToEmail: senderIdentity.replyToEmail,
    verified: senderIdentity.emailVerifiedAt !== null,
    createdAt: senderIdentity.createdAt.toISOString(),
  };
}

/**
 * GET /api/internal/v1/sender-identities
 *
 * List all sender identities for the workspace
 * Uses session-based authentication and gets workspaceId from session
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(request, async (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const senderIdentities = await prisma.senderIdentity.findMany({
        where: { workspaceId: session.currentOrganization.id },
        include: {
          sendingDomain: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const formattedIdentities = senderIdentities.map(formatSenderIdentity);

      return responseOk(
        { data: formattedIdentities, hasMore: false },
        "sender_identity_list",
      );
    }),
  );
}
