/**
 * Table Preferences Endpoint (Internal API)
 *
 * REST endpoint: /api/internal/v1/table-preferences
 *
 * Supported Methods:
 * - GET    Get table preferences for a user
 * - PUT    Update table preferences for a user
 *
 * Uses session-based authentication
 */

import type { NextRequest } from "next/server";
import { withErrorHandling, withSession } from "@/lib/api/requests";
import { getTablePreferences, updateTablePreferences } from "./handler";

/**
 * GET /api/internal/v1/table-preferences?tableName=contacts
 *
 * Get table preferences for a user
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(request, (session, request) => {
      const tableName = request.nextUrl.searchParams.get("tableName");

      if (!tableName) {
        throw new Error("Table name is required");
      }

      return getTablePreferences(session.user.sub, tableName);
    }),
  );
}

/**
 * PUT /api/internal/v1/table-preferences
 *
 * Update table preferences for a user
 */
export async function PUT(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(request, (session, request) => {
      return updateTablePreferences(session.user.sub, request);
    }),
  );
}
