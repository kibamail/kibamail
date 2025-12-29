/**
 * Authentication Callback Route
 *
 * Handles the OAuth callback after successful authentication with Logto.
 * This route is called when Logto redirects the user back to your app
 * after they've signed in.
 *
 * Flow:
 * 1. User signs in via Logto
 * 2. Logto redirects to this callback with auth code in URL params
 * 3. handleSignIn() exchanges the code for tokens and creates session
 * 4. User is redirected to the homepage
 *
 * Configure this URL in your Logto Console:
 * Redirect URI: http://localhost:18090/callback (development)
 * Redirect URI: https://yourdomain.com/callback (production)
 *
 * @see https://docs.logto.io/docs/recipes/integrate-logto/next-js/#configure-redirect-uris
 */

import { handleSignIn } from "@logto/next/server-actions";
import { NextResponse, type NextRequest } from "next/server";
import { logtoConfig } from "@/config/logto";
import { CookieKey, Cookies } from "@/lib/cookies";
import { env } from "@/env/schema";

/**
 * Constructs the correct base URL from forwarded headers or falls back to env.
 * This is needed because Next.js in Docker/K8s sees its internal hostname
 * instead of the public-facing domain.
 */
function getBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("host");

  console.log("[callback] Headers:", {
    "x-forwarded-host": forwardedHost,
    "x-forwarded-proto": forwardedProto,
    host: host,
    "request.nextUrl.origin": request.nextUrl.origin,
    "env.LOGTO_BASE_URL": env.LOGTO_BASE_URL,
  });

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Fall back to LOGTO_BASE_URL from environment
  return env.LOGTO_BASE_URL;
}

export async function GET(request: NextRequest) {
  await handleSignIn(logtoConfig, request.nextUrl.searchParams);

  const baseUrl = getBaseUrl(request);
  const intended = await Cookies.get(CookieKey.ROUTE_INTENDED);

  console.log("[callback] Base URL:", baseUrl);
  console.log("[callback] Intended URL:", intended);

  let redirectUrl: string;

  if (intended) {
    // If intended is a relative path, make it absolute
    if (intended.startsWith("/")) {
      redirectUrl = `${baseUrl}${intended}`;
    } else {
      redirectUrl = intended;
    }
  } else {
    redirectUrl = `${baseUrl}/w`;
  }

  console.log("[callback] Redirecting to:", redirectUrl);

  return NextResponse.redirect(redirectUrl);
}
