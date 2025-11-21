/**
 * Server-side Cookie Management
 *
 * Provides a type-safe API for reading and writing cookies in Server Components
 * and Route Handlers.
 *
 * @example
 * ```ts
 * import { Cookies, CookieKey } from '@/lib/cookies'
 *
 * // Get a cookie
 * const workspaceId = await Cookies.get(CookieKey.ACTIVE_WORKSPACE_ID)
 *
 * // Set a cookie
 * await Cookies.set(CookieKey.ACTIVE_WORKSPACE_ID, 'org_123')
 *
 * // Delete a cookie
 * await Cookies.delete(CookieKey.ACTIVE_WORKSPACE_ID)
 * ```
 */

import { cookies } from "next/headers";

/**
 * Supported cookie keys
 */
export enum CookieKey {
  ACTIVE_WORKSPACE_ID = "WORKSPACES:CURRENT:ID",
  ROUTE_INTENDED = "ROUTE:INTENDED",
}

/**
 * Cookie options for setting cookies
 */
interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  maxAge?: number;
  path?: string;
}

/**
 * Default cookie options
 */
const DEFAULT_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 365, // 1 year
  path: "/",
};

/**
 * Server-side cookie management utility
 */
export const Cookies = new (class {
  /**
   * Get a cookie value
   *
   * @param key - Cookie key from CookieKey enum
   * @returns Cookie value or undefined if not set
   *
   * @example
   * ```ts
   * const workspaceId = await Cookies.get(CookieKey.ACTIVE_WORKSPACE_ID)
   * ```
   */
  async get(key: CookieKey): Promise<string | undefined> {
    const cookieStore = await cookies();
    return cookieStore.get(key)?.value;
  }

  /**
   * Set a cookie value
   *
   * @param key - Cookie key from CookieKey enum
   * @param value - Cookie value to set
   * @param options - Optional cookie configuration
   *
   * @example
   * ```ts
   * await Cookies.set(CookieKey.ACTIVE_WORKSPACE_ID, 'org_123')
   *
   * // With custom options
   * await Cookies.set(CookieKey.ACTIVE_WORKSPACE_ID, 'org_123', {
   *   maxAge: 60 * 60 // 1 hour
   * })
   * ```
   */
  async set(
    key: CookieKey,
    value: string,
    options?: CookieOptions,
  ): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(key, value, { ...DEFAULT_OPTIONS, ...options });
  }

  /**
   * Delete a cookie
   *
   * @param key - Cookie key from CookieKey enum
   *
   * @example
   * ```ts
   * await Cookies.delete(CookieKey.ACTIVE_WORKSPACE_ID)
   * ```
   */
  async delete(key: CookieKey): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(key);
  }

  /**
   * Check if a cookie exists
   *
   * @param key - Cookie key from CookieKey enum
   * @returns True if cookie exists, false otherwise
   *
   * @example
   * ```ts
   * const hasWorkspace = await Cookies.has(CookieKey.ACTIVE_WORKSPACE_ID)
   * ```
   */
  async has(key: CookieKey): Promise<boolean> {
    const cookieStore = await cookies();
    return cookieStore.has(key);
  }
})();
