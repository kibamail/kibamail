/**
 * Sign In Server Action
 *
 * Initiates the Logto authentication flow by redirecting the user to
 * the Logto sign-in page. After successful authentication, redirects
 * back to the app with an encrypted session.
 *
 * @example
 * <form action={signInAction}>
 *   <button type="submit">Sign In</button>
 * </form>
 *
 * @see https://docs.logto.io/docs/recipes/integrate-logto/next-js/#sign-in
 */

"use server";

import { signIn, getLogtoContext } from "@logto/next/server-actions";
import { logtoConfig } from "@/config/logto";
import { invalidateUserCache } from "@/lib/auth/user-cache";
import { Cookies, CookieKey } from "@/lib/cookies";
import { env } from "@/env/schema";

export async function signInAction() {
  // Clear any existing session data before signing in
  // This prevents stale data when a different user logs in
  const context = await getLogtoContext(logtoConfig);

  if (context.isAuthenticated && context.claims?.sub) {
    await invalidateUserCache(context.claims.sub);
  }

  await Cookies.delete(CookieKey.ACTIVE_WORKSPACE_ID);

  // Explicitly use LOGTO_BASE_URL for the callback to avoid issues with
  // internal Kubernetes hostnames (0.0.0.0:3000) being used instead
  const redirectUri = `${env.LOGTO_BASE_URL}/callback`;

  await signIn(logtoConfig, { redirectUri });
}
