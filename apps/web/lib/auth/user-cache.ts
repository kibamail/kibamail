/**
 * User Data Caching Service
 *
 * Provides Redis-based caching for user profiles, organizations, and related data
 * fetched from Logto. This reduces API calls and improves performance.
 *
 * Cache Structure:
 * - `user:{userId}` -> User profile data
 * - `user:{userId}:orgs` -> Array of { orgId, roleIds[] }
 * - `org:{orgId}` -> Organization details
 *
 * @example
 * ```ts
 * import { getUserWithOrganizations, invalidateUserCache } from '@/lib/auth/user-cache';
 *
 * // Get user data with caching
 * const userData = await getUserWithOrganizations(userId);
 *
 * // Invalidate cache when data changes
 * await invalidateUserCache(userId);
 * await invalidateOrganizationCache(orgId);
 * ```
 */

import { logto } from "@/auth/logto";
import { getRedisClient } from "@/lib/storage/redis-client";

const redis = getRedisClient();

// Cache TTL: 1 hour (in seconds)
const CACHE_TTL = 60 * 60;

/**
 * Redis Cache Keys
 */
const CacheKeys = {
  userProfile: (userId: string) => `user:${userId}`,
  userOrganizations: (userId: string) => `user:${userId}:orgs`,
  organization: (orgId: string) => `org:${orgId}`,
};

/**
 * User Profile Data
 */
export type CachedUserProfile = {
  id: string;
  username: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  name: string | null;
  avatar: string | null;
  customData: Record<string, unknown>;
  identities: Record<string, unknown>;
  lastSignInAt: number | null;
  createdAt: number;
  updatedAt: number;
  profile: Record<string, unknown>;
  applicationId: string | null;
  isSuspended: boolean;
};

/**
 * User Organization Membership
 */
export type CachedUserOrganization = {
  orgId: string;
  roleIds: string[];
  roleNames: string[];
};

/**
 * Organization Details
 */
export type CachedOrganization = {
  id: string;
  name: string;
  description: string | null;
  customData: Record<string, unknown>;
  createdAt: number;
  branding?: {
    logoUrl?: string;
    darkLogoUrl?: string;
    favicon?: string;
    darkFavicon?: string;
  };
};

/**
 * Complete User Data with Organizations
 */
export type UserWithOrganizations = {
  user: CachedUserProfile;
  organizations: Array<
    CachedOrganization & { roleIds: string[]; roleNames: string[] }
  >;
};

/**
 * Get User Profile from Cache or Logto
 *
 * @param userId - The user ID
 * @returns User profile data
 */
async function getUserProfile(userId: string): Promise<CachedUserProfile> {
  const cacheKey = CacheKeys.userProfile(userId);

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const user = await logto.users().get(userId);

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  await redis.set(cacheKey, JSON.stringify(user), "EX", CACHE_TTL);

  return user as CachedUserProfile;
}

/**
 * Get User Organization Memberships from Cache or Logto
 *
 * Returns an array of organization IDs with the user's role IDs in each org.
 *
 * @param userId - The user ID
 * @returns Array of organization memberships
 */
async function getUserOrganizationMemberships(
  userId: string,
): Promise<CachedUserOrganization[]> {
  const cacheKey = CacheKeys.userOrganizations(userId);

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const organizations = await logto.users().organizations(userId);

  if (!organizations) {
    return [];
  }

  const memberships: CachedUserOrganization[] = organizations.map((org) => ({
    orgId: org.id,
    roleIds: org.organizationRoles?.map((role) => role.id) || [],
    roleNames: org.organizationRoles?.map((role) => role.name) || [],
  }));

  await redis.set(cacheKey, JSON.stringify(memberships), "EX", CACHE_TTL);

  return memberships;
}

/**
 * Get Organization Details from Cache or Logto
 *
 * @param orgId - The organization ID
 * @returns Organization details
 */
async function getOrganizationDetails(
  orgId: string,
): Promise<CachedOrganization> {
  const cacheKey = CacheKeys.organization(orgId);

  const cached = await redis.get(cacheKey);

  if (cached) return JSON.parse(cached) as CachedOrganization;

  const organization = await logto.workspaces().get(orgId);

  if (!organization) throw new Error(`Organization not found: ${orgId}`);

  await redis.set(cacheKey, JSON.stringify(organization), "EX", CACHE_TTL);

  return organization as CachedOrganization;
}

/**
 * Get User with All Organizations
 *
 * Fetches user profile and all their organization memberships with full
 * organization details. Uses Redis caching to minimize Logto API calls.
 *
 * This is the main method to use for getting complete user data.
 *
 * @param userId - The user ID
 * @returns Complete user data with organizations
 *
 * @example
 * ```ts
 * const userData = await getUserWithOrganizations('user-123');
 * console.log(userData.user.primaryEmail);
 * console.log(userData.organizations[0].name);
 * console.log(userData.organizations[0].roleIds);
 * ```
 */
export async function getUserWithOrganizations(
  userId: string,
): Promise<UserWithOrganizations> {
  const [user, memberships] = await Promise.all([
    getUserProfile(userId),
    getUserOrganizationMemberships(userId),
  ]);

  const organizations = await Promise.all(
    memberships.map((membership) =>
      getOrganizationDetails(membership.orgId).then((org) => ({
        ...org,
        roleIds: membership.roleIds,
        roleNames: membership.roleNames,
      })),
    ),
  );

  return {
    user,
    organizations,
  };
}

/**
 * Invalidate User Cache
 *
 * Removes all cached data for a specific user. Call this when user data
 * is updated in Logto.
 *
 * @param userId - The user ID
 *
 * @example
 * ```ts
 * // After updating user profile
 * await logto.users().update(userId, { name: 'New Name' });
 * await invalidateUserCache(userId);
 * ```
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await Promise.all([
    redis.del(CacheKeys.userProfile(userId)),
    redis.del(CacheKeys.userOrganizations(userId)),
  ]);
}

/**
 * Invalidate Organization Cache
 *
 * Removes cached data for a specific organization. Call this when
 * organization data is updated in Logto.
 *
 * @param orgId - The organization ID
 *
 * @example
 * ```ts
 * // After updating organization
 * await logto.workspaces().update(orgId, { name: 'New Name' });
 * await invalidateOrganizationCache(orgId);
 * ```
 */
export async function invalidateOrganizationCache(
  orgId: string,
): Promise<void> {
  await redis.del(CacheKeys.organization(orgId));
}

/**
 * Invalidate User Organization Membership
 *
 * Removes cached organization membership data for a user. Call this when
 * a user is added to or removed from an organization.
 *
 * @param userId - The user ID
 *
 * @example
 * ```ts
 * // After adding user to organization
 * await logto.workspaces().members(orgId).add(userId, roleIds);
 * await invalidateUserOrganizationMembership(userId);
 * ```
 */
export async function invalidateUserOrganizationMembership(
  userId: string,
): Promise<void> {
  await redis.del(CacheKeys.userOrganizations(userId));
}
