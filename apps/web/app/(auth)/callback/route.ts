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
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { logtoConfig } from "@/config/logto";
import { CookieKey, Cookies } from "@/lib/cookies";

export async function GET(request: NextRequest) {
  await handleSignIn(logtoConfig, request.nextUrl.searchParams);

  const intended = await Cookies.get(CookieKey.ROUTE_INTENDED);

  if (intended) return redirect(intended);

  redirect("/w");
}
