/**
 * Permission Helper Functions
 *
 * Utility functions for checking user permissions in authenticated sessions.
 *
 * @example
 * ```typescript
 * import { requirePermissions, hasPermission } from '@/lib/auth/permissions'
 * import { getSession } from '@/lib/auth/get-session'
 *
 * // Check if user has permission (throws if not)
 * const session = await getSession()
 * requirePermissions(session, "manage:members")
 *
 * // Check if user has permission (returns boolean)
 * if (hasPermission(session, "manage:billing")) {
 *   // Show billing UI
 * }
 * ```
 */

import type { Permission } from "@/config/rbac";
import type { UserSession } from "./get-session";
import { UnauthorizedError } from "../api/errors";

/**
 * Check if user has a specific permission
 *
 * Returns a boolean indicating whether the user's session includes the specified permission.
 * This is useful for conditional UI rendering or logic branching.
 *
 * @param session - The user session containing permissions
 * @param permission - The permission to check for
 * @returns True if user has the permission, false otherwise
 *
 * @example
 * ```typescript
 * const session = await getSession()
 *
 * if (hasPermission(session, "manage:billing")) {
 *   // Show billing management UI
 * }
 *
 * const canDelete = hasPermission(session, "delete:workspace")
 * ```
 */
export function hasPermission(
  session: UserSession,
  permission: Permission,
): boolean {
  return session.permissions.includes(permission);
}

/**
 * Require user to have a specific permission
 *
 * Throws an UnauthorizedError if the user doesn't have the specified permission.
 * Use this in API route handlers and server actions to enforce permission checks.
 *
 * @param session - The user session containing permissions
 * @param permission - The permission to require
 * @throws UnauthorizedError if user lacks the permission
 *
 * @example
 * ```typescript
 * // In an API route handler
 * export async function DELETE(request: NextRequest) {
 *   return withErrorHandling(request, () =>
 *     withSession(request, async (session) => {
 *       requirePermissions(session, "delete:workspace")
 *       // User has permission, proceed with deletion
 *       await deleteWorkspace()
 *       return responseOk({})
 *     })
 *   )
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In a server action
 * export async function updateBilling(data: BillingData) {
 *   const session = await getSession()
 *   requirePermissions(session, "manage:billing")
 *   // User has permission, proceed with update
 *   await updateBillingInfo(data)
 * }
 * ```
 */
export function requirePermissions(
  session: UserSession,
  permission: Permission,
): void {
  if (!hasPermission(session, permission)) {
    throw new UnauthorizedError(`Requires permission: ${permission}`);
  }
}
