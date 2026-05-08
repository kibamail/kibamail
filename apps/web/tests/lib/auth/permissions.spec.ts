/**
 * Tests for the auth permission helpers (hasPermission, requirePermissions).
 *
 * These two tiny functions are wrapped around almost every privileged code path
 * (route handlers, server actions). A regression — for example, mistakenly
 * returning true on missing permissions, or throwing the wrong error class —
 * silently bypasses RBAC on every protected endpoint at once. They are pure
 * over the session.permissions array, so we test the contract directly.
 */

import { describe, expect, test } from "vitest";
import type { Permission } from "@/config/rbac";
import { ForbiddenError } from "@/lib/api/errors";
import type { UserSession } from "@/lib/auth/get-session";
import { hasPermission, requirePermissions } from "@/lib/auth/permissions";

function makeSession(permissions: Permission[]): UserSession {
  return {
    permissions,
  } as unknown as UserSession;
}

describe("hasPermission", () => {
  test("returns true when the permission is in the session", () => {
    const session = makeSession(["read:contacts", "manage:contacts"]);
    expect(hasPermission(session, "read:contacts")).toBe(true);
    expect(hasPermission(session, "manage:contacts")).toBe(true);
  });

  test("returns false when the permission is not present", () => {
    const session = makeSession(["read:contacts"]);
    expect(hasPermission(session, "manage:contacts")).toBe(false);
  });

  test("returns false on an empty permissions list", () => {
    const session = makeSession([]);
    expect(hasPermission(session, "read:workspace")).toBe(false);
  });

  test("does not match on prefix or substring", () => {
    // Guards against regressions like Array.some(p => permission.startsWith(p))
    const session = makeSession(["read:contacts"]);
    expect(hasPermission(session, "read:contac" as Permission)).toBe(false);
    expect(hasPermission(session, "read:contacts:extra" as Permission)).toBe(
      false,
    );
  });
});

describe("requirePermissions", () => {
  test("returns void without throwing when the permission is granted", () => {
    const session = makeSession(["manage:workspace"]);
    expect(() => requirePermissions(session, "manage:workspace")).not.toThrow();
  });

  test("throws ForbiddenError when the permission is missing", () => {
    const session = makeSession(["read:workspace"]);
    expect(() => requirePermissions(session, "manage:workspace")).toThrow(
      ForbiddenError,
    );
  });

  test("error message includes the missing permission for easier debugging", () => {
    const session = makeSession([]);
    try {
      requirePermissions(session, "delete:workspace");
      throw new Error("expected requirePermissions to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError);
      expect((err as Error).message).toContain("delete:workspace");
    }
  });

  test("ForbiddenError carries the 403 status code (regression check on the error class)", () => {
    const session = makeSession([]);
    try {
      requirePermissions(session, "manage:billing");
      throw new Error("expected throw");
    } catch (err) {
      expect((err as ForbiddenError).statusCode).toBe(403);
    }
  });
});
