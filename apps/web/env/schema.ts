/**
 * Environment Variables Schema
 *
 * This file defines and validates all environment variables used in the application.
 * It uses @t3-oss/env-nextjs for runtime validation and TypeScript type inference,
 * ensuring that your environment is correctly configured before the application starts.
 *
 * @see https://env.t3.gg/docs/introduction - T3 Env documentation
 * @see https://zod.dev - Zod documentation
 *
 * ============================================================================
 * HOW IT WORKS
 * ============================================================================
 *
 * The @t3-oss/env-nextjs package provides type-safe environment variables by:
 *
 * 1. Separating server-side and client-side environment variables
 * 2. Validating all variables against Zod schemas at build time
 * 3. Providing full TypeScript type inference
 * 4. Preventing accidental exposure of server variables to the client
 *
 * Server variables: Available only in server-side code (API routes, SSR, etc.)
 * Client variables: Must be prefixed with NEXT_PUBLIC_ and are exposed to the browser
 *
 * ============================================================================
 * HOW TO ADD NEW ENVIRONMENT VARIABLES
 * ============================================================================
 *
 * SERVER-SIDE VARIABLES (secrets, API keys, database URLs):
 *
 * 1. Add to the `server` object with Zod validation:
 *
 *    ```typescript
 *    server: {
 *      YOUR_SECRET_KEY: z.string().min(1),
 *    }
 *    ```
 *
 * 2. Add to your .env file (no NEXT_PUBLIC_ prefix needed)
 * 3. Use anywhere in server code: `env.YOUR_SECRET_KEY`
 *
 * CLIENT-SIDE VARIABLES (public configuration, API endpoints):
 *
 * 1. Add to the `client` object with Zod validation:
 *
 *    ```typescript
 *    client: {
 *      NEXT_PUBLIC_API_URL: z.string().url(),
 *    }
 *    ```
 *
 * 2. Add to `runtimeEnv` object:
 *
 *    ```typescript
 *    runtimeEnv: {
 *      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
 *    }
 *    ```
 *
 * 3. Add to your .env file with NEXT_PUBLIC_ prefix
 * 4. Use in both client and server code: `env.NEXT_PUBLIC_API_URL`
 *
 * � IMPORTANT: Client variables are exposed to the browser. Never put secrets there!
 *
 * ============================================================================
 * VALIDATION EXAMPLES
 * ============================================================================
 *
 * String (required):
 *   z.string().min(1, "Field is required")
 *
 * String (optional):
 *   z.string().optional()
 *
 * String (with default):
 *   z.string().default("default-value")
 *
 * URL (validates format):
 *   z.string().url("Must be a valid URL")
 *
 * Email:
 *   z.string().email("Must be a valid email")
 *
 * Number:
 *   z.coerce.number().int().positive()
 *
 * Enum (specific values):
 *   z.enum(["development", "staging", "production"])
 *
 * Boolean:
 *   z.string().transform((val) => val === "true")
 *   // Or with coercion:
 *   z.coerce.boolean()
 *
 * Port number:
 *   z.coerce.number().int().min(1).max(65535)
 *
 * ============================================================================
 * USAGE EXAMPLES
 * ============================================================================
 *
 * In server components or API routes:
 * ```typescript
 * import { env } from '@/env/schema'
 *
 * const db = createConnection(env.DATABASE_URL)
 * const logtoClient = new LogtoClient({
 *   endpoint: env.LOGTO_ENDPOINT,
 *   appId: env.LOGTO_APP_ID,
 * })
 * ```
 *
 * In client components:
 * ```typescript
 * import { env } from '@/env/schema'
 *
 * //  Works - client variable
 * fetch(env.NEXT_PUBLIC_API_URL)
 *
 * // L Error - server-only variable
 * console.log(env.DATABASE_URL) // TypeScript error + runtime error
 * ```
 *
 * ============================================================================
 */

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Environment Variables Configuration
 *
 * Creates a validated and type-safe environment object using @t3-oss/env-nextjs.
 * Import this anywhere in your application to access environment variables safely.
 */
export const env = createEnv({
  /**
   * Server-side Environment Variables
   *
   * These variables are only available on the server (API routes, server components,
   * server actions, etc.). They are never exposed to the client bundle.
   *
   * Use these for:
   * - Database credentials
   * - API secrets and keys
   * - Authentication secrets
   * - Any sensitive configuration
   */
  server: {
    /**
     * Node Environment
     *
     * Specifies the current runtime environment.
     *
     * @default "development"
     * @example "production"
     */
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),

    /**
     * Database Connection URL
     *
     * MySQL connection string used to connect to your database.
     * Must be a valid connection URL with protocol, credentials, host, and database name.
     *
     * Format: postgresql://[user[:password]@][host][:port][/dbname][?param1=value1&...]
     *
     * @example "mysql://user:password@localhost:5432/mydb"
     */
    DATABASE_URL: z
      .url("DATABASE_URL must be a valid URL")
      .refine(
        (url) => url.startsWith("mysql://"),
        "DATABASE_URL must be a Mysql connection string"
      ),

    // ============================================================================
    // LOGTO AUTHENTICATION CONFIGURATION
    // ============================================================================
    // Logto is an open-source authentication service that provides user management,
    // social login, MFA, and more. These variables configure the Logto SDK.
    // @see https://docs.logto.io

    /**
     * Logto Tenant ID
     *
     * The unique identifier for your Logto tenant. This is used for
     * Management API operations and organization management.
     *
     * Find this in: Logto Console → Tenant Settings
     *
     * @example "nol94f"
     * @see https://docs.logto.io/integrate-logto/interact-with-management-api
     */
    LOGTO_TENANT_ID: z
      .string()
      .min(1, "LOGTO_TENANT_ID is required")
      .describe("Logto tenant identifier"),

    /**
     * Logto Endpoint
     *
     * The base URL of your Logto instance. This is where all authentication
     * requests will be sent. You can find this in your Logto console.
     *
     * Must use HTTPS in production for security.
     *
     * @example "https://your-tenant.logto.app/"
     * @see https://docs.logto.io/docs/recipes/integrate-logto/next-js/
     */
    LOGTO_ENDPOINT: z
      .url("LOGTO_ENDPOINT must be a valid URL")
      .refine((url) => {
        // Allow http in development and test
        if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
          return true;
        }
        // Require https in production
        return url.startsWith("https://");
      }, "LOGTO_ENDPOINT must use HTTPS in production"),

    /**
     * Logto Application ID
     *
     * Unique identifier for your application in Logto. This is generated when
     * you create an application in the Logto console. It identifies your app
     * to the Logto authentication service.
     *
     * Find this in: Logto Console � Applications � Your App � App Info
     *
     * @example "x1cozc7rcq25in9zyfakw"
     * @see https://docs.logto.io/docs/recipes/integrate-logto/next-js/#configure-logto
     */
    LOGTO_APP_ID: z
      .string()
      .min(1, "LOGTO_APP_ID is required")
      .describe("Logto application identifier"),

    /**
     * Logto Application Secret
     *
     * Secret key used to authenticate your application with Logto. This should
     * be kept secure and never committed to version control. Treat this like a
     * password - if compromised, rotate it immediately in the Logto console.
     *
     * Find this in: Logto Console � Applications � Your App � App Secret
     *
     * � SECURITY WARNING:
     * - Never expose this in client-side code
     * - Never commit to version control
     * - Rotate immediately if compromised
     * - Use different secrets for each environment
     *
     * @example "ZlfTyv4b0I2lWolNmSFAxKin2HT9Ftgn"
     * @see https://docs.logto.io/docs/recipes/integrate-logto/next-js/#configure-logto
     */
    LOGTO_APP_SECRET: z
      .string()
      .min(32, "LOGTO_APP_SECRET must be at least 32 characters for security")
      .describe("Logto application secret key"),

    /**
     * Application Base URL
     *
     * The base URL where your application is hosted. This is used by Logto
     * to redirect users after authentication. In development, this is typically
     * http://localhost:3000. In production, use your production domain.
     *
     * Must match the redirect URI configured in your Logto application settings.
     *
     * Configure redirect URIs in: Logto Console � Applications � Your App � Redirect URIs
     *
     * Common values:
     * - Development: http://localhost:3000
     * - Production: https://yourdomain.com
     *
     * � IMPORTANT:
     * - Must match redirect URI in Logto console exactly
     * - Must use HTTPS in production
     * - No trailing slash
     *
     * @example "http://localhost:3000" (development)
     * @example "https://yourdomain.com" (production)
     * @see https://docs.logto.io/docs/recipes/integrate-logto/next-js/#configure-redirect-uris
     */
    LOGTO_BASE_URL: z
      .url("LOGTO_BASE_URL must be a valid URL")
      .refine((url) => {
        // Allow http://localhost in development and test
        if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
          return true;
        }
        // Require https in production
        return url.startsWith("https://");
      }, "LOGTO_BASE_URL must use HTTPS in production"),

    /**
     * Logto Cookie Secret
     *
     * A cryptographically secure random string used to encrypt session cookies.
     * This must be exactly 32 characters long for security.
     *
     * Generate a secure secret using one of these methods:
     *
     * ```bash
     * # Using OpenSSL
     * openssl rand -base64 32 | head -c 32
     *
     * # Using Node.js
     * node -e "console.log(require('crypto').randomBytes(32).toString('base64').slice(0, 32))"
     * ```
     *
     * � SECURITY BEST PRACTICES:
     * - Must be exactly 32 characters
     * - Use a cryptographically secure random generator
     * - Different secret for each environment (dev, staging, prod)
     * - Never commit to version control
     * - Rotating this will invalidate all existing user sessions
     * - Store securely in environment variables or secrets manager
     *
     * @example "itxd3l3ji6zo7VQbZK8EHNAv86hcDb9U"
     * @see https://docs.logto.io/docs/recipes/integrate-logto/next-js/#configure-logto
     */
    LOGTO_COOKIE_SECRET: z
      .string()
      .length(32, "LOGTO_COOKIE_SECRET must be exactly 32 characters")
      .describe("Secret used to encrypt session cookies"),

    /**
     * Logto Cookie Secure Flag
     *
     * Determines whether session cookies should only be sent over HTTPS connections.
     * This is a critical security setting.
     *
     * When "true": Cookies only sent over HTTPS (prevents man-in-the-middle attacks)
     * When "false": Cookies sent over HTTP (allows local development)
     *
     * � SECURITY:
     * - Always "true" in production
     * - Can be "false" in local development (http://localhost)
     * - Helps prevent session hijacking and cookie theft
     *
     * @default "false" in development, "true" in production
     * @example "true"
     */
    LOGTO_COOKIE_SECURE: z
      .preprocess(
        (val) =>
          val ?? (process.env.NODE_ENV === "production" ? "true" : "false"),
        z.string().transform((val) => val === "true")
      )
      .describe("Whether to only send cookies over HTTPS"),

    // ============================================================================
    // LOGTO MANAGEMENT API (M2M) CONFIGURATION
    // ============================================================================
    // Machine-to-Machine credentials for accessing Logto Management API.
    // Required for programmatic organization management, user role assignment, etc.
    // @see https://docs.logto.io/integrate-logto/interact-with-management-api

    /**
     * Logto Management API App ID
     *
     * Machine-to-Machine application ID for accessing Logto Management API.
     * Used to programmatically create organizations, manage members, and assign roles.
     *
     * Setup:
     * 1. Go to Logto Console → Applications → Create Application
     * 2. Select "Machine-to-machine" type
     * 3. Assign "Logto Management API access" role
     * 4. Copy the App ID
     *
     * ⚠️ SECURITY: This grants admin access to Logto. Keep it secure.
     *
     * @example "m2m_abc123def456"
     * @see https://docs.logto.io/quick-starts/m2m
     */
    LOGTO_M2M_APP_ID: z
      .string()
      .min(1, "LOGTO_M2M_APP_ID is required")
      .describe("Logto M2M application ID for Management API"),

    /**
     * Logto Management API App Secret
     *
     * Secret key for the M2M application.
     * Used to authenticate requests to Logto Management API.
     *
     * ⚠️ SECURITY WARNING:
     * - This provides full admin access to your Logto tenant
     * - Never commit to version control
     * - Never expose in client-side code
     * - Rotate immediately if compromised
     *
     * @example "secret_xyz789abc123"
     * @see https://docs.logto.io/quick-starts/m2m
     */
    LOGTO_M2M_APP_SECRET: z
      .string()
      .min(32, "LOGTO_M2M_APP_SECRET must be at least 32 characters")
      .describe("Logto M2M application secret for Management API"),

    // ============================================================================
    // OUTPOST WEBHOOK DELIVERY CONFIGURATION
    // ============================================================================
    // Hookdeck Outpost is an open-source webhook delivery service that provides
    // reliable webhook delivery, logging, and monitoring capabilities.
    // @see https://hookdeck.com/docs/outpost

    // ============================================================================
    // REDIS CONFIGURATION
    // ============================================================================
    // Redis is used for caching, session storage, and queue management.
    // Configure connection details for your Redis instance.

    /**
     * Redis Host
     *
     * The hostname or IP address where Redis is running.
     *
     * Common values:
     * - Development (Docker): redis
     * - Development (local): localhost
     * - Production: redis.yourdomain.com or IP address
     *
     * @example "redis"
     * @default "redis"
     */
    REDIS_HOST: z
      .string()
      .min(1, "REDIS_HOST is required")
      .default("redis")
      .describe("Redis server hostname"),

    /**
     * Redis Port
     *
     * The port number where Redis is listening.
     * Standard Redis port is 6379.
     *
     * @example "6379"
     * @default "6379"
     */
    REDIS_PORT: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1).max(65535))
      .default(6379)
      .describe("Redis server port"),

    /**
     * Redis Password
     *
     * Password for authenticating with Redis.
     * Use a strong password in production.
     *
     * Generate a secure password using:
     * ```bash
     * openssl rand -base64 32
     * ```
     *
     * ⚠️ SECURITY:
     * - Use a strong password in production
     * - Never commit to version control
     * - Rotate periodically
     *
     * @example "password"
     */
    REDIS_PASSWORD: z
      .string()
      .min(1, "REDIS_PASSWORD is required")
      .describe("Redis authentication password"),

    /**
     * Redis Database
     *
     * Redis database number to use (0-15).
     * Different databases can be used to isolate data.
     *
     * @example "0"
     * @default "0"
     */
    REDIS_DATABASE: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(0).max(15))
      .default(0)
      .describe("Redis database number"),

    // ============================================================================
    // OUTPOST WEBHOOK DELIVERY CONFIGURATION
    // ============================================================================
    // Hookdeck Outpost is an open-source webhook delivery service that provides
    // reliable webhook delivery, logging, and monitoring capabilities.
    // @see https://hookdeck.com/docs/outpost

    /**
     * Outpost API URL
     *
     * The base URL where the Outpost API service is accessible.
     * This is used by the Next.js application to communicate with Outpost
     * for webhook delivery operations.
     *
     * Common values:
     * - Development (Docker): http://localhost:3333
     * - Production: https://outpost.yourdomain.com
     *
     * Must be a valid URL pointing to the Outpost API service.
     *
     * @example "http://localhost:3333"
     * @see https://hookdeck.com/docs/outpost
     */
    OUTPOST_API_URL: z
      .string()
      .url("OUTPOST_API_URL must be a valid URL")
      .describe("Outpost API service base URL"),

    /**
     * Outpost API Key
     *
     * API key for authenticating requests to the Outpost webhook delivery service.
     * This key is used by both the Outpost services (running in Docker) and your
     * Next.js application to securely communicate with the webhook delivery system.
     *
     * Generate a secure random key:
     * ```bash
     * openssl rand -base64 32
     * ```
     *
     * ⚠️ SECURITY:
     * - Keep this secret and never commit to version control
     * - Use different keys for each environment (dev/staging/prod)
     * - Rotate immediately if compromised
     * - Used for authenticating webhook delivery requests
     *
     * @example "base64-encoded-random-string-here"
     * @see https://hookdeck.com/docs/outpost
     */
    OUTPOST_API_KEY: z
      .string()
      .min(1, "OUTPOST_API_KEY is required")
      .describe("Outpost API key for webhook delivery authentication"),

    // ============================================================================
    // S3-COMPATIBLE STORAGE CONFIGURATION
    // ============================================================================
    // Configuration for S3-compatible object storage (Backblaze B2, AWS S3, etc.)
    // Used for file uploads, organization logos, and other storage operations.
    // @see https://www.backblaze.com/docs/cloud-storage-s3-compatible-api

    /**
     * S3 Endpoint
     *
     * The URL endpoint for the S3-compatible object storage service.
     * Used for file uploads and object storage operations.
     *
     * Common values:
     * - Backblaze B2: https://s3.us-west-004.backblazeb2.com
     * - AWS S3: https://s3.amazonaws.com
     * - MinIO: http://localhost:9000
     *
     * @example "https://s3.us-west-004.backblazeb2.com"
     */
    S3_ENDPOINT: z
      .string()
      .url("S3_ENDPOINT must be a valid URL")
      .describe("S3-compatible storage endpoint URL"),

    /**
     * S3 Region
     *
     * The region identifier for S3 storage.
     * For Backblaze B2, use the region from your bucket URL (e.g., "us-west-004").
     *
     * @example "us-west-004"
     */
    S3_REGION: z
      .string()
      .min(1, "S3_REGION is required")
      .describe("S3 region identifier"),

    /**
     * S3 Access Key ID
     *
     * The access key ID for authenticating with S3.
     * For Backblaze B2, this is the "keyID" from your Application Key.
     *
     * ⚠️ SECURITY:
     * - Keep this secret and never commit to version control
     * - Use different keys for each environment
     * - Rotate if compromised
     *
     * @example "004a1b2c3d4e5f60000000001"
     */
    S3_ACCESS_KEY_ID: z
      .string()
      .min(1, "S3_ACCESS_KEY_ID is required")
      .describe("S3 access key ID"),

    /**
     * S3 Secret Access Key
     *
     * The secret access key for authenticating with S3.
     * For Backblaze B2, this is the "applicationKey" from your Application Key.
     *
     * ⚠️ SECURITY:
     * - Keep this secret and never commit to version control
     * - Never log or expose in error messages
     * - Use different keys for each environment
     * - Rotate if compromised
     *
     * @example "K004abcdefghijklmnopqrstuvwxyz"
     */
    S3_SECRET_ACCESS_KEY: z
      .string()
      .min(1, "S3_SECRET_ACCESS_KEY is required")
      .describe("S3 secret access key"),

    /**
     * S3 Bucket Name
     *
     * The bucket name to use for storing files.
     * For Backblaze B2, this is the bucket name you created in the B2 console.
     *
     * @example "kibamail-uploads"
     */
    S3_BUCKET: z
      .string()
      .min(1, "S3_BUCKET is required")
      .describe("S3 bucket name"),

    /**
     * S3 Public URL
     *
     * The public base URL for accessing uploaded files.
     * For Backblaze B2 with CDN/Cloudflare, use your custom domain.
     * For native B2, use the "Friendly URL" from your bucket settings.
     *
     * @example "https://f004.backblazeb2.com/file/kibamail-uploads"
     * @example "https://cdn.yourdomain.com" (with Cloudflare CDN)
     */
    S3_PUBLIC_URL: z
      .string()
      .url("S3_PUBLIC_URL must be a valid URL")
      .describe("Public base URL for accessing uploaded files"),

    /**
     * Application Key
     *
     * A 32-character secret key used for encrypting sensitive data like DKIM private keys.
     * This key is used for AES-256 encryption throughout the application.
     *
     * Generate a secure key:
     * ```bash
     * openssl rand -base64 32 | head -c 32
     * ```
     *
     * ⚠️ SECURITY:
     * - Must be exactly 32 characters
     * - Keep secret and never commit to version control
     * - Rotating this will make existing encrypted data unreadable
     * - Use different keys for each environment
     *
     * @example "itxd3l3ji6zo7VQbZK8EHNAv86hcDb9U"
     */
    APP_KEY: z
      .string()
      .min(32, "APP_KEY must be at least 32 characters")
      .describe("Application secret key for encryption"),

    // ============================================================================
    // INTERNAL SERVICE AUTHENTICATION
    // ============================================================================
    // Used for service-to-service authentication between internal services
    // (e.g., email-agent to control-plane).

    /**
     * Internal Service Key
     *
     * A secret key used for authenticating internal service-to-service requests.
     * Used by email-agent and other internal services to communicate with the control plane.
     *
     * Generate a secure key:
     * ```bash
     * openssl rand -base64 32
     * ```
     *
     * ⚠️ SECURITY:
     * - Keep secret and never commit to version control
     * - Use the same key across all internal services that need to communicate
     * - Rotate periodically
     *
     * @example "base64-encoded-random-string-here"
     */
    INTERNAL_SERVICE_KEY: z
      .string()
      .min(32, "INTERNAL_SERVICE_KEY must be at least 32 characters")
      .describe("Secret key for internal service-to-service authentication"),
  },

  /**
   * Client-side Environment Variables
   *
   * These variables are exposed to the browser and included in the client bundle.
   * They must be prefixed with NEXT_PUBLIC_ by Next.js convention.
   *
   * � SECURITY WARNING:
   * Never put secrets, API keys, or sensitive data in client variables!
   * Anyone can view these in the browser's developer tools.
   *
   * Use these for:
   * - Public API endpoints
   * - Feature flags
   * - Public configuration
   * - Analytics IDs (public ones)
   */
  client: {
    // Add client-side environment variables here
    // Example:
    // NEXT_PUBLIC_API_URL: z.string().url(),
  },

  /**
   * Runtime Environment Mapping
   *
   * This object maps the actual process.env values to the client variables.
   * You only need to include client-side (NEXT_PUBLIC_*) variables here.
   *
   * Why is this needed?
   * Next.js requires explicit mapping for client variables to be included in
   * the bundle. This prevents accidentally exposing server variables.
   *
   * For Next.js >= 13.4.4, you only need to destructure client variables.
   * Server variables are automatically available.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    LOGTO_TENANT_ID: process.env.LOGTO_TENANT_ID,
    LOGTO_ENDPOINT: process.env.LOGTO_ENDPOINT,
    LOGTO_APP_ID: process.env.LOGTO_APP_ID,
    LOGTO_APP_SECRET: process.env.LOGTO_APP_SECRET,
    LOGTO_BASE_URL: process.env.LOGTO_BASE_URL,
    LOGTO_COOKIE_SECRET: process.env.LOGTO_COOKIE_SECRET,
    LOGTO_COOKIE_SECURE: process.env.LOGTO_COOKIE_SECURE,
    LOGTO_M2M_APP_ID: process.env.LOGTO_M2M_APP_ID,
    LOGTO_M2M_APP_SECRET: process.env.LOGTO_M2M_APP_SECRET,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_DATABASE: process.env.REDIS_DATABASE,
    OUTPOST_API_URL: process.env.OUTPOST_API_URL,
    OUTPOST_API_KEY: process.env.OUTPOST_API_KEY,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_PUBLIC_URL: process.env.S3_PUBLIC_URL,
    APP_KEY: process.env.APP_KEY,
    INTERNAL_SERVICE_KEY: process.env.INTERNAL_SERVICE_KEY,
    // Map client environment variables here
    // Example:
    // NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  /**
   * Skip Validation Flag
   *
   * When true, skips environment variable validation. Useful for:
   * - Building Docker images where env vars are injected at runtime
   * - CI/CD pipelines that don't need real values
   * - Generating types without validation
   *
   * Set SKIP_ENV_VALIDATION=true in your environment to enable.
   *
   * � WARNING: Never use this in production!
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Makes validation errors easier to read during development.
   * Set to true for cleaner error output.
   */
  emptyStringAsUndefined: true,
});

/**
 * Environment Variable Types
 *
 * TypeScript type inferred from the schema. This is automatically generated
 * and provides full type safety when using the env object.
 *
 * You can use this type for type annotations if needed:
 *
 * @example
 * ```typescript
 * import type { Env } from '@/env/schema'
 *
 * function connectToDb(dbUrl: Env['DATABASE_URL']) {
 *   // ...
 * }
 *
 * // Or extract a subset of env vars
 * type LogtoConfig = Pick<Env, 'LOGTO_ENDPOINT' | 'LOGTO_APP_ID' | 'LOGTO_APP_SECRET'>
 * ```
 */
export type Env = typeof env;
