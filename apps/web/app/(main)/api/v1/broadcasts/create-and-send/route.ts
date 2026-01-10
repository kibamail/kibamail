/**
 * Create and Send Broadcast Route (External API)
 *
 * POST /api/v1/broadcasts/create-and-send
 *
 * Creates and sends a broadcast with raw HTML/text content.
 * Bypasses the JSON-based email editor.
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";
import { createAndSendBroadcast } from "../handler";

/**
 * POST /api/v1/broadcasts/create-and-send
 *
 * Create and immediately send a broadcast with raw HTML/text content.
 * Requires API key authentication with write:broadcasts scope.
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => createAndSendBroadcast(apiKey.workspaceId, request),
      ["write:broadcasts"],
    ),
  );
}
