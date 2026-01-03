import type { Permission } from "@/config/rbac";
import { UnauthorizedError } from "@/lib/api/errors";
import type { UserSession } from "@/lib/auth/get-session";

export function hasPermission(
  session: UserSession,
  permission: Permission,
): boolean {
  return session.permissions.includes(permission);
}

export function requirePermissions(
  session: UserSession,
  permission: Permission,
): void {
  if (!hasPermission(session, permission)) {
    throw new UnauthorizedError(`Requires permission: ${permission}`);
  }
}
