import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

// Extract types from schema
type CreateApiKeyBody =
  paths["/v1/api-keys"]["post"]["requestBody"]["content"]["application/json"];
type ListApiKeysQuery = paths["/v1/api-keys"]["get"]["parameters"]["query"];

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
    return this.client.POST("/v1/api-keys", {
      body: params,
    });
  }

  /**
   * Retrieve a paginated list of all API keys in your workspace.
   *
   * Returns API key metadata without actual key values (keys are hashed for security).
   *
   * **Use Cases:**
   * - View all active API keys
   * - Audit API key usage
   * - Manage workspace integrations
   * - Identify keys for rotation or deletion
   *
   * **Behavior:**
   * - Returns all API keys for the workspace
   * - Keys are returned in reverse chronological order (newest first)
   * - Actual key values are NOT included (only metadata)
   * - Includes key name, scopes, and creation date
   * - Uses cursor-based pagination
   *
   * **Required Scope:** Requires API key authentication
   *
   * **Security Note:**
   * - Full key values are never returned (they're hashed)
   * - Only the key prefix and metadata are shown
   * - Use this to audit and manage your keys
   *
   * @param params - Optional pagination parameters
   * @param params.limit - Number of keys to return (default: 20, max: 100)
   * @param params.after - Cursor for pagination - ID of the last item from the previous page
   * @param params.before - Cursor for reverse pagination - ID of the first item from the next page
   *
   * @returns Promise containing paginated list of API keys (metadata only)
   *
   * @throws {UnauthorizedError} Invalid or missing API key authentication
   *
   * @example
   * ```ts
   * // List all API keys
   * const { data, error } = await kibamail.apiKeys.list();
   *
   * // With pagination
   * const { data, error } = await kibamail.apiKeys.list({ limit: 50 });
   *
   * // Paginate through all keys
   * let cursor = undefined;
   * let allKeys = [];
   * do {
   *   const page = await kibamail.apiKeys.list({ limit: 50, after: cursor });
   *   allKeys.push(...page.data.data);
   *   cursor = page.data.hasMore ? page.data.data[page.data.data.length - 1].id : undefined;
   * } while (cursor);
   * ```
   */
  list(params?: ListApiKeysQuery) {
    return this.client.GET("/v1/api-keys", {
      params: { query: params },
    });
  }

  /**
   * Delete an API key permanently.
   *
   * Revokes an API key so it can no longer be used for authentication.
   * This action is immediate and cannot be undone.
   *
   * **Use Cases:**
   * - Revoke compromised or leaked API keys
   * - Remove unused API keys
   * - Clean up keys after decommissioning integrations
   * - Rotate API keys for security
   *
   * **Behavior:**
   * - API key is permanently deleted
   * - Key can no longer be used for authentication
   * - Cannot delete the currently authenticated API key
   * - Operation is immediate and cannot be undone
   *
   * **Required Scope:** Requires API key authentication
   *
   * **Important:**
   * - You cannot delete the API key you're currently using
   * - Deleted keys cannot be recovered
   * - Any integrations using the deleted key will stop working immediately
   * - Update all services using the key before deletion
   *
   * @param keyId - The unique identifier of the API key to delete
   *
   * @returns Promise containing the deleted API key ID
   *
   * @throws {NotFoundError} API key not found or doesn't belong to your workspace
   * @throws {BadRequestError} Cannot delete the currently authenticated API key
   * @throws {UnauthorizedError} Invalid or missing API key authentication
   *
   * @example
   * ```ts
   * // Delete an API key
   * const { data, error } = await kibamail.apiKeys.delete("api_key_abc123");
   *
   * // Delete with error handling
   * try {
   *   await kibamail.apiKeys.delete("api_key_abc123");
   *   console.log("API key revoked successfully");
   * } catch (error) {
   *   if (error.code === "CANNOT_DELETE_CURRENT_KEY") {
   *     console.log("Cannot delete the API key you're currently using");
   *   }
   * }
   * ```
   */
  delete(keyId: string) {
    return this.client.DELETE("/v1/api-keys/{keyId}", {
      params: { path: { keyId } },
    });
  }
}
