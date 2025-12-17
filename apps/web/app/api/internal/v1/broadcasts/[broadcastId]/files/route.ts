/**
 * Broadcast Files Upload API Route
 *
 * POST /api/internal/v1/broadcasts/:broadcastId/files
 *
 * Upload files (images, attachments) for a broadcast.
 * Files are stored in S3 under broadcasts/<broadcastId>/ folder.
 *
 * Accepts multipart/form-data with a "files" field containing one or more files.
 */

import type { NextRequest } from "next/server";

import { withErrorHandling, withSession } from "@/lib/api/requests";

import { uploadBroadcastFiles } from "./handler";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ broadcastId: string }> },
) {
  const { broadcastId } = await params;

  return withErrorHandling(request, () =>
    withSession(request, (session) =>
      uploadBroadcastFiles(session, broadcastId, request),
    ),
  );
}
