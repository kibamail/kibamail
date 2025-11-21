/**
 * Logto Authentication Configuration
 *
 * This file configures the Logto authentication service for your application.
 * Logto provides user management, social login, MFA, and role-based access control.
 *
 * All configuration values are loaded from validated environment variables
 * defined in env/schema.ts. This ensures type safety and proper validation
 * at application startup.
 *
 * @see https://docs.logto.io/docs/recipes/integrate-logto/next-js/
 * @see env/schema.ts - Environment variable definitions and validation
 *
 * ============================================================================
 * CONFIGURATION OVERVIEW
 * ============================================================================
 *
 * endpoint      - Your Logto instance URL (e.g., https://your-tenant.logto.app/)
 * appId         - Unique identifier for your application in Logto
 * appSecret     - Secret key for authenticating your app with Logto (keep secure!)
 * baseUrl       - Your application's base URL (for auth redirects)
 * cookieSecret  - 32-character secret for encrypting session cookies
 * cookieSecure  - Whether to only send cookies over HTTPS (true in production)
 *
 * ============================================================================
 * SETUP INSTRUCTIONS
 * ============================================================================
 *
 * 1. Create a Logto account at https://logto.io or self-host
 * 2. Create a new application in the Logto Console
 * 3. Copy the credentials to your .env file
 * 4. Configure redirect URIs in Logto Console:
 *    - http://localhost:18090/api/logto/sign-in-callback (development)
 *    - http://localhost:18090/api/logto/sign-out-callback (development)
 *    - https://yourdomain.com/api/logto/sign-in-callback (production)
 *    - https://yourdomain.com/api/logto/sign-out-callback (production)
 *
 * ============================================================================
 * SECURITY NOTES
 * ============================================================================
 *
 * - Never hardcode credentials in this file
 * - All values are loaded from environment variables
 * - Environment variables are validated at startup via env/schema.ts
 * - The appSecret should never be exposed to the client
 * - cookieSecure should always be true in production
 *
 * ============================================================================
 */

import type { LogtoNextConfig } from "@logto/next";
import { ReservedResource, UserScope } from "@logto/next";

import { env } from "@/env/schema";
import { RedisSessionWrapper } from "@/lib/auth/redis-session-wrapper";
/**
 * Logto Authentication Configuration
 *
 * This configuration object is passed to the Logto SDK to initialize
 * authentication services. All values are sourced from validated
 * environment variables.
 *
 * @property {string} endpoint - Logto instance endpoint URL
 * @property {string} appId - Application identifier from Logto Console
 * @property {string} appSecret - Application secret key (server-side only)
 * @property {string} baseUrl - Application base URL for redirects
 * @property {string} cookieSecret - 32-character secret for cookie encryption
 * @property {boolean} cookieSecure - Whether cookies require HTTPS
 */
export const logtoConfig = {
  /**
   * Logto Instance Endpoint
   *
   * The base URL of your Logto authentication service.
   * All authentication requests are sent to this endpoint.
   *
   * @example "https://your-tenant.logto.app/"
   */
  endpoint: env.LOGTO_ENDPOINT,

  /**
   * Application ID
   *
   * Unique identifier that tells Logto which application is making
   * the authentication request. Found in Logto Console under your
   * application's settings.
   *
   * @example "x1cozc7rcq25in9zyfakw"
   */
  appId: env.LOGTO_APP_ID,

  /**
   * Application Secret
   *
   * Secret key used to authenticate your application with Logto.
   * This is a sensitive value that should never be exposed to clients.
   *
   * ⚠️ SECURITY: Keep this secret! Only used server-side.
   *
   * @example "ZlfTyv4b0I2lWolNmSFAxKin2HT9Ftgn"
   */
  appSecret: env.LOGTO_APP_SECRET,

  /**
   * Application Base URL
   *
   * The base URL of your application. Logto uses this to redirect users
   * back to your app after authentication. Must match the redirect URIs
   * configured in your Logto Console.
   *
   * Development: http://localhost:18090
   * Production: https://yourdomain.com
   *
   * @example "http://localhost:18090"
   */
  baseUrl: env.LOGTO_BASE_URL,

  /**
   * Cookie Encryption Secret
   *
   * A 32-character secret used to encrypt session cookies. This ensures
   * that session data cannot be tampered with by clients.
   *
   * Generate using: openssl rand -base64 32 | head -c 32
   *
   * ⚠️ SECURITY: Must be exactly 32 characters. Rotating this logs out all users.
   *
   * @example "itxd3l3ji6zo7VQbZK8EHNAv86hcDb9U"
   */
  cookieSecret: env.LOGTO_COOKIE_SECRET,

  /**
   * Cookie Secure Flag
   *
   * When true, session cookies are only sent over HTTPS connections.
   * This prevents session hijacking and man-in-the-middle attacks.
   *
   * Automatically set based on environment:
   * - Development: false (allows http://localhost)
   * - Production: true (requires HTTPS)
   *
   * @example true
   */
  cookieSecure: env.LOGTO_COOKIE_SECURE,

  scopes: [
    UserScope.Email,
    UserScope.Identities,
    UserScope.Roles,
    UserScope.Organizations,
    UserScope.OrganizationRoles,
  ],

  resources: [ReservedResource.Organization],

  /**
   * Session Wrapper
   *
   * External session storage using Redis instead of encrypted cookies.
   * This is useful when session data grows too large for cookies, especially
   * when maintaining multiple active organization sessions simultaneously.
   *
   * The RedisSessionWrapper stores session data in Redis with:
   * - Automatic expiration (90 days)
   * - UUID-based session identification
   * - TTL refresh on each access (extends session lifetime for active users)
   *
   * @see lib/auth/redis-session-wrapper.ts
   */
  sessionWrapper: new RedisSessionWrapper(),
} satisfies LogtoNextConfig;

/**
 * Logto Configuration Type
 *
 * TypeScript type for the Logto configuration object.
 * Useful for type checking and IDE autocomplete.
 *
 * @example
 * ```typescript
 * import type { LogtoConfig } from '@/config/logto'
 *
 * function initializeAuth(config: LogtoConfig) {
 *   // ...
 * }
 * ```
 */
export type LogtoConfig = typeof logtoConfig;
