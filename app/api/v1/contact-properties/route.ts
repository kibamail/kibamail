/**
 * Contact Properties Collection Routes (External API)
 *
 * GET    /api/v1/contact-properties - List all contact properties
 * POST   /api/v1/contact-properties - Create a new contact property
 *
 * Authentication: API Key (Bearer token)
 * Workspace is deduced from the API key
 */

import type { NextRequest } from "next/server";
import { createContactProperty, listContactProperties } from "./handler";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";

/**
 * GET /api/v1/contact-properties
 *
 * List all contact properties for the workspace with pagination.
 * Requires API key authentication with read:contact-properties scope.
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => listContactProperties(apiKey, request),
      ["read:contact-properties"]
    )
  );
}

/**
 * POST /api/v1/contact-properties
 *
 * Create a new contact property for the workspace.
 * Requires API key authentication with write:contact-properties scope.
 * Automatically assigns an available slot based on property type.
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withApiSession(
      request,
      (apiKey, request) => createContactProperty(apiKey, request),
      ["write:contact-properties"]
    )
  );
}
