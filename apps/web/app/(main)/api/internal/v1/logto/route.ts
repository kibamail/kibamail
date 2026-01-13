/**
 * Logto Email Webhook Endpoint
 *
 * REST endpoint: /api/internal/v1/logto
 *
 * Receives email sending requests from Logto for authentication flows
 * (sign-in codes, registration verification, password reset, etc.)
 *
 * Supported Methods:
 * - POST   Handle email send request from Logto
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handleLogtoWebhook, validateServiceKey } from "./handler";

/**
 * POST /api/internal/v1/logto
 *
 * Handle incoming email send request from Logto.
 * Validates internal service key and processes the email request.
 *
 * Returns 200 OK in all cases (valid or invalid auth) to prevent
 * information leakage about authentication status.
 */
export async function POST(request: NextRequest) {
  const isValidKey = await validateServiceKey(request);

  if (!isValidKey) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  return handleLogtoWebhook(request);
}
