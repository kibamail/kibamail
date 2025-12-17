import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";

interface RouteParams {
  params: Promise<{ broadcastId: string }>;
}

export interface ReadinessCheckItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  reason?: string;
}

export interface BroadcastReadinessResponse {
  ready: boolean;
  checklist: ReadinessCheckItem[];
  recipientCount: number;
  audienceType: "all" | "topic" | "segment";
  audienceName?: string;
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

      const [topic, segment] = await Promise.all([
        broadcast.topicId
          ? prisma.topic.findUnique({ where: { id: broadcast.topicId } })
          : null,
        broadcast.segmentId
          ? prisma.segment.findUnique({ where: { id: broadcast.segmentId } })
          : null,
      ]);

      let recipientCount = 0;
      let audienceType: "all" | "topic" | "segment" = "all";
      let audienceName: string | undefined;

      if (broadcast.topicId && topic) {
        audienceType = "topic";
        audienceName = topic.name;

        recipientCount = await prisma.contactTopic.count({
          where: {
            topicId: broadcast.topicId,
            status: "SUBSCRIBED",
            contact: {
              workspaceId,
              status: "SUBSCRIBED",
            },
          },
        });
      } else if (broadcast.segmentId && segment) {
        audienceType = "segment";
        audienceName = segment.name;

        if (segment.type === "STATIC") {
          recipientCount = await prisma.contactSegment.count({
            where: {
              segmentId: broadcast.segmentId,
              contact: {
                workspaceId,
                status: "SUBSCRIBED",
              },
            },
          });
        } else {
          recipientCount = await prisma.contact.count({
            where: {
              workspaceId,
              status: "SUBSCRIBED",
            },
          });
        }
      } else {
        recipientCount = await prisma.contact.count({
          where: {
            workspaceId,
            status: "SUBSCRIBED",
          },
        });
      }

      function formatRecipientCount(count: number): string {
        return count.toLocaleString();
      }

      const checklist: ReadinessCheckItem[] = [];

      const hasSenderIdentity = !!broadcast.senderIdentity;
      const sendingDomain = broadcast.senderIdentity?.sendingDomain || broadcast.sendingDomain;
      const isDomainVerified = sendingDomain
        ? !!(sendingDomain.dkimVerifiedAt && sendingDomain.returnPathDomainVerifiedAt)
        : false;

      checklist.push({
        id: "from_email",
        label: "From email",
        description: "A verified sender email address is required",
        completed: hasSenderIdentity && isDomainVerified,
        reason: !hasSenderIdentity
          ? "No sender email configured"
          : !isDomainVerified
            ? "Sending domain is not fully verified"
            : undefined,
      });

      const hasSubject = !!(broadcast.emailContent?.subject?.trim());
      checklist.push({
        id: "subject",
        label: "Subject line",
        description: "A subject line is required for your broadcast",
        completed: hasSubject,
        reason: !hasSubject ? "No subject line set" : undefined,
      });

      const hasSendTime = !!broadcast.sendAt;
      checklist.push({
        id: "send_time",
        label: "Send time",
        description: "Schedule when the broadcast should be sent",
        completed: hasSendTime,
        reason: !hasSendTime ? "No send time scheduled" : undefined,
      });

      const hasRecipients = recipientCount > 0;
      checklist.push({
        id: "recipients",
        label: `${formatRecipientCount(recipientCount)} recipients`,
        description: "At least one recipient is required",
        completed: hasRecipients,
        reason: !hasRecipients ? "No recipients in selected audience" : undefined,
      });

      const ready = checklist.every((item) => item.completed);

      const response: BroadcastReadinessResponse = {
        ready,
        checklist,
        recipientCount,
        audienceType,
        audienceName,
      };

      return NextResponse.json(response, { status: 200 });
    })
  );
}
