/**
 * Broadcast Stats Route (Internal API)
 *
 * GET /api/internal/v1/broadcasts/[broadcastId]/stats
 *
 * Get aggregate statistics for a broadcast including recipient counts,
 * engagement metrics, and deliverability rates.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ErrorCode } from "@/lib/api/error-codes";
import { NotFoundError } from "@/lib/api/errors";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ broadcastId: string }>;
}

function round(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export interface BroadcastStatsResponse {
  broadcastId: string;
  recipients: {
    total: number;
    queued: number;
    sent: number;
    delivered: number;
    bounced: number;
    complained: number;
    failed: number;
    unsubscribed: number;
  };
  engagement: {
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
    clickToOpenRate: number;
  };
  deliverability: {
    deliveryRate: number;
    bounceRate: number;
    complaintRate: number;
  };
}

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
      });

      if (!broadcast) {
        throw new NotFoundError(
          "Broadcast not found",
          ErrorCode.BROADCAST_NOT_FOUND,
        );
      }

      // Calculate rates (avoid division by zero)
      const totalSent = broadcast.totalSent || 0;
      const totalDelivered = broadcast.totalDelivered || 0;
      const totalOpened = broadcast.totalOpened || 0;

      const openRate = totalDelivered > 0 ? totalOpened / totalDelivered : 0;
      const clickRate =
        totalDelivered > 0 ? broadcast.totalClicked / totalDelivered : 0;
      const clickToOpenRate =
        totalOpened > 0 ? broadcast.totalClicked / totalOpened : 0;
      const deliveryRate = totalSent > 0 ? totalDelivered / totalSent : 0;
      const bounceRate = totalSent > 0 ? broadcast.totalBounced / totalSent : 0;
      const complaintRate =
        totalDelivered > 0 ? broadcast.totalComplained / totalDelivered : 0;

      const stats: BroadcastStatsResponse = {
        broadcastId: broadcast.id,
        recipients: {
          total: broadcast.totalQueued,
          queued: broadcast.totalQueued - broadcast.totalSent,
          sent: broadcast.totalSent,
          delivered: broadcast.totalDelivered,
          bounced: broadcast.totalBounced,
          complained: broadcast.totalComplained,
          failed: broadcast.totalFailed,
          unsubscribed: broadcast.totalUnsubscribed,
        },
        engagement: {
          opened: broadcast.totalOpened,
          clicked: broadcast.totalClicked,
          openRate: round(openRate, 4),
          clickRate: round(clickRate, 4),
          clickToOpenRate: round(clickToOpenRate, 4),
        },
        deliverability: {
          deliveryRate: round(deliveryRate, 4),
          bounceRate: round(bounceRate, 4),
          complaintRate: round(complaintRate, 4),
        },
      };

      return NextResponse.json(stats, { status: 200 });
    }),
  );
}
