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

import { signIn } from "@logto/next/server-actions";
import { logtoConfig } from "@/config/logto";

export async function signInAction() {
  await signIn(logtoConfig);
}
