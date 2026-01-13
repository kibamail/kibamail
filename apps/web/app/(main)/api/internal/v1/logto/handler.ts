/**
 * Logto Email Webhook - Handler
 *
 * Business logic for /api/internal/v1/logto endpoint.
 * Handles email sending requests from Logto for authentication flows.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/env/schema";

/**
 * Validate the internal service key from the request
 */
export async function validateServiceKey(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const providedKey = authHeader.slice(7);

  return providedKey === env.INTERNAL_SERVICE_KEY;
}

/**
 * POST /api/internal/v1/logto
 *
 * Handle incoming email send request from Logto.
 * This handler is called after successful service key validation.
 *
 * @param request - Next.js request object containing email details
 * @returns 200 OK response
 */
export async function handleLogtoWebhook(request: NextRequest) {
  // TODO: Implement email sending logic
  // The request body will contain:
  // - to: recipient email address
  // - type: template type (SignIn, Register, ForgotPassword, etc.)
  // - payload: template variables (code, link, application, organization, etc.)

  return NextResponse.json({ success: true }, { status: 200 });
}
