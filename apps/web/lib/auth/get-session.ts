/**
 * Server-Side Session Helper
 *
 * Centralized function to retrieve authenticated user and organization data
 * from Logto. This eliminates repetitive Logto API calls across server components.
 *
 * @example
 * ```tsx
 * // In a server component
 * import { getSession } from '@/lib/auth/get-session'
 *
 * export default async function Page() {
 *   const session = await getSession()
 *   return <div>Welcome {session.user.email}</div>
 * }
 * ```
 */

"use server";

import { getLogtoContext } from "@logto/next/server-actions";
import type { IdTokenClaims } from "@logto/node";
import { redirect } from "next/navigation";
import { logtoConfig } from "@/config/logto";
import { type Permission, ROLES } from "@/config/rbac";
import { UnauthorizedError } from "@/lib/api/errors";
import { getUserWithOrganizations } from "@/lib/auth/user-cache";
import { CookieKey, Cookies } from "@/lib/cookies";

export type UserSession = {
  user: {
    sub: string;
    email: string;
    emailVerified?: boolean;
    name?: string | null;
    picture?: string | null;
    username?: string | null;
  };
  claims: IdTokenClaims | undefined;
  organizations: Array<{
    id: string;
    name: string;
    description: string | null;
    branding?: {
      logoUrl?: string;
      darkLogoUrl?: string;
      favicon?: string;
      darkFavicon?: string;
    };
  }>;
  currentOrganization: {
    id: string;
    name: string;
    description: string | null;
    branding?: {
      logoUrl?: string;
      darkLogoUrl?: string;
      favicon?: string;
      darkFavicon?: string;
    };
  } | null;
  permissions: Permission[];
};

/**
 * Get the current authenticated user session
 *
 * Fetches user info and organization data from Redis cache or Logto.
 * Uses a multi-layer caching strategy to minimize API calls.
 *
 * If the user is not authenticated, automatically redirects to /api/auth/signin
 * which initiates the Logto sign-in flow.
 *
 * @param options.redirectIfUnauthenticated - Whether to redirect if not authenticated (default: true)
 * @returns User session data including user info and organizations
 * @throws Redirects to /api/auth/signin if user is not authenticated (when redirectIfUnauthenticated is true)
 *
 * @example
 * ```tsx
 * const session = await getSession()
 * console.log(session.user.email) // "user@example.com"
 * console.log(session.currentOrganization?.name) // "Acme Corp"
 * ```
 */
export async function getSession(): Promise<UserSession> {
  try {
    const ctx = await getLogtoContext(logtoConfig);

    if (!ctx.isAuthenticated) {
      throw new UnauthorizedError("User is not authenticated");
    }

    const userId = ctx.claims?.sub;
    if (!userId) {
      throw new Error("User ID not found in claims");
    }

    // Fetch user data with caching
    const userData = await getUserWithOrganizations(userId);

    // Transform cached data to UserSession format
    const organizations = userData.organizations.map((org) => ({
      id: org.id,
      name: org.name,
      description: org.description,
      branding: org.branding,
    }));

    // Get active workspace from cookie
    const activeWorkspaceId = await Cookies.get(CookieKey.ACTIVE_WORKSPACE_ID);

    let currentOrganization: UserSession["currentOrganization"] = null;

    if (activeWorkspaceId) {
      currentOrganization =
        organizations.find((org) => org.id === activeWorkspaceId) || null;
    }

    if (!currentOrganization && organizations.length > 0) {
      currentOrganization = organizations[0];
    }

    const permissions: Permission[] = [];

    if (currentOrganization) {
      const currentOrgData = userData.organizations.find(
        (org) => org.id === currentOrganization.id,
      );

      if (currentOrgData && currentOrgData.roleNames.length > 0) {
        for (const roleName of currentOrgData.roleNames) {
          const role = ROLES.find((r) => r.name === roleName);
          if (role) {
            permissions.push(...(role.permissions as Permission[]));
          }
        }
      }
    }

    const uniquePermissions = Array.from(new Set(permissions));

    return {
      user: {
        sub: userData.user.id,
        email: userData.user.primaryEmail || "",
        emailVerified: true,
        name: userData.user.name,
        picture: userData.user.avatar,
        username: userData.user.username,
      },
      claims: ctx.claims,
      organizations,
      currentOrganization,
      permissions: uniquePermissions,
    };
  } catch (error) {
    console.error(error);
    redirect("/");
  }
}

/**
 * Check if the current user is authenticated
 *
 * Lightweight function to check authentication status without fetching
 * full user info. Useful for conditional rendering or route guards.
 *
 * @returns Boolean indicating if user is authenticated
 *
 * @example
 * ```tsx
 * const isAuth = await isAuthenticated()
 * if (!isAuth) {
 *   redirect('/login')
 * }
 * ```
 */
export async function isAuthenticated(): Promise<boolean> {
  const ctx = await getLogtoContext(logtoConfig);
  return ctx.isAuthenticated;
}
