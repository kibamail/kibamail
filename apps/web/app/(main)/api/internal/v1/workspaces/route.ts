/**
 * Workspaces Collection Endpoint
 *
 * REST endpoint: /api/internal/v1/workspaces
 *
 * Supported Methods:
 * - POST   Create a new workspace
 */

import type { NextRequest } from "next/server";

import { withErrorHandling, withSession } from "@/lib/api/requests";
import { createWorkspace } from "./handler";

/**
 * POST /api/internal/v1/workspaces
 *
 * Create a new workspace
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(request, createWorkspace),
  );
}
