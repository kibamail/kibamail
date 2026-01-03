/**
 * Send Test Broadcast Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/broadcasts/[broadcastId]/send-test
 *
 * Supported Methods:
 * - POST   Send test emails for a broadcast
 *
 * Sends the broadcast content to provided test email addresses
 * without scheduling or affecting the broadcast status.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { withErrorHandling, withSession } from "@/lib/api/requests";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import { validateRequestBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import {
  checkBroadcastReadiness,
  getReadinessErrors,
} from "@/lib/broadcasts/readiness";

interface RouteParams {
  params: Promise<{ broadcastId: string }>;
}

const MAX_TEST_EMAILS = 10;

const sendTestSchema = z.object({
  emails: z
    .array(z.string().email("Invalid email address"))
    .min(1, "At least one email address is required")
    .max(MAX_TEST_EMAILS, `Maximum ${MAX_TEST_EMAILS} test emails allowed`),
});

/**
 * POST /api/internal/v1/broadcasts/[broadcastId]/send-test
 *
 * Send test emails for a broadcast to the provided email addresses.
 * Performs readiness checks (except recipients and send time) before sending.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { broadcastId } = await params;

  return withErrorHandling(request, () =>
    withSession(request, async (session) => {
      if (!session.currentOrganization) {
        throw new Error("No active workspace found");
      }

      const workspaceId = session.currentOrganization.id;

      // Validate request body
      const { emails } = await validateRequestBody(sendTestSchema, request);

      // Trim and deduplicate emails
      const testEmails = [...new Set(emails.map((e) => e.trim().toLowerCase()))];

      // Fetch broadcast with required relations
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

      // Check readiness (skip recipients and send time checks for test sends)
      const readinessResult = await checkBroadcastReadiness(
        workspaceId,
        broadcast,
        {
          skipRecipients: true,
          skipSendTime: true,
        }
      );

      if (!readinessResult.ready) {
        const errors = getReadinessErrors(readinessResult);
        throw new BadRequestError(
          errors.length > 0 ? errors[0] : "Broadcast is not ready to send",
          ErrorCode.MISSING_REQUIRED_FIELD
        );
      }

      // Queue the test broadcast job (no delay - send immediately)
      await queue("broadcasts").push("send-test-broadcast", {
        broadcastId,
        testEmails,
      });

      return NextResponse.json(
        {
          success: true,
          message: `Test email${testEmails.length > 1 ? "s" : ""} queued for sending`,
          emailCount: testEmails.length,
        },
        { status: 200 }
      );
    })
  );
}
