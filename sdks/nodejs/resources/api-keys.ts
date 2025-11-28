import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

// Extract types from schema
type CreateApiKeyBody =
  paths["/v1/api-keys/"]["post"]["requestBody"]["content"]["application/json"];

/**
 * API Keys Resource
 *
 * Manage API keys for programmatic workspace access.
 * API keys enable server-side integrations and automated workflows.
 *
 * @example
 * ```ts
 * const kibamail = new Kibamail("your-api-key");
 *
 * // Create a new API key
 * const result = await kibamail.apiKeys.create({
 *   name: "Production Server Key",
 *   scopes: ["read:contacts", "write:contacts"]
 * });
 * console.log(result.data.key); // Save this securely - it won't be shown again!
 * ```
 */
export class ApiKeys {
  constructor(protected client: HttpClient) {}

  /**
   * Create a new API key for programmatic workspace access.
   *
   * **IMPORTANT:** The full API key value is returned ONLY on creation and cannot be retrieved again.
   * Make sure to save it securely immediately after creation.
   *
   * **Use Cases:**
   * - Set up server-side integrations with your application
   * - Create separate keys for different environments (dev, staging, production)
   * - Generate keys with specific scopes for third-party integrations
   * - Replace compromised or leaked API keys
   *
   * **Behavior:**
   * - Returns the full API key ONLY on creation (starts with 'kb_')
   * - Key is securely hashed before storage - cannot be retrieved again
   * - Keys are scoped to specific permissions you define
   * - Each key can have a custom name for identification
   * - Keys remain active until explicitly revoked
   * - No limit on number of active keys per workspace
   *
   * **Required Scope:** This endpoint requires session authentication (not API key)
   *
   * **Security Best Practices:**
   * - Store the returned key securely immediately
   * - Never commit keys to version control
   * - Use environment variables for key storage
   * - Rotate keys periodically (recommended: every 90 days)
   * - Use minimum required scopes for each key
   * - Revoke unused keys immediately
   *
   * @param params - API key creation parameters
   * @param params.name - Descriptive name for the API key (e.g., "Production Server", "Staging Integration")
   * @param params.scopes - Array of permission scopes (e.g., ["read:contacts", "write:contacts"])
   *
   * @returns Promise containing the created API key with the full key value
   *
   * @throws {BadRequestError} Invalid input data, such as invalid scopes or missing required fields
   * @throws {UnauthorizedError} Invalid or missing session authentication
   *
   * @example
   * ```ts
   * // Create a read-only API key
   * const readKey = await kibamail.apiKeys.create({
   *   name: "Analytics Dashboard",
   *   scopes: ["read:contacts", "read:topics"]
   * });
   *
   * // Create a full-access API key
   * const adminKey = await kibamail.apiKeys.create({
   *   name: "Admin Tool",
   *   scopes: [
   *     "read:contacts", "write:contacts",
   *     "read:topics", "write:topics",
   *     "read:forms", "write:forms"
   *   ]
   * });
   *
   * // IMPORTANT: Save the key immediately!
   * process.env.KIBAMAIL_API_KEY = readKey.data.key;
   * ```
   */
  create(params: CreateApiKeyBody) {
    return this.client.POST("/v1/api-keys/", {
      body: params,
    });
  }
}
