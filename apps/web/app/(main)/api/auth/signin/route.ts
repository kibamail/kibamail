/**
 * Sign-In API Route
 *
 * GET /api/auth/signin
 *
 * Initiates Logto authentication flow by redirecting to Logto's hosted login page.
 * This route handler can modify cookies (unlike Server Components), making it
 * suitable for automatic authentication redirects.
 *
 * Supports optional returnTo parameter to redirect users back to their intended
 * destination after successful authentication.
 *
 * @example
 * // Redirect from Server Component
 * redirect('/api/auth/signin')
 *
 * // Redirect with return URL
 * redirect('/api/auth/signin?returnTo=/dashboard')
 */

import { signIn } from "@logto/next/server-actions";
import type { NextRequest } from "next/server";
import { logtoConfig } from "@/config/logto";
import { env } from "@/env/schema";

export async function GET(_request: NextRequest) {
  // Explicitly use LOGTO_BASE_URL for the callback to avoid issues with
  // internal Kubernetes hostnames (0.0.0.0:3000) being used instead
  const redirectUri = `${env.LOGTO_BASE_URL}/callback`;

  // Initiate Logto sign-in flow
  // This redirects the browser to Logto's hosted login page
  // After login, Logto redirects back to the callback URL
  await signIn(logtoConfig, { redirectUri });
}
