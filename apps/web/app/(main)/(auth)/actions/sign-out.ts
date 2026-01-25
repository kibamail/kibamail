/**
 * Sign Out Server Action
 *
 * Logs the user out by clearing their session and redirecting to Logto's
 * logout endpoint. After sign-out, the user must authenticate again.
 *
 * @example
 * <form action={signOutAction}>
 *   <button type="submit">Sign Out</button>
 * </form>
 *
 * @see https://docs.logto.io/docs/recipes/integrate-logto/next-js/#sign-out
 */

"use server";

import { getLogtoContext, signOut } from "@logto/next/server-actions";
import { logtoConfig } from "@/config/logto";
import { invalidateUserCache } from "@/lib/auth/user-cache";
import { CookieKey, Cookies } from "@/lib/cookies";
import { getPostHogClient } from "@/lib/posthog-server";

export async function signOutAction() {
  const context = await getLogtoContext(logtoConfig);

  if (context.isAuthenticated && context.claims?.sub) {
    getPostHogClient().capture({
      distinctId: context.claims.sub,
      event: "user_signed_out",
      properties: {
        email: context.claims.email,
      },
    });

    await invalidateUserCache(context.claims.sub);
  }

  await Cookies.delete(CookieKey.ACTIVE_WORKSPACE_ID);

  await signOut(logtoConfig);
}
