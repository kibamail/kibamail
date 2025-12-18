import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import { checkBroadcastReadiness } from "@/lib/broadcasts/readiness";

interface RouteParams {
  params: Promise<{ broadcastId: string }>;
}

export type {
  ReadinessCheckItem,
  BroadcastReadinessResult as BroadcastReadinessResponse,
} from "@/lib/broadcasts/readiness";

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { broadcastId } = await params;

  return withErrorHandling(request, () =>
    withSession(request, async (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const workspaceId = session.currentOrganization.id;

      const broadcast = await prisma.broadcast.findFirst({
        where: {
          id: broadcastId,
          workspaceId,
        },
        include: {
          emailContent: true,
          senderIdentity: {
            include: {
              sendingDomain: true,
            },
          },
          sendingDomain: true,
        },
      });

      if (!broadcast) {
        throw new NotFoundError(
          "Broadcast not found",
          ErrorCode.BROADCAST_NOT_FOUND
        );
      }

      const result = await checkBroadcastReadiness(workspaceId, broadcast);

      return NextResponse.json(result, { status: 200 });
    })
  );
}
