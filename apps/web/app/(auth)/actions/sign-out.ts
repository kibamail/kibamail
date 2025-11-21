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

import { signOut } from "@logto/next/server-actions";
import { logtoConfig } from "@/config/logto";

export async function signOutAction() {
  await signOut(logtoConfig);
}
