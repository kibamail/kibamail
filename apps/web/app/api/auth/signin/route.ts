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

import type { NextRequest } from "next/server";
import { signIn } from "@logto/next/server-actions";
import { logtoConfig } from "@/config/logto";

export async function GET(request: NextRequest) {
  // const searchParams = request.nextUrl.searchParams;
  // const returnTo = searchParams.get("returnTo");

  // // Build callback URL with optional return path
  // const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  // let callbackUrl = `${baseUrl}/callback`;

  // if (returnTo) {
  //   // Encode the return URL to pass through the OAuth flow
  //   callbackUrl += `?returnTo=${encodeURIComponent(returnTo)}`;
  // }

  // Initiate Logto sign-in flow
  // This redirects the browser to Logto's hosted login page
  // After login, Logto redirects back to the callback URL
  await signIn(logtoConfig);
}
