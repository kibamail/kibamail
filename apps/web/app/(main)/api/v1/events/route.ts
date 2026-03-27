/**
 * Events Route (External API)
 *
 * POST /api/v1/events - Fire a custom event that can trigger automations
 *
 * Authentication: API Key (Bearer token)
 */

import type { NextRequest } from "next/server";
import { createEvent } from "./handler";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";

export async function POST(request: NextRequest) {
  return withErrorHandling(request, async () => {
    return withApiSession(
      request,
      (apiKey) => createEvent(apiKey.workspaceId, request),
      ["write:contacts"],
    );
  });
}
