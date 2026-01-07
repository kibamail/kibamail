/**
 * Sender Identities Collection Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/sender-identities
 *
 * Supported Methods:
 * - GET    List all sender identities
 * - POST   Create a new sender identity
 */

import type { NextRequest } from "next/server";

import { withErrorHandling, withSession } from "@/lib/api/requests";
import {
  responseBadRequest,
  responseNotFound,
  responseOk,
} from "@/lib/api/responses";
import { prisma } from "@/lib/db";
import { createSenderIdentitySchema } from "./schema";

/**
 * Format sender identity for API response
 */
function formatSenderIdentity(senderIdentity: {
  id: string;
  name: string;
  email: string;
  replyToEmail: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  sendingDomain: { id: string; name: string };
}) {
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

/**
 * POST /api/internal/v1/sender-identities
 *
 * Create a new sender identity
 * Requires: manage:broadcasts permission
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(
      request,
      async (session) => {
        if (!session.currentOrganization) {
          throw new Error("No active workspace found");
        }

        const workspaceId = session.currentOrganization.id;
        const body = await request.json();

        // Validate request body
        const parsed = createSenderIdentitySchema.safeParse(body);
        if (!parsed.success) {
          return responseBadRequest(
            parsed.error.issues[0]?.message || "Invalid request body",
          );
        }

        const { name, email, sendingDomainId } = parsed.data;

        // Verify the sending domain exists, belongs to workspace, and is verified
        const sendingDomain = await prisma.sendingDomain.findFirst({
          where: {
            id: sendingDomainId,
            workspaceId,
          },
        });

        if (!sendingDomain) {
          return responseNotFound("Sending domain not found");
        }

        if (!sendingDomain.dkimVerifiedAt) {
          return responseBadRequest(
            "Sending domain must be verified before creating sender identities",
          );
        }

        // Create the sender identity (auto-verified since domain is verified)
        const senderIdentity = await prisma.senderIdentity.create({
          data: {
            workspaceId,
            sendingDomainId,
            name,
            email,
            emailVerifiedAt: new Date(), // Auto-verify since domain is verified
          },
          include: {
            sendingDomain: {
              select: { id: true, name: true },
            },
          },
        });

        return responseOk(formatSenderIdentity(senderIdentity), "sender_identity");
      },
    ),
  );
}
