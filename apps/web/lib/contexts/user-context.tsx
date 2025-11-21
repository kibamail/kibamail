/**
 * User Context Provider
 *
 * Provides global access to authenticated user and organization data
 * across client components. This context receives data from server
 * components and makes it available via React hooks.
 *
 * @example
 * ```tsx
 * // In a server component (layout.tsx)
 * import { getSession } from '@/lib/auth/get-session'
 * import { UserProvider } from '@/lib/contexts/user-context'
 *
 * export default async function Layout({ children }) {
 *   const session = await getSession()
 *   return <UserProvider session={session}>{children}</UserProvider>
 * }
 *
 * // In a client component
 * 'use client'
 * import { useUser, useOrganization } from '@/lib/contexts/user-context'
 *
 * function ProfileButton() {
 *   const user = useUser()
 *   return <button>{user.email}</button>
 * }
 *
 * function OrgSelector() {
 *   const org = useOrganization()
 *   return <div>{org?.name || 'No organization'}</div>
 * }
 * ```
 */

"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { UserSession } from "@/lib/auth/get-session";

type UserContextValue = UserSession;

const UserContext = createContext<UserContextValue | null>(null);

export interface UserProviderProps {
  /**
   * Session data fetched from server component
   */
  session: UserSession;
  children: ReactNode;
}

/**
 * User Provider Component
 *
 * Wraps the application (or a section) to provide user session data
 * to all child components. This should be used in a server component
 * that has already fetched the session data.
 *
 * @param props.session - User session data from getSession()
 * @param props.children - Child components that will have access to user context
 */
export function UserProvider({ session, children }: UserProviderProps) {
  return (
    <UserContext.Provider value={session}>{children}</UserContext.Provider>
  );
}

/**
 * Get the full user session
 *
 * Returns the complete session object including user and organizations.
 * Throws an error if used outside of UserProvider.
 *
 * @returns User session data
 * @throws Error if used outside UserProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const session = useSession()
 *   return (
 *     <div>
 *       <p>User: {session.user.email}</p>
 *       <p>Org: {session.currentOrganization?.name}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useSession(): UserSession {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useSession must be used within a UserProvider");
  }
  return context;
}

/**
 * Get the current user data
 *
 * Convenience hook to access just the user information without
 * the full session object.
 *
 * @returns User data (sub, email, name, etc.)
 * @throws Error if used outside UserProvider
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const user = useUser()
 *   return (
 *     <div>
 *       <img src={user.picture} alt={user.name} />
 *       <p>{user.email}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useUser() {
  const session = useSession();
  return session.user;
}

/**
 * Get the current organization data
 *
 * Returns the active organization, or null if the user has no organizations.
 * Convenience hook for accessing organization info.
 *
 * @returns Current organization or null
 * @throws Error if used outside UserProvider
 *
 * @example
 * ```tsx
 * function OrgHeader() {
 *   const org = useOrganization()
 *   if (!org) {
 *     return <p>No organization selected</p>
 *   }
 *   return <h1>{org.name}</h1>
 * }
 * ```
 */
export function useOrganization() {
  const session = useSession();
  return session.currentOrganization;
}

/**
 * Get all organizations the user belongs to
 *
 * Returns an array of all organizations. Useful for organization
 * switchers or multi-org features.
 *
 * @returns Array of organizations
 * @throws Error if used outside UserProvider
 *
 * @example
 * ```tsx
 * function OrgSwitcher() {
 *   const orgs = useOrganizations()
 *   return (
 *     <select>
 *       {orgs.map(org => (
 *         <option key={org.id} value={org.id}>{org.name}</option>
 *       ))}
 *     </select>
 *   )
 * }
 * ```
 */
export function useOrganizations() {
  const session = useSession();
  return session.organizations;
}
